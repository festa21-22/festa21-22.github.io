/* ===========================================================================
   match.js — "Match de la festa" (solo match.html)

   Este archivo NO decide nada importante: comprobar el PIN, guardar likes,
   calcular matches y la hora de revelación lo hace el servidor
   (apps-script/Match.gs). Aquí solo se pinta lo que el servidor devuelve,
   que es únicamente: nombres de participantes, MIS likes y MIS matches.

   Sesión: al entrar, el servidor da un TOKEN aleatorio (no el PIN). Si se
   marca "Recorda'm", se guarda en localStorage {id, token, nombre}; si no,
   solo en memoria (se pierde al cerrar la pestaña). El PIN no se guarda nunca.

   Matches nuevos de la otra persona: se consulta el estado cada 45 s, SOLO
   con la página visible (Page Visibility API). En segundo plano se para.

   Peticiones: POST con Content-Type text/plain, igual que upload.js, para
   evitar el preflight CORS que Apps Script no soporta.
   =========================================================================== */
(function () {
  'use strict';

  var F = window.FIESTA;
  var C = window.Comun;
  var A = window.Almacen;
  if (!F || !C || !A) return;
  var $ = C.$, el = C.el;

  var cfgSubida = F.subida || {};
  var cfg = F.match || {};
  var URL_SCRIPT = (cfgSubida.scriptUrl || '').trim();
  var ES_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  // Demo: igual que la subida ("demo" en data.js) o, SOLO en local, con ?demo
  var MODO_DEMO = URL_SCRIPT === 'demo' || (ES_LOCAL && /[?&]demo\b/.test(location.search));
  // Nunca más a menudo que cada 45 s (cuotas de Apps Script)
  var INTERVALO = Math.max(45, cfg.segundosConsulta || 45) * 1000;
  var CLAVE_SESION = 'fiesta2122:match-sesion';
  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Estado ---------- */
  var sesion = null;          // {id, token, nombre}
  var recordar = true;
  var datos = { participantes: [], likes: {}, matches: {}, revelado: true, revelacion: null, maxLikes: 0 };
  var enCurso = {};           // id → true mientras su like/quitar está viajando
  var modoRegistro = false;
  var colaMatch = [];         // matches pendientes de animar
  var animados = {};          // para no animar dos veces el mismo en esta visita
  var temporizador = null;
  var ultimaConsulta = 0;
  var consultando = false;

  /* ---------- Comunicación con el servidor ---------- */

  function llamar(accion, extra) {
    var cuerpo = Object.assign({ clave: cfgSubida.clave || '', accion: accion }, extra || {});
    // Todas las acciones salvo registro/entrar se identifican con id + token
    if (sesion && accion !== 'registro' && accion !== 'entrar') { cuerpo.id = sesion.id; cuerpo.token = sesion.token; }
    if (MODO_DEMO) return window.MatchDemo.llamar(cuerpo);

    // AbortController: si en 25 s no hay respuesta, cortamos (mala cobertura)
    var ctrl = window.AbortController ? new AbortController() : null;
    var corte = ctrl ? setTimeout(function () { ctrl.abort(); }, 25000) : null;
    return fetch(URL_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) {
        return r.text();
      }, function (e) {
        clearTimeout(corte);
        throw new Error(e && e.name === 'AbortError' ? 'tiempo' : 'red');
      })
      .then(function (texto) {
        clearTimeout(corte);
        try { return JSON.parse(texto); }
        catch (e) { throw new Error('respuesta'); }   // p. ej. página HTML de error de Google
      });
  }

  var MENSAJES = {
    red: 'No s\'ha pogut connectar amb el servidor. Comprova la connexió i torna-ho a provar.',
    tiempo: 'El servidor ha trigat massa a respondre. Torna-ho a provar.',
    respuesta: 'El servidor ha respost de manera inesperada. Torna-ho a provar d\'aquí a una estona.',
    clave: 'El Match no està ben configurat (clau incorrecta). Avisa l\'organització.',
    accion: 'El Match encara no està actiu al servidor. Avisa l\'organització.',
    datos: 'El servidor no ha acceptat les dades. Si torna a passar, avisa l\'organització.',
    nombre: 'El nom ha de tenir entre 3 i 40 lletres (pot portar espais, accents, apòstrofs i guions).',
    pin: 'El PIN han de ser exactament 4 xifres.',
    nombre_ocupado: 'Aquest nom ja està registrat. Si ja t\'hi havies apuntat, entra amb el teu PIN. ' +
      'Si és el teu nom i no l\'has registrat tu, avisa els organitzadors.',
    credenciales: 'Nom o PIN incorrectes.',
    bloqueado: 'Massa intents incorrectes amb aquest nom.',
    sesion: 'La sessió s\'ha tancat (potser has entrat des d\'un altre dispositiu). Torna a entrar.',
    no_existe: 'Aquesta persona ja no està apuntada.',
    limite: 'Has arribat al màxim de persones que pots marcar.',
    lleno: 'La llista està plena. Avisa l\'organització.',
    ocupado: 'El servidor està molt ocupat ara mateix. Torna-ho a provar en uns segons.',
    servidor: 'Hi ha hagut un error al servidor. Torna-ho a provar.'
  };

  function textoError(r) {
    var codigo = (r && r.error) || 'servidor';
    var t = MENSAJES[codigo] || MENSAJES.servidor;
    if (codigo === 'credenciales' && r.quedan) {
      t += r.quedan === 1 ? ' Et queda 1 intent.' : ' Et queden ' + r.quedan + ' intents.';
    }
    if (codigo === 'bloqueado' && r.minutos) {
      t += ' Torna-ho a provar d\'aquí a ' + r.minutos + (r.minutos === 1 ? ' minut.' : ' minuts.');
    }
    return t;
  }

  // Convierte errores de red (Error) y respuestas {ok:false} en un objeto {error}
  function comoRespuesta(e) { return { ok: false, error: (e && e.message) || 'red' }; }

  function mostrar(nodo, texto) {
    nodo.textContent = texto || '';
    nodo.hidden = !texto;
  }

  /* ---------- Sesión en el dispositivo ---------- */

  function leerSesion() {
    try {
      var s = JSON.parse(A.leer(CLAVE_SESION));
      return s && typeof s.id === 'string' && typeof s.token === 'string' ? s : null;
    } catch (e) { return null; }
  }

  function guardarSesion(r) {
    sesion = { id: r.id, token: r.token, nombre: r.nombre };
    if (recordar) A.guardar(CLAVE_SESION, JSON.stringify(sesion));
    else A.borrar(CLAVE_SESION);
  }

  function olvidarSesion() {
    sesion = null;
    A.borrar(CLAVE_SESION);
    clearTimeout(temporizador);
  }

  /* ---------- Vista: acceso (entrar / registrarse) ---------- */

  var tabEntrar = $('tabEntrar'), tabRegistro = $('tabRegistro');
  var inNombre = $('campoNombre'), inPin = $('campoPin'), inPin2 = $('campoPin2');

  function cambiarModo(registro) {
    modoRegistro = registro;
    tabEntrar.setAttribute('aria-selected', String(!registro));
    tabRegistro.setAttribute('aria-selected', String(registro));
    tabEntrar.tabIndex = registro ? -1 : 0;
    tabRegistro.tabIndex = registro ? 0 : -1;
    $('campoPin2Caja').hidden = !registro;
    $('ayudaNombre').hidden = !registro;
    $('lblPin').textContent = registro ? 'Inventa\'t un PIN de 4 xifres' : 'PIN';
    inPin.autocomplete = registro ? 'new-password' : 'current-password';
    $('btnAcceso').textContent = registro ? 'Apunta-m\'hi' : 'Entra';
    mostrar($('errorAcceso'), '');
  }

  tabEntrar.addEventListener('click', function () { cambiarModo(false); });
  tabRegistro.addEventListener('click', function () { cambiarModo(true); });
  // Flechas ←/→ entre pestañas (patrón ARIA de tablist)
  $('vistaAcceso').querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    cambiarModo(!modoRegistro);
    (modoRegistro ? tabRegistro : tabEntrar).focus();
  });

  // Solo cifras en los campos de PIN
  [inPin, inPin2].forEach(function (n) {
    n.addEventListener('input', function () { n.value = n.value.replace(/\D/g, '').slice(0, 4); });
  });

  // Misma regla que el servidor (Match.gs), solo para avisar antes de enviar
  var RE_NOMBRE = /^\p{L}[\p{L}\p{M} '’·.\-]*$/u;

  $('formAcceso').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var nombre = inNombre.value.replace(/\s+/g, ' ').trim();
    var pin = inPin.value;
    mostrar($('okAcceso'), '');

    if (nombre.length < 3 || nombre.length > 40 || !RE_NOMBRE.test(nombre)) return mostrar($('errorAcceso'), MENSAJES.nombre);
    if (!/^\d{4}$/.test(pin)) return mostrar($('errorAcceso'), MENSAJES.pin);
    if (modoRegistro && pin !== inPin2.value) return mostrar($('errorAcceso'), 'Els dos PIN no coincideixen.');

    mostrar($('errorAcceso'), '');
    recordar = $('campoRecordar').checked;
    var btn = $('btnAcceso');
    btn.disabled = true;
    btn.textContent = 'Un moment…';

    llamar(modoRegistro ? 'registro' : 'entrar', { nombre: nombre, pin: pin })
      .catch(comoRespuesta)
      .then(function (r) {
        btn.disabled = false;
        cambiarModo(modoRegistro);   // restaura el texto del botón
        if (!r.ok) {
          mostrar($('errorAcceso'), textoError(r));
          if (r.error === 'credenciales' || r.error === 'pin') { inPin.value = ''; inPin.focus(); }
          return;
        }
        inPin.value = inPin2.value = '';
        guardarSesion(r);
        cargarEstado(true);
      });
  });

  /* ---------- Vista: dentro ---------- */

  function verVista(cual) {
    $('vistaAcceso').hidden = cual !== 'acceso';
    $('vistaDentro').hidden = cual !== 'dentro';
    $('cargando').hidden = cual !== 'cargando';
    // "Com funciona" abierto para quien aún no ha entrado; plegado dentro
    $('como').open = cual === 'acceso';
  }

  function cargarEstado(primeraVez) {
    if (primeraVez) verVista('cargando');
    consultar(primeraVez);
  }

  // Pide el estado al servidor. También es la consulta periódica.
  function consultar(primeraVez) {
    if (!sesion || consultando) return;
    consultando = true;
    ultimaConsulta = Date.now();
    llamar('estado')
      .catch(comoRespuesta)
      .then(function (r) {
        consultando = false;
        if (!r.ok) {
          if (r.error === 'sesion') return salirLocal(MENSAJES.sesion);
          if (primeraVez) {
            // Sin conexión al entrar: volvemos al formulario con el aviso
            verVista('acceso');
            mostrar($('errorAcceso'), textoError(r));
          }
          // En la consulta periódica un fallo puntual no molesta: se reintenta
          programar();
          return;
        }
        aplicarEstado(r);
        verVista('dentro');
        programar();
      });
  }

  function aplicarEstado(r) {
    datos.participantes = r.participantes || [];
    datos.likes = {};
    (r.likes || []).forEach(function (id) { datos.likes[id] = true; });
    datos.matches = {};
    (r.matches || []).forEach(function (m) { datos.matches[m.id] = m.nombre; });
    datos.revelado = r.revelado !== false;
    datos.revelacion = r.revelacion || null;
    datos.maxLikes = r.maxLikes || 0;
    if (r.yo) sesion.nombre = r.yo.nombre;
    pintarDentro();
    (r.nuevos || []).forEach(encolarMatch);
  }

  function pintarDentro() {
    $('miNombre').textContent = sesion.nombre;
    pintarMatches();
    pintarPersonas();
  }

  function pintarMatches() {
    var lista = $('listaMatches');
    lista.replaceChildren();
    var ids = Object.keys(datos.matches);
    var nota = '';
    if (!datos.revelado && datos.revelacion) {
      nota = 'Els matches es mostraran ' + C.diaLargo(datos.revelacion) + ' a les ' + C.hora(datos.revelacion) + '.';
    } else if (!ids.length) {
      nota = 'Encara no en tens cap. Quan algú que has marcat també et marqui, sortirà aquí.';
    }
    mostrar($('notaMatches'), nota);
    ids
      .sort(function (a, b) { return datos.matches[a].localeCompare(datos.matches[b], 'ca'); })
      .forEach(function (id) {
        var li = el('li', 'mis-matches__item');
        li.appendChild(el('span', 'mis-matches__cor', '♥'));
        li.appendChild(el('span', null, datos.matches[id]));
        lista.appendChild(li);
      });
  }

  function normalizar(t) {
    return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function pintarPersonas() {
    var lista = $('listaPersonas');
    var filtro = normalizar($('buscar').value);
    var total = datos.participantes.length;
    var marcadas = Object.keys(datos.likes).length;

    var cuenta = total === 1 ? '1 persona més' : total + ' persones més';
    cuenta += ' · n\'has marcat ' + marcadas;
    if (datos.maxLikes) cuenta += ' de ' + datos.maxLikes;
    $('cuenta').textContent = cuenta;

    lista.replaceChildren();
    var visibles = datos.participantes.filter(function (p) { return !filtro || normalizar(p.nombre).indexOf(filtro) >= 0; });
    visibles.forEach(function (p) { lista.appendChild(filaPersona(p)); });

    var vacio = '';
    if (!total) vacio = 'Encara no s\'hi ha apuntat ningú més. Torna-hi més tard.';
    else if (!visibles.length) vacio = 'Cap nom coincideix amb la cerca.';
    mostrar($('sinPersonas'), vacio);
  }

  function filaPersona(p) {
    var marcado = !!datos.likes[p.id];
    var li = el('li', 'persona' + (marcado ? ' persona--marcada' : ''));
    var nombre = el('span', 'persona__nombre', p.nombre);
    li.appendChild(nombre);
    if (datos.matches[p.id]) li.appendChild(el('span', 'chip-match', 'Match'));

    var b = el('button', 'btn-cor');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(marcado));
    b.setAttribute('aria-label', (marcado ? 'Desmarca ' : 'Marca ') + p.nombre);
    b.disabled = !!enCurso[p.id];
    b.appendChild(iconoCor());
    b.addEventListener('click', function () { alternarLike(p); });
    li.appendChild(b);
    return li;
  }

  var SVG = 'http://www.w3.org/2000/svg';
  function iconoCor() {
    var svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    var path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', 'M12 20.5s-7.5-4.6-7.5-10.6A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.7c0 6-7.5 10.6-7.5 10.6z');
    svg.appendChild(path);
    return svg;
  }

  $('buscar').addEventListener('input', pintarPersonas);

  function alternarLike(p) {
    if (enCurso[p.id]) return;
    var quitar = !!datos.likes[p.id];
    mostrar($('errorDentro'), '');
    enCurso[p.id] = true;
    // Optimista: el corazón cambia ya; si el servidor falla, se deshace
    if (quitar) { delete datos.likes[p.id]; delete datos.matches[p.id]; }
    else datos.likes[p.id] = true;
    pintarDentro();

    llamar(quitar ? 'quitarLike' : 'like', { a: p.id })
      .catch(comoRespuesta)
      .then(function (r) {
        delete enCurso[p.id];
        if (!r.ok) {
          if (r.error === 'sesion') return salirLocal(MENSAJES.sesion);
          if (quitar) datos.likes[p.id] = true; else delete datos.likes[p.id];
          mostrar($('errorDentro'), textoError(r));
          // Si la persona se ha dado de baja, refrescamos la lista
          if (r.error === 'no_existe') consultar(false);
        } else if (r.match) {
          datos.matches[r.match.id] = r.match.nombre;
          encolarMatch(r.match);
        }
        pintarDentro();
      });
  }

  /* ---------- Salir y darse de baja ---------- */

  function salirLocal(mensaje) {
    olvidarSesion();
    datos.participantes = [];
    cambiarModo(false);
    verVista('acceso');
    if (mensaje) mostrar($('errorAcceso'), mensaje);
  }

  $('btnSalir').addEventListener('click', function () {
    // Avisamos al servidor para que el token deje de valer; si falla, da igual:
    // en este dispositivo ya no queda.
    llamar('salir').catch(function () {});
    salirLocal('');
    mostrar($('okAcceso'), 'Has sortit. Per tornar a entrar necessitaràs el teu PIN.');
  });

  var dialogoBaja = $('dialogoBaja');
  $('btnBaja').addEventListener('click', function () {
    if (typeof dialogoBaja.showModal === 'function') {
      dialogoBaja.returnValue = '';
      dialogoBaja.showModal();
    } else if (window.confirm('Segur? ' + $('bajaTexto').textContent)) {
      darDeBaja();
    }
  });
  dialogoBaja.addEventListener('close', function () {
    if (dialogoBaja.returnValue === 'si') darDeBaja();
  });

  function darDeBaja() {
    var btn = $('btnBaja');
    btn.disabled = true;
    llamar('baja')
      .catch(comoRespuesta)
      .then(function (r) {
        btn.disabled = false;
        if (!r.ok && r.error !== 'sesion') return mostrar($('errorDentro'), textoError(r));
        salirLocal('');
        mostrar($('okAcceso'), 'Compte esborrat. S\'han eliminat el teu nom i tots els teus likes.');
      });
  }

  /* ---------- Consulta periódica (solo con la página visible) ---------- */

  // setTimeout encadenado (no setInterval): la siguiente consulta se programa
  // cuando acaba la anterior, así nunca se solapan si el servidor va lento.
  function programar() {
    clearTimeout(temporizador);
    if (!sesion || document.visibilityState !== 'visible') return;
    var espera = Math.max(0, INTERVALO - (Date.now() - ultimaConsulta));
    temporizador = setTimeout(function () { consultar(false); }, espera);
  }

  // Al volver a la pestaña: si han pasado 45 s desde la última, consulta ya;
  // si no, espera lo que falte. Al irse a segundo plano: se para.
  document.addEventListener('visibilitychange', programar);

  /* ---------- Animación de match ---------- */

  function encolarMatch(m) {
    if (animados[m.id]) return;
    animados[m.id] = true;
    colaMatch.push(m);
    if ($('pantallaMatch').hidden) siguienteMatch();
  }

  var focoAnterior = null;

  function siguienteMatch() {
    var m = colaMatch.shift();
    var pantalla = $('pantallaMatch');
    if (!m) {
      pantalla.hidden = true;
      document.body.classList.remove('sin-scroll');
      if (focoAnterior && focoAnterior.focus) focoAnterior.focus();
      return;
    }
    if (pantalla.hidden) focoAnterior = document.activeElement;
    $('pmNombre').textContent = m.nombre;
    pantalla.hidden = false;
    // Reinicia la animación de entrada aunque ya estuviera abierta
    pantalla.classList.remove('pantalla-match--entra');
    void pantalla.offsetWidth;
    pantalla.classList.add('pantalla-match--entra');
    document.body.classList.add('sin-scroll');
    $('pmCerrar').focus();
    if (!sinMovimiento) confeti();
    // Chrome bloquea vibrate() (y lo avisa en consola) si aún no se ha tocado la página
    var activa = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && activa) navigator.vibrate([40, 60, 120]);
  }

  $('pmCerrar').addEventListener('click', siguienteMatch);
  $('pantallaMatch').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') siguienteMatch();
    if (e.key === 'Tab') { e.preventDefault(); $('pmCerrar').focus(); }  // foco atrapado: solo hay un botón
  });

  // Confeti con Web Animations API (mismo sistema que en reto.js)
  function confeti() {
    var capa = $('confeti');
    var x0 = window.innerWidth / 2, y0 = window.innerHeight * .4;
    var colores = ['#ffc65c', '#ff9f4a', '#fff1c9', '#ff7a5c', '#ff8fb1', '#b8f28c'];
    for (var i = 0; i < 80; i++) {
      var p = el('span', 'confeti__pieza');
      p.style.background = colores[i % colores.length];
      p.style.left = x0 + 'px';
      p.style.top = y0 + 'px';
      if (i % 3 === 0) p.style.borderRadius = '50%';
      capa.appendChild(p);
      var ang = Math.random() * Math.PI * 2;
      var fuerza = 90 + Math.random() * 180;
      var dx = Math.cos(ang) * fuerza, dy = Math.sin(ang) * fuerza - 140;
      var giro = (Math.random() * 720 - 360) + 'deg';
      p.animate([
        { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + giro + ')', opacity: 1, offset: .35 },
        { transform: 'translate(' + (dx * 1.3) + 'px,' + (dy + 460) + 'px) rotate(' + giro + ')', opacity: 0 }
      ], { duration: 1700 + Math.random() * 900, easing: 'cubic-bezier(.2,.7,.4,1)' })
        .onfinish = (function (pieza) { return function () { pieza.remove(); }; })(p);
    }
  }

  /* ---------- Arranque ---------- */

  (cfg.explicacion || []).forEach(function (t) { $('comoLista').appendChild(el('li', null, t)); });
  if (!A.disponible) $('avisoAlmacen').hidden = false;
  if (MODO_DEMO) $('avisoDemo').hidden = false;

  if (!URL_SCRIPT) {
    $('avisoConfig').hidden = false;
    verVista('acceso');
    $('btnAcceso').disabled = true;
    return;
  }

  cambiarModo(false);
  sesion = leerSesion();
  if (sesion) cargarEstado(true);
  else verVista('acceso');

  C.irAlAncla();
})();
