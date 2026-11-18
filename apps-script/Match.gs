/* ===========================================================================
   Match.gs — Backend del "Match de la festa" (Google Apps Script + Sheet)

   Va en el MISMO proyecto que Code.gs, como segundo archivo. Apps Script
   junta todos los .gs en un mismo ámbito global: doPost() (en Code.gs) ve
   una petición con "accion" y llama a atenderMatch() de aquí.

   Base de datos: una Google Sheet con dos hojas (las crea configurarMatch):
     Participants: id | nom | nom_normalitzat | salt | hash_pin | hash_sessio |
                   intents_fallits | bloquejat_fins | creat
     Likes:        de | a | data | match_vist | de_nom | a_nom
                   (de_nom y a_nom son solo para leer la Sheet; el código usa los ids)

   Reglas de privacidad (todas se cumplen AQUÍ, no en el navegador):
   - El PIN nunca se guarda: solo SHA-256(pimienta + salt + PIN).
   - La web solo recibe: nombres de participantes, MIS likes, MIS matches y
     el NÚMERO de likes que he recibido (solo si lo pide: al entrar o
     recargar). Nunca quién me ha dado like si no es recíproco.
   - Antes de la hora de revelación, un like recíproco responde EXACTAMENTE
     igual que uno no recíproco (no se puede deducir nada).
   - 5 PIN fallidos para un nombre → bloqueado 15 minutos.
   - Antes de CONFIG_MATCH.APERTURA (hora del servidor) todo se rechaza con
     error "cerrado". Hoja "Config" → FORZAR_APERTURA = AUTO | SI | NO.
   - Acción "retos" (para reto.html, no es del Match): devuelve el modo de
     FORZAR_APERTURA_RETOS (Config!B2) y la hora del servidor. Responde
     siempre, también con el Match cerrado.

   Guía completa: apps-script/GUIA.md (sección "Match de la festa")
   =========================================================================== */

const CONFIG_MATCH = {
  // ID de la Google Sheet: lo que va entre /d/ y /edit en su URL
  //   https://docs.google.com/spreadsheets/d/ESTE_TROZO_ES_EL_ID/edit
  SHEET_ID: 'PEGA_AQUI_EL_ID_DE_LA_HOJA',

  // Hora a partir de la cual se ven los matches.
  //   ''  → al momento (en cuanto los dos se han marcado)
  //   '2026-11-21T23:00:00+01:00' → hasta esa hora nadie ve ningún match
  REVELACION: '',

  // Hasta esta hora el Match está CERRADO: el servidor rechaza todo (registro,
  // entrar, likes, consultas). Debe coincidir con match.apertura de data.js
  // (la web la usa solo para la cuenta atrás; quien decide es el servidor).
  // Se puede forzar sin tocar código en la hoja "Config" (FORZAR_APERTURA).
  APERTURA: '2026-11-21T20:00:00+01:00',

  MAX_INTENTOS: 5,         // PIN fallidos seguidos antes de bloquear el nombre
  MINUTOS_BLOQUEO: 15,
  MAX_LIKES: 0,             // likes por persona; 0 = sin límite
  MAX_PARTICIPANTES: 200,   // freno contra registros masivos automáticos
  NOMBRE_MIN: 3,
  NOMBRE_MAX: 40,
};

const HOJA_PART = 'Participants';
const HOJA_LIKES = 'Likes';
const HOJA_CONFIG = 'Config';
const MODOS_APERTURA = ['AUTO', 'SI', 'NO'];
const CABECERA_PART = ['id', 'nom', 'nom_normalitzat', 'salt', 'hash_pin', 'hash_sessio',
                       'intents_fallits', 'bloquejat_fins', 'creat'];
// Los nombres van AL FINAL: el código lee las columnas por posición (0-3)
const CABECERA_LIKES = ['de', 'a', 'data', 'match_vist', 'de_nom', 'a_nom'];

// Letras (con acentos, ç, ñ...), espacios, apóstrofo, guion, punto y punt volat.
// Empieza por letra: así nunca empieza por "=", "+", "-" o "@", que Sheets
// interpretaría como FÓRMULA (inyección de fórmulas).
const RE_NOMBRE = /^\p{L}[\p{L}\p{M} '’·.\-]*$/u;
const RE_PIN = /^\d{4}$/;


/* ---------- Punto de entrada (lo llama doPost de Code.gs) ---------- */

function atenderMatch(p) {
  const ss = SpreadsheetApp.openById(CONFIG_MATCH.SHEET_ID);

  // Retos (no es del Match, pero usa la misma hoja Config): solo dice el modo
  // del interruptor y la hora del servidor. Va ANTES del control de apertura
  // del Match para que funcione aunque el Match esté cerrado. Los retos y su
  // hora siguen en data.js; con AUTO la web decide con esa hora.
  if (p.accion === 'retos') return { ok: true, modo: leerModo(ss, 'B2'), ahora: Date.now() };

  // Apertura: se decide con la hora DEL SERVIDOR (Date.now() aquí es la de
  // Google), así que cambiar la hora del móvil o tocar el JS no sirve de nada.
  const abierto = estaAbierto(ss);
  const infoApertura = { apertura: CONFIG_MATCH.APERTURA || null, ahora: Date.now() };
  // "apertura" es la única acción permitida con el Match cerrado: solo dice
  // si está abierto y la hora del servidor (para corregir la cuenta atrás).
  if (p.accion === 'apertura') return Object.assign({ ok: true, abierto: abierto }, infoApertura);
  if (!abierto) return Object.assign({ ok: false, error: 'cerrado' }, infoApertura);

  // LockService: solo una petición del Match a la vez toca la Sheet.
  // Sin esto, dos registros simultáneos con el mismo nombre pasarían los dos,
  // o dos likes cruzados al mismo segundo no verían el match.
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: 'ocupado' };
  try {
    const bd = abrirBD(ss);
    switch (p.accion) {
      case 'registro':   return registrar(bd, p);
      case 'entrar':     return entrar(bd, p);
      case 'estado':     return conSesion(bd, p, estado);
      case 'like':       return conSesion(bd, p, darLike);
      case 'quitarLike': return conSesion(bd, p, quitarLike);
      case 'salir':      return conSesion(bd, p, salir);
      case 'baja':       return conSesion(bd, p, darDeBaja);
      default:           return { ok: false, error: 'accion' };
    }
  } finally {
    lock.releaseLock();
  }
}


/* ---------- Acciones sin sesión ---------- */

function registrar(bd, p) {
  const nombre = limpiarNombreVisible(p.nombre);
  if (!nombreValido(nombre)) return { ok: false, error: 'nombre' };
  if (!RE_PIN.test(String(p.pin || ''))) return { ok: false, error: 'pin' };
  if (bd.part.length >= CONFIG_MATCH.MAX_PARTICIPANTES) return { ok: false, error: 'lleno' };

  const norm = normalizar(nombre);
  if (bd.part.some(function (x) { return x.norm === norm; })) return { ok: false, error: 'nombre_ocupado' };

  const id = nuevoId(bd);
  const salt = aleatorioHex();
  const token = nuevoToken();
  bd.hp.appendRow([id, nombre, norm, salt, hashPin(salt, p.pin), sha256Hex(token), '0', '0', fechaLegible()]);
  return { ok: true, id: id, token: token, nombre: nombre };
}

function entrar(bd, p) {
  if (!RE_PIN.test(String(p.pin || ''))) return { ok: false, error: 'pin' };
  const norm = normalizar(limpiarNombreVisible(p.nombre));
  const yo = bd.part.find(function (x) { return x.norm === norm; });
  // Mismo error si el nombre no existe o el PIN está mal
  if (!yo) return { ok: false, error: 'credenciales' };

  const ahora = Date.now();
  // Bloqueado: rechazamos incluso con el PIN correcto (si no, el bloqueo
  // no frenaría la fuerza bruta: bastaría con seguir probando).
  if (yo.bloqueo > ahora) return { ok: false, error: 'bloqueado', minutos: Math.ceil((yo.bloqueo - ahora) / 60000) };

  if (hashPin(yo.salt, p.pin) === yo.hash) {
    const token = nuevoToken();   // un token nuevo invalida la sesión de otros dispositivos
    escribirSesion(bd, yo, sha256Hex(token), 0, 0);
    return { ok: true, id: yo.id, token: token, nombre: yo.nombre };
  }

  const intentos = yo.intentos + 1;
  if (intentos >= CONFIG_MATCH.MAX_INTENTOS) {
    escribirSesion(bd, yo, yo.sesion, 0, ahora + CONFIG_MATCH.MINUTOS_BLOQUEO * 60000);
    return { ok: false, error: 'bloqueado', minutos: CONFIG_MATCH.MINUTOS_BLOQUEO };
  }
  escribirSesion(bd, yo, yo.sesion, intentos, 0);
  return { ok: false, error: 'credenciales', quedan: CONFIG_MATCH.MAX_INTENTOS - intentos };
}


/* ---------- Acciones con sesión (id + token) ---------- */

function conSesion(bd, p, accion) {
  const yo = bd.part.find(function (x) { return x.id === String(p.id || ''); });
  const token = String(p.token || '');
  if (!yo || !yo.sesion || !token || sha256Hex(token) !== yo.sesion) return { ok: false, error: 'sesion' };
  return accion(bd, yo, p);
}

function estado(bd, yo, p) {
  const revelado = esRevelado();
  const porId = indicePorId(bd);

  const participantes = bd.part
    .filter(function (x) { return x.id !== yo.id; })
    .map(function (x) { return { id: x.id, nombre: x.nombre }; })
    .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'ca'); });

  const mios = bd.likes.filter(function (l) { return l.de === yo.id && porId[l.a]; });

  // Quién me ha dado like: SOLO se usa aquí dentro para cruzar, nunca se devuelve.
  const meQuieren = {};
  bd.likes.forEach(function (l) { if (l.a === yo.id && porId[l.de]) meQuieren[l.de] = true; });

  let matches = [], nuevos = [];
  if (revelado) {
    mios.forEach(function (l) {
      if (!meQuieren[l.a]) return;
      const m = { id: l.a, nombre: porId[l.a].nombre };
      matches.push(m);
      if (l.vist !== 'si') {
        nuevos.push(m);
        // Se marca como visto al entregarlo: cada match anima una sola vez
        bd.hl.getRange(l.fila, 4).setValue('si');
      }
    });
  }

  const respuesta = {
    ok: true,
    yo: { id: yo.id, nombre: yo.nombre },
    participantes: participantes,
    likes: mios.map(function (l) { return l.a; }),
    matches: matches,
    nuevos: nuevos,
    revelado: revelado,
    revelacion: CONFIG_MATCH.REVELACION || null,
    maxLikes: CONFIG_MATCH.MAX_LIKES,
  };
  // Likes recibidos: SOLO el número total, nunca de quién. Solo se manda si
  // la web lo pide (al entrar o recargar, no en la consulta periódica): si
  // subiera en directo, por el momento del cambio se podría adivinar quién fue.
  if (p && p.recibidos === true) respuesta.recibidos = Object.keys(meQuieren).length;
  return respuesta;
}

function darLike(bd, yo, p) {
  const a = String(p.a || '');
  if (a === yo.id) return { ok: false, error: 'datos' };   // a uno mismo, no
  const otro = indicePorId(bd)[a];
  if (!otro) return { ok: false, error: 'no_existe' };

  const mios = bd.likes.filter(function (l) { return l.de === yo.id; });
  if (mios.some(function (l) { return l.a === a; })) return { ok: true, match: null };  // ya estaba
  if (CONFIG_MATCH.MAX_LIKES > 0 && mios.length >= CONFIG_MATCH.MAX_LIKES) return { ok: false, error: 'limite' };

  const reciproco = bd.likes.some(function (l) { return l.de === a && l.a === yo.id; });
  const hayMatch = reciproco && esRevelado();
  // Si hay match, quien da el like lo ve ahora mismo: su fila ya nace "vista"
  bd.hl.appendRow([yo.id, a, fechaLegible(), hayMatch ? 'si' : '', yo.nombre, otro.nombre]);
  return { ok: true, match: hayMatch ? { id: otro.id, nombre: otro.nombre } : null };
}

function quitarLike(bd, yo, p) {
  const a = String(p.a || '');
  const l = bd.likes.find(function (x) { return x.de === yo.id && x.a === a; });
  if (l) bd.hl.deleteRow(l.fila);
  return { ok: true };
}

function salir(bd, yo) {
  escribirSesion(bd, yo, '', yo.intentos, yo.bloqueo);
  return { ok: true };
}

function darDeBaja(bd, yo) {
  borrarCuenta(bd, yo.id);
  return { ok: true };
}


/* ---------- Para los organizadores: ejecutar desde el editor ---------- */

// 1) Ejecútala UNA VEZ tras pegar SHEET_ID: crea las hojas y da permisos.
function configurarMatch() {
  const ss = SpreadsheetApp.openById(CONFIG_MATCH.SHEET_ID);
  prepararHoja(ss, HOJA_PART, CABECERA_PART);
  prepararHoja(ss, HOJA_LIKES, CABECERA_LIKES);
  prepararConfig(ss);
  pimienta();   // la crea si no existe
  rellenarNombresLikes();
  console.log('OK. Hojas listas en "' + ss.getName() + '". Ahora mismo el Match está ' +
    (estaAbierto(ss) ? 'ABIERTO' : 'CERRADO') + '.');
}

// 2) Borrar la cuenta de alguien (p. ej. si otra persona usó su nombre):
//    cambia el nombre de abajo y ejecuta esta función.
function borrarCuentaManual() {
  const NOMBRE = 'Nom Cognom';
  const bd = abrirBD();
  const x = bd.part.find(function (u) { return u.norm === normalizar(NOMBRE); });
  if (!x) { console.warn('No existe ninguna cuenta con el nombre "' + NOMBRE + '"'); return; }
  borrarCuenta(bd, x.id);
  console.log('Borrada la cuenta "' + x.nombre + '" y todos sus likes.');
}


// Escribe de_nom y a_nom en los likes que no los tengan (los guardados antes
// de añadir esas columnas). La llama configurarMatch; se puede repetir sin problema.
function rellenarNombresLikes() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const bd = abrirBD();
    const porId = indicePorId(bd);
    const filas = leerFilas(bd.hl, CABECERA_LIKES.length);
    if (!filas.length) return;
    const nombres = filas.map(function (f) {
      const de = porId[f.v[0]], a = porId[f.v[1]];
      return [f.v[4] || (de ? de.nombre : ''), f.v[5] || (a ? a.nombre : '')];
    });
    bd.hl.getRange(2, 5, nombres.length, 2).setValues(nombres);
    console.log('Nombres puestos en ' + nombres.length + ' likes.');
  } finally {
    lock.releaseLock();
  }
}


/* ---------- Apertura (hoja Config) ---------- */

// Hoja "Config" (desplegables AUTO | SI | NO):
//   A1 = FORZAR_APERTURA        B1 → Match. AUTO = manda CONFIG_MATCH.APERTURA
//   A2 = FORZAR_APERTURA_RETOS  B2 → Retos. AUTO = manda retosApertura de data.js
//   SI → abierto ya · NO → cerrado aunque haya pasado la hora
// No sobrescribe B1/B2 si ya tienen valor (se puede volver a ejecutar sin miedo).
function prepararConfig(ss) {
  const hoja = ss.getSheetByName(HOJA_CONFIG) || ss.insertSheet(HOJA_CONFIG);
  const validacion = SpreadsheetApp.newDataValidation()
    .requireValueInList(MODOS_APERTURA, true).setAllowInvalid(false).build();
  [['A1', 'B1', 'FORZAR_APERTURA'], ['A2', 'B2', 'FORZAR_APERTURA_RETOS']].forEach(function (f) {
    hoja.getRange(f[0]).setValue(f[2]).setFontWeight('bold');
    const celda = hoja.getRange(f[1]);
    if (!String(celda.getDisplayValue()).trim()) celda.setValue('AUTO');
    celda.setDataValidation(validacion);
  });
  hoja.getRange('A3:A4').setValues([
    ['Match: AUTO = s\'obre a l\'hora de CONFIG_MATCH.APERTURA (' + CONFIG_MATCH.APERTURA + ') · SI = obert ja · NO = tancat'],
    ['Reptes: AUTO = s\'obren a l\'hora de retosApertura (data.js) · SI = oberts ja · NO = tancats'],
  ]).setFontColor('#666666').setFontWeight('normal');
}

// Lee una celda de "Config". Si falta la hoja o el valor es raro → AUTO.
function leerModo(ss, celda) {
  const hoja = ss.getSheetByName(HOJA_CONFIG);
  if (!hoja) return 'AUTO';
  const v = String(hoja.getRange(celda).getDisplayValue()).trim().toUpperCase().replace('Í', 'I');
  return MODOS_APERTURA.indexOf(v) >= 0 ? v : 'AUTO';
}

function modoApertura(ss) { return leerModo(ss, 'B1'); }

function estaAbierto(ss) {
  const modo = modoApertura(ss);
  if (modo === 'SI') return true;
  if (modo === 'NO') return false;
  return !CONFIG_MATCH.APERTURA || Date.now() >= new Date(CONFIG_MATCH.APERTURA).getTime();
}


/* ---------- Base de datos (Sheet) ---------- */

function abrirBD(ssAbierta) {
  const ss = ssAbierta || SpreadsheetApp.openById(CONFIG_MATCH.SHEET_ID);
  const hp = ss.getSheetByName(HOJA_PART);
  const hl = ss.getSheetByName(HOJA_LIKES);
  if (!hp || !hl) throw new Error('Faltan las hojas: ejecuta configurarMatch()');

  const part = leerFilas(hp, CABECERA_PART.length).map(function (f) {
    return {
      fila: f.fila, id: f.v[0], nombre: f.v[1], norm: f.v[2], salt: f.v[3], hash: f.v[4],
      sesion: f.v[5], intentos: Number(f.v[6]) || 0, bloqueo: Number(f.v[7]) || 0,
    };
  }).filter(function (x) { return x.id; });

  const likes = leerFilas(hl, CABECERA_LIKES.length).map(function (f) {
    return { fila: f.fila, de: f.v[0], a: f.v[1], vist: f.v[3] };
  }).filter(function (l) { return l.de && l.a; });

  return { ss: ss, hp: hp, hl: hl, part: part, likes: likes };
}

// Filas de datos (sin la cabecera) como texto, con su número de fila real
function leerFilas(hoja, columnas) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return [];
  return hoja.getRange(2, 1, ultima - 1, columnas).getDisplayValues().map(function (v, i) {
    return { fila: i + 2, v: v.map(function (c) { return String(c).trim(); }) };
  });
}

function prepararHoja(ss, nombre, cabecera) {
  const hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  // Filas de sobra (50 personas × 49 likes ≈ 2.500) para que todas tengan el formato
  if (hoja.getMaxRows() < 5000) hoja.insertRowsAfter(hoja.getMaxRows(), 5000 - hoja.getMaxRows());
  // Todo como TEXTO: si no, Sheets convertiría "1763712000000" o un hash como
  // "12e45..." en un número (y lo mostraría como 1,76E+12)
  hoja.getRange(1, 1, hoja.getMaxRows(), cabecera.length).setNumberFormat('@');
  hoja.getRange(1, 1, 1, cabecera.length).setValues([cabecera]).setFontWeight('bold');
  hoja.setFrozenRows(1);
}

// Columnas hash_sessio, intents_fallits y bloquejat_fins (6, 7, 8: contiguas)
function escribirSesion(bd, yo, hashSesion, intentos, bloqueo) {
  bd.hp.getRange(yo.fila, 6, 1, 3).setValues([[hashSesion, String(intentos), String(bloqueo)]]);
}

// Borra a la persona y TODOS los likes en los que aparece (dados y recibidos).
// Reescribimos la hoja Likes de una vez (más rápido que borrar fila a fila);
// de paso se limpian likes "huérfanos" de cuentas borradas a mano.
function borrarCuenta(bd, id) {
  const vivos = indicePorId(bd);
  const quedan = leerFilas(bd.hl, CABECERA_LIKES.length)
    .map(function (f) { return f.v; })
    .filter(function (v) { return v[0] !== id && v[1] !== id && vivos[v[0]] && vivos[v[1]]; });

  const ultima = bd.hl.getLastRow();
  if (ultima >= 2) bd.hl.getRange(2, 1, ultima - 1, CABECERA_LIKES.length).clearContent();
  if (quedan.length) bd.hl.getRange(2, 1, quedan.length, CABECERA_LIKES.length).setValues(quedan);

  const yo = bd.part.find(function (x) { return x.id === id; });
  if (yo) bd.hp.deleteRow(yo.fila);
}

// Solo cuentan los likes entre cuentas que existen (si un organizador borra
// una fila de Participants a mano, sus likes se ignoran automáticamente).
function indicePorId(bd) {
  const idx = {};
  bd.part.forEach(function (x) { idx[x.id] = x; });
  return idx;
}


/* ---------- Utilidades ---------- */

function esRevelado() {
  return !CONFIG_MATCH.REVELACION || Date.now() >= new Date(CONFIG_MATCH.REVELACION).getTime();
}

// "  Marc   García " → "Marc García"  (lo que ven los demás)
function limpiarNombreVisible(texto) {
  return String(texto || '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

// "Marc García" y "marc  garcia" → "marc garcia" (para comparar)
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quita acentos (ç → c)
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function nombreValido(nombre) {
  return nombre.length >= CONFIG_MATCH.NOMBRE_MIN && nombre.length <= CONFIG_MATCH.NOMBRE_MAX &&
    RE_NOMBRE.test(nombre);
}

function sha256Hex(texto) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  // Apps Script da bytes con signo (-128..127): los pasamos a 0..255
  return bytes.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

// PIN de 4 cifras = solo 10.000 combinaciones: quien tenga la Sheet podría
// probarlas todas contra el hash en segundos. La "pimienta" es un secreto
// guardado en las Propiedades del script (NO en la Sheet): sin ella, el hash
// de la Sheet no sirve para adivinar el PIN.
function hashPin(salt, pin) {
  return sha256Hex(pimienta() + ':' + salt + ':' + String(pin));
}

function pimienta() {
  const props = PropertiesService.getScriptProperties();
  let p = props.getProperty('MATCH_PIMIENTA');
  if (!p) {
    p = aleatorioHex() + aleatorioHex();
    props.setProperty('MATCH_PIMIENTA', p);
  }
  return p;
}

// getUuid() es un UUID v4: 122 bits aleatorios
function aleatorioHex() { return Utilities.getUuid().replace(/-/g, ''); }
function nuevoToken() { return aleatorioHex() + aleatorioHex(); }

function nuevoId(bd) {
  let id;
  // Empieza por "p": nunca parece un número
  do { id = 'p' + aleatorioHex().slice(0, 11); } while (bd.part.some(function (x) { return x.id === id; }));
  return id;
}

function fechaLegible() {
  return Utilities.formatDate(new Date(), CONFIG.ZONA, 'yyyy-MM-dd HH:mm:ss');
}
