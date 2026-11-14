/* ===========================================================================
   upload.js — Formulario para subir la prueba del reto a Google Drive
   (a través de un Google Apps Script desplegado como aplicación web).

   Flujo:
   1. Validar en el cliente: nombre, tipo (foto/vídeo) y TAMAÑO máximo.
   2. Leer el archivo como base64 (FileReader). Base64 convierte bytes en
      texto, así se puede meter dentro de un JSON. Ocupa ~33% más.
   3. Enviar con XMLHttpRequest, Content-Type "text/plain":
        - Con "application/json" el navegador haría antes una petición
          OPTIONS (preflight CORS) y Apps Script no sabe responderla → error.
          "text/plain" es una "petición simple": no hay preflight.
        - SIN progreso de subida: escuchar xhr.upload.onprogress también
          provoca preflight (regla de CORS poco conocida) y rompería la
          subida. La barra es "indeterminada" (rayas animadas).
        - XHR por el timeout (xhr.timeout) y los errores de red claros.
   4. Apps Script responde con un redirect 302 a script.googleusercontent.com,
      que XHR sigue solo; esa respuesta sí trae cabeceras CORS y la podemos leer.

   Modo de prueba: si en data.js scriptUrl es "demo", se simula la subida.
   =========================================================================== */
(function () {
  'use strict';

  var F = window.FIESTA;
  var C = window.Comun;
  var A = window.Almacen;
  var R = window.MiReto;
  if (!F || !C || !A || !R) return;
  var $ = C.$;

  var cfg = F.subida || {};
  var URL_SCRIPT = (cfg.scriptUrl || '').trim();
  var MODO_DEMO = URL_SCRIPT === 'demo';
  var MAX_MB = cfg.maxMB || 25;
  var MAX_BYTES = MAX_MB * 1024 * 1024;
  var SEG_VIDEO = cfg.segundosVideoRecomendados || 30;
  var CLAVE_NOMBRE = 'fiesta2122:nombre';

  // Algunos Android dejan file.type vacío: entonces miramos la extensión.
  var EXT_FOTO = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  var EXT_VIDEO = ['mp4', 'mov', 'webm', '3gp', 'm4v', 'mkv'];

  /* ---------- Elementos ---------- */
  var form = $('formSubir');
  var inNombre = $('campoNombre');
  var inArchivo = $('campoArchivo');
  var btnEnviar = $('btnEnviar');
  var progreso = $('progreso');
  var barra = $('progresoBarra');
  var relleno = $('progresoRelleno');
  var progresoTexto = $('progresoTexto');
  var mensajeError = $('mensajeError');
  var exito = $('exito');

  var archivo = null;     // archivo elegido y válido
  var previewURL = null;  // URL temporal para la miniatura
  var enviando = false;

  /* ---------- Utilidades ---------- */

  function extension(nombre) {
    var m = /\.([a-z0-9]+)$/i.exec(nombre || '');
    return m ? m[1].toLowerCase() : '';
  }

  function tipoDe(file) {
    if (/^image\//.test(file.type)) return 'foto';
    if (/^video\//.test(file.type)) return 'video';
    var ext = extension(file.name);
    if (EXT_FOTO.indexOf(ext) >= 0) return 'foto';
    if (EXT_VIDEO.indexOf(ext) >= 0) return 'video';
    return null;
  }

  function mb(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / 1024 / 1024).toLocaleString('ca-ES', { maximumFractionDigits: 1 }) + ' MB';
  }

  function mostrarError(nodo, texto) {
    nodo.textContent = texto || '';
    nodo.hidden = !texto;
  }

  /* ---------- Estado inicial ---------- */

  // El número solo se enseña cuando ya se ha revelado arriba con la animación
  function pintarReto() {
    $('campoReto').textContent = R.revelado
      ? R.nombreDificultad + ' · Repte núm. ' + R.etiqueta
      : 'Primer descobreix-lo a dalt ↑';
    if (R.revelado) mostrarError($('errorReto'), '');
  }
  pintarReto();
  document.addEventListener('reto:revelado', pintarReto);
  // Durante la ruleta del cambio de reto no se enseña (ni se envía) el número viejo
  document.addEventListener('reto:cambiando', pintarReto);
  $('ayudaArchivo').textContent = 'Màxim ' + MAX_MB + ' MB · vídeos curts, d\'uns ' + SEG_VIDEO + ' segons';

  // Recordamos el nombre para la próxima vez (comodidad, no es crítico)
  var nombreGuardado = A.leer(CLAVE_NOMBRE);
  if (nombreGuardado) inNombre.value = nombreGuardado;

  if (MODO_DEMO) $('avisoDemo').hidden = false;
  if (!URL_SCRIPT) {
    $('avisoConfig').hidden = false;
    btnEnviar.disabled = true;
  }

  /* ---------- Elegir archivo ---------- */

  inArchivo.addEventListener('change', function () {
    var f = inArchivo.files && inArchivo.files[0];
    archivo = null;
    mostrarError($('errorArchivo'), '');
    mostrarError($('notaArchivo'), '');
    mostrarError(mensajeError, '');
    pintarSeleccion(null);
    if (!f) return;

    var tipo = tipoDe(f);
    if (!tipo) {
      mostrarError($('errorArchivo'), 'Només es poden pujar fotos o vídeos.');
      inArchivo.value = '';
      return;
    }
    if (f.size > MAX_BYTES) {
      mostrarError($('errorArchivo'),
        'L\'arxiu fa ' + mb(f.size) + ' i el màxim és ' + MAX_MB + ' MB. ' +
        (tipo === 'video' ? 'Grava un vídeo més curt (uns ' + SEG_VIDEO + ' s) o amb menys qualitat.' : 'Prova amb una foto més petita.'));
      inArchivo.value = '';
      return;
    }

    archivo = f;
    pintarSeleccion(f, tipo);
    if (tipo === 'video') avisarDuracion(f);
  });

  function pintarSeleccion(f, tipo) {
    var cont = $('preview');
    cont.replaceChildren();
    if (previewURL) { URL.revokeObjectURL(previewURL); previewURL = null; }

    $('selectorVacio').hidden = !!f;
    $('selectorLleno').hidden = !f;
    $('selector').classList.toggle('selector--lleno', !!f);
    if (!f) return;

    $('archivoNombre').textContent = f.name;
    $('archivoPeso').textContent = (tipo === 'video' ? 'Vídeo' : 'Foto') + ' · ' + mb(f.size);

    // createObjectURL: URL local temporal que apunta al archivo, sin leerlo entero
    previewURL = URL.createObjectURL(f);
    var media = document.createElement(tipo === 'video' ? 'video' : 'img');
    media.src = previewURL;
    if (tipo === 'video') { media.muted = true; media.playsInline = true; media.preload = 'metadata'; }
    else media.alt = '';
    media.onerror = function () { media.remove(); }; // p. ej. HEIC en Chrome: sin miniatura, no pasa nada
    cont.appendChild(media);
  }

  // Leemos solo los metadatos del vídeo para saber cuánto dura (aviso, no bloquea)
  function avisarDuracion(f) {
    var v = document.createElement('video');
    v.preload = 'metadata';
    var u = URL.createObjectURL(f);
    v.onloadedmetadata = function () {
      URL.revokeObjectURL(u);
      if (isFinite(v.duration) && v.duration > SEG_VIDEO * 1.5) {
        mostrarError($('notaArchivo'),
          'El vídeo dura ' + Math.round(v.duration) + ' s. Et recomanem uns ' + SEG_VIDEO + ' s perquè pugi més ràpid.');
      }
    };
    v.onerror = function () { URL.revokeObjectURL(u); };
    v.src = u;
  }

  /* ---------- Enviar ---------- */

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();          // sin esto el navegador recargaría la página
    if (enviando) return;

    mostrarError(mensajeError, '');
    var nombre = inNombre.value.trim();
    var ok = true;

    if (!nombre) {
      mostrarError($('errorNombre'), 'Escriu el teu nom.');
      ok = false;
    } else {
      mostrarError($('errorNombre'), '');
    }
    if (!R.revelado) {
      mostrarError($('errorReto'), 'Primer tria la dificultat i descobreix el teu repte a dalt.');
      ok = false;
    }
    if (!archivo) {
      if (!$('errorArchivo').textContent) mostrarError($('errorArchivo'), 'Tria una foto o un vídeo.');
      ok = false;
    }
    if (!ok) return;

    A.guardar(CLAVE_NOMBRE, nombre);
    subir(nombre, archivo);
  });

  inNombre.addEventListener('input', function () { mostrarError($('errorNombre'), ''); });

  function subir(nombre, f) {
    enviando = true;
    btnEnviar.disabled = true;
    inArchivo.disabled = true;
    inNombre.disabled = true;
    progreso.hidden = false;
    fase('Preparant l\'arxiu…', null);

    leerBase64(f)
      .then(function (base64) {
        var cuerpo = JSON.stringify({
          clave: cfg.clave || '',
          nombre: nombre,
          dificultad: R.dificultad,   // "facil" | "medio" | "dificil"
          reto: R.numero,
          nombreArchivo: f.name,
          tipo: f.type || '',
          datos: base64
        });
        base64 = null; // dejamos que el recolector de basura libere memoria antes
        return MODO_DEMO ? simular(cuerpo.length) : enviarXHR(cuerpo);
      })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || 'respuesta');
        terminarBien(res.archivo);
      })
      .catch(function (err) {
        terminarMal(err && err.message);
      });
  }

  // Muestra el texto de la fase y el %; pct = null → barra "indeterminada" (animada)
  function fase(texto, pct) {
    progresoTexto.textContent = texto;
    var indeterminado = pct == null;
    progreso.classList.toggle('progreso--indeterminado', indeterminado);
    relleno.style.width = indeterminado ? '100%' : pct + '%';
    if (indeterminado) barra.removeAttribute('aria-valuenow');
    else barra.setAttribute('aria-valuenow', String(pct));
  }

  function leerBase64(f) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();
      // readAsDataURL da "data:video/mp4;base64,AAAA..." → nos quedamos con lo de después de la coma
      lector.onload = function () { resolve(String(lector.result).split(',')[1] || ''); };
      lector.onerror = function () { reject(new Error('lectura')); };
      lector.readAsDataURL(f);
    });
  }

  function enviarXHR(cuerpo) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', URL_SCRIPT);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      xhr.timeout = 10 * 60 * 1000; // 10 min, por si la conexión es lenta

      // ⚠️ NO añadir xhr.upload.onprogress (ni ningún listener en xhr.upload):
      // con un listener de subida el navegador hace SIEMPRE preflight CORS,
      // aunque sea text/plain, y Apps Script no lo responde → la subida falla.
      // Por eso la barra es indeterminada y no hay %.
      fase('Pujant ' + mb(cuerpo.length) + '… pot trigar una mica', null);

      xhr.onload = function () {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch (e) { reject(new Error('respuesta')); } // p. ej. página HTML de error de Google
      };
      xhr.onerror = function () { reject(new Error('red')); };
      xhr.ontimeout = function () { reject(new Error('tiempo')); };
      xhr.send(cuerpo);
    });
  }

  // Simulación para probar la interfaz sin backend (scriptUrl: "demo")
  // Igual que la real: barra indeterminada (sin %), unos segundos de espera.
  function simular(bytes) {
    fase('Pujant ' + mb(bytes) + '… pot trigar una mica', null);
    return new Promise(function (resolve) {
      setTimeout(function () {
        // Mismo formato que Code.gs (sin acentos: Facil / Mitja / Dificil)
        var dif = { facil: 'Facil', medio: 'Mitja', dificil: 'Dificil' }[R.dificultad];
        resolve({ ok: true, archivo: 'Prova_' + dif + '_Reto' + R.etiqueta + '_demo.jpg' });
      }, 2500);
    });
  }

  var MENSAJES = {
    red: 'No s\'ha pogut connectar amb el servidor. Comprova la connexió i torna-ho a provar.',
    tiempo: 'La pujada ha trigat massa. Prova amb una connexió millor o un arxiu més petit.',
    respuesta: 'El servidor ha respost de manera inesperada. Torna-ho a provar d\'aquí a una estona.',
    lectura: 'No s\'ha pogut llegir l\'arxiu. Torna\'l a triar.',
    clave: 'La pujada no està ben configurada (clau incorrecta). Avisa l\'organització.',
    grande: 'L\'arxiu és massa gran per al servidor.',
    tipo: 'Només es poden pujar fotos o vídeos.',
    datos: 'Falten dades al formulari.',
    servidor: 'Hi ha hagut un error en desar l\'arxiu. Torna-ho a provar.'
  };

  function terminarBien(nombreArchivo) {
    enviando = false;
    progreso.hidden = true;
    form.hidden = true;
    $('exitoTexto').textContent = nombreArchivo
      ? 'S\'ha desat com a «' + nombreArchivo + '». Ja la tenen els organitzadors.'
      : 'Ja la tenen els organitzadors.';
    exito.hidden = false;
    exito.focus();
  }

  function terminarMal(codigo) {
    enviando = false;
    progreso.hidden = true;
    btnEnviar.disabled = false;
    inArchivo.disabled = false;
    inNombre.disabled = false;
    mostrarError(mensajeError, MENSAJES[codigo] || MENSAJES.servidor);
  }

  // Volver a empezar para subir otra prueba
  $('btnOtra').addEventListener('click', function () {
    inArchivo.value = '';
    archivo = null;
    pintarSeleccion(null);
    btnEnviar.disabled = false;
    inArchivo.disabled = false;
    inNombre.disabled = false;
    exito.hidden = true;
    form.hidden = false;
    inArchivo.focus();
  });

  // Aviso del navegador si intentan cerrar o recargar a mitad de la subida
  window.addEventListener('beforeunload', function (e) {
    if (enviando) { e.preventDefault(); e.returnValue = ''; }
  });
})();
