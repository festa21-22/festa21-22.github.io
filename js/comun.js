/* ===========================================================================
   comun.js — Código compartido por index.html y reto.html:
   utilidades, título, guirnaldas, estrellas, aparición al hacer scroll y
   resaltado del menú. Expone window.Comun para que lo usen los demás scripts.
   =========================================================================== */
(function () {
  'use strict';

  var F = window.FIESTA;
  if (!F) {
    console.error('No se ha cargado data.js (¿error de sintaxis en el archivo?)');
    return;
  }

  // La fiesta es en España: mostramos siempre la hora de Madrid,
  // aunque alguien abra la web con el móvil en otra zona horaria.
  var ZONA = 'Europe/Madrid';

  /* ---------- Utilidades ---------- */

  function $(id) { return document.getElementById(id); }

  // Crea un elemento con texto. Usamos textContent (no innerHTML) para que
  // cualquier carácter raro en data.js se muestre tal cual y no rompa el HTML.
  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function fmt(fechaISO, opciones) {
    var o = Object.assign({ timeZone: ZONA }, opciones);
    return new Intl.DateTimeFormat('es-ES', o).format(new Date(fechaISO));
  }
  var hora = function (iso) { return fmt(iso, { hour: '2-digit', minute: '2-digit' }); };
  // Intl devuelve "sábado, 21 de noviembre": quitamos la coma para que quede más natural
  var diaLargo = function (iso) { return fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''); };
  var capital = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  // Fecha AAAA-MM-DD de "hoy" en hora de Madrid
  function hoyMadrid() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
  }

  /* ---------- Textos simples (data-campo="...") ---------- */

  function pintarCampos() {
    document.querySelectorAll('[data-campo]').forEach(function (n) {
      var v = F[n.dataset.campo];
      if (!v) return;
      if (n.hasAttribute('data-nombre')) pintarNombre(n, v);
      else n.textContent = v;
    });
  }

  // "fiESTA": las minúsculas iniciales van en un <span> aparte para darles
  // otro color y que se vea claro que "fi" es minúscula y "ESTA" mayúscula.
  function pintarNombre(nodo, nombre) {
    var m = /^(\p{Ll}+)(.*)$/u.exec(nombre);  // \p{Ll} = cualquier letra minúscula (incluye ñ, á...)
    nodo.replaceChildren();
    if (m) {
      nodo.appendChild(el('span', 'nombre__min', m[1]));
      nodo.appendChild(document.createTextNode(m[2]));
    } else {
      nodo.textContent = nombre;
    }
  }

  /* ---------- Decoración: guirnaldas y estrellas ---------- */

  var SVG = 'http://www.w3.org/2000/svg';
  var COLORES = ['#ffc65c', '#ff9f4a', '#fff1c9', '#ff7a5c', '#ffd98a'];

  // Dibuja un cable colgando entre (x1,y1) y (x2,y2) con n bombillas.
  // El cable es una curva de Bézier cuadrática: el punto de control está
  // 2·caída por debajo del centro, así el punto medio cuelga justo "caída".
  function guirnalda(destino, x1, y1, x2, y2, caida, n, radio) {
    var cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 + 2 * caida;
    var cable = document.createElementNS(SVG, 'path');
    cable.setAttribute('class', 'cable');
    cable.setAttribute('d', 'M' + x1 + ' ' + y1 + ' Q' + cx + ' ' + cy + ' ' + x2 + ' ' + y2);
    destino.appendChild(cable);

    for (var i = 1; i <= n; i++) {
      var t = i / (n + 1), u = 1 - t;
      // B(t) = u²·P0 + 2ut·C + t²·P2
      var x = u * u * x1 + 2 * u * t * cx + t * t * x2;
      var y = u * u * y1 + 2 * u * t * cy + t * t * y2;
      var b = document.createElementNS(SVG, 'circle');
      b.setAttribute('class', 'bombilla');
      b.setAttribute('cx', x.toFixed(1));
      b.setAttribute('cy', (y + radio + 1).toFixed(1));
      b.setAttribute('r', radio);
      b.style.setProperty('--c', COLORES[i % COLORES.length]);
      b.style.setProperty('--t', (2.4 + Math.random() * 2.6).toFixed(2) + 's');
      b.style.setProperty('--d', (-Math.random() * 4).toFixed(2) + 's');
      destino.appendChild(b);
    }
  }

  function decorar() {
    var top = $('guirnaldaTop');
    if (top) {
      guirnalda(top, -10, 2, 410, 2, 18, 13, 2.6);
      guirnalda(top, -10, -4, 410, -4, 36, 17, 3.4);
    }

    var casa = $('guirnaldaCasa');
    if (casa) {
      guirnalda(casa, 84, 126, 292, 126, 10, 14, 2.6);
      guirnalda(casa, 292, 152, 372, 150, 7, 5, 2.4);
    }

    var cielo = $('estrellas');
    if (cielo) {
      for (var i = 0; i < 46; i++) {
        var s = el('span', 'estrella');
        s.style.left = (Math.random() * 100).toFixed(1) + '%';
        s.style.top = (Math.random() * 55).toFixed(1) + '%';
        if (Math.random() < .25) { s.style.width = s.style.height = '3px'; }
        s.style.setProperty('--t', (2 + Math.random() * 4).toFixed(2) + 's');
        s.style.setProperty('--d', (-Math.random() * 6).toFixed(2) + 's');
        cielo.appendChild(s);
      }
    }
  }

  /* ---------- Aparición al hacer scroll y menú activo ---------- */

  // IntersectionObserver: el navegador nos avisa cuando un elemento entra o
  // sale de pantalla, sin tener que escuchar el evento scroll (más eficiente).
  function iniciarObservadores() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.revelar').forEach(function (n) { n.classList.add('visible'); });
      return;
    }

    var aparecer = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visible'); aparecer.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.revelar').forEach(function (n) { aparecer.observe(n); });

    // Cada enlace del menú tiene data-seccion="id". Solo observamos las
    // secciones que existen en ESTA página; los enlaces a la otra página
    // no se resaltan aquí.
    var enlaces = document.querySelectorAll('.nav__item');
    var activa = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        enlaces.forEach(function (a) {
          a.classList.toggle('activo', a.dataset.seccion === e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' }); // franja fina en el centro de la pantalla

    enlaces.forEach(function (a) {
      var s = $(a.dataset.seccion);
      if (s) activa.observe(s);
    });
  }

  /* ---------- API pública y arranque ---------- */

  // Si llegamos desde la otra página con un ancla (index.html#info), el
  // navegador intenta saltar ANTES de que JS haya rellenado el contenido, y
  // el salto se pierde. Lo repetimos cuando todo está pintado.
  function irAlAncla() {
    if (!location.hash) return;
    var destino = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (destino) {
      requestAnimationFrame(function () { destino.scrollIntoView({ behavior: 'instant', block: 'start' }); });
    }
  }

  window.Comun = {
    $: $, el: el, fmt: fmt, hora: hora, diaLargo: diaLargo, capital: capital, hoyMadrid: hoyMadrid,
    irAlAncla: irAlAncla
  };

  pintarCampos();
  decorar();
  iniciarObservadores();
})();
