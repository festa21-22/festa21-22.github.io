/* ===========================================================================
   Code.gs — Backend de subida de pruebas (Google Apps Script)

   Recibe un POST con un JSON (enviado como text/plain para evitar el
   preflight CORS) y guarda el archivo en una carpeta PRIVADA de Drive:
       Nombre_Dificil_Reto07_2026-11-21_23-15-42.jpg

   El script se ejecuta con TU cuenta ("Ejecutar como: yo"), así que puede
   escribir en tu carpeta aunque quien sube no tenga acceso a ella. Nadie más
   ve los archivos salvo las personas con las que compartas la carpeta.

   Guía completa: apps-script/GUIA.md
   =========================================================================== */

const CONFIG = {
  // ID de la carpeta de Drive: lo que va después de /folders/ en su URL
  //   https://drive.google.com/drive/folders/ESTE_TROZO_ES_EL_ID
  CARPETA_ID: 'PEGA_AQUI_EL_ID_DE_LA_CARPETA',

  // Debe coincidir con "clave" en data.js. Frena envíos casuales de quien
  // no use la web, pero NO es seguridad fuerte (data.js es público).
  CLAVE: 'cambia-esta-clave',

  // Mismo límite que maxMB en data.js (en MB, tamaño del archivo original)
  MAX_MB: 25,

  ZONA: 'Europe/Madrid',
};

const EXTENSIONES = {
  foto: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
  video: ['mp4', 'mov', 'webm', '3gp', 'm4v', 'mkv'],
};

// Dificultad que envía la web → texto en el nombre del archivo (sin acentos)
const DIFICULTADES = { facil: 'Facil', medio: 'Mitja', dificil: 'Dificil' };

// Si el archivo no trae extensión, la deducimos del tipo MIME
const EXT_POR_TIPO = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
  'image/heic': 'heic', 'image/heif': 'heif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/3gpp': '3gp',
};


/* ---------- Punto de entrada: subida ---------- */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return responder({ ok: false, error: 'datos' });

    const p = JSON.parse(e.postData.contents);

    if (p.clave !== CONFIG.CLAVE) return responder({ ok: false, error: 'clave' });

    const reto = parseInt(p.reto, 10);
    const dificultad = DIFICULTADES[p.dificultad];
    if (!p.datos || !dificultad || !reto || reto < 1 || reto > 999) return responder({ ok: false, error: 'datos' });

    const ext = extensionValida(p.nombreArchivo, p.tipo);
    if (!ext) return responder({ ok: false, error: 'tipo' });

    // base64 → bytes. Comprobamos el tamaño REAL aquí también: la validación
    // del navegador se puede saltar, la del servidor no.
    const bytes = Utilities.base64Decode(p.datos);
    if (bytes.length > CONFIG.MAX_MB * 1024 * 1024) return responder({ ok: false, error: 'grande' });

    const fecha = Utilities.formatDate(new Date(), CONFIG.ZONA, 'yyyy-MM-dd_HH-mm-ss');
    const nombre = limpiarNombre(p.nombre) + '_' + dificultad + '_Reto' + String(reto).padStart(2, '0') + '_' + fecha + '.' + ext;

    const tipoMime = p.tipo || mimeDeExtension(ext);
    const blob = Utilities.newBlob(bytes, tipoMime, nombre);
    DriveApp.getFolderById(CONFIG.CARPETA_ID).createFile(blob);

    return responder({ ok: true, archivo: nombre });

  } catch (err) {
    console.error(err);                        // visible en "Ejecuciones" del editor
    return responder({ ok: false, error: 'servidor' });
  }
}


/* ---------- GET: para comprobar que la URL funciona ---------- */
// Abre la URL /exec en el navegador: debe mostrar {"ok":true,...}
function doGet() {
  return responder({ ok: true, mensaje: 'Servei de pujada actiu' });
}


/* ---------- Ejecútala UNA VEZ desde el editor ---------- */
// Sirve para dar permisos a Drive y comprobar que el ID de carpeta es correcto.
function probarConfiguracion() {
  const carpeta = DriveApp.getFolderById(CONFIG.CARPETA_ID);
  console.log('OK. Los archivos se guardarán en: "' + carpeta.getName() + '"');
  if (CONFIG.CLAVE === 'cambia-esta-clave') console.warn('Cambia CONFIG.CLAVE por una clave propia.');
}


/* ---------- Utilidades ---------- */

function responder(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// "Núria Pérez!" → "NuriaPerez". Solo letras y números: nombre de archivo seguro.
function limpiarNombre(texto) {
  const limpio = String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // quita acentos
    .replace(/[^A-Za-z0-9]+/g, '')
    .slice(0, 30);
  return limpio || 'Anonim';
}

function extensionValida(nombreArchivo, tipo) {
  const m = /\.([a-z0-9]+)$/i.exec(String(nombreArchivo || ''));
  let ext = m ? m[1].toLowerCase() : '';
  if (!ext && tipo) ext = EXT_POR_TIPO[tipo] || '';

  const permitida = EXTENSIONES.foto.concat(EXTENSIONES.video).indexOf(ext) >= 0;
  const tipoOk = !tipo || /^(image|video)\//.test(tipo);
  return permitida && tipoOk ? ext : null;
}

function mimeDeExtension(ext) {
  for (const tipo in EXT_POR_TIPO) if (EXT_POR_TIPO[tipo] === ext) return tipo;
  return 'application/octet-stream';
}
