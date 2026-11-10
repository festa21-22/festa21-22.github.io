/* ===========================================================================
   main.js — Portada, cuenta atrás, información, agenda, FAQ y navegación.
   Lee todo de window.FIESTA (definido en data.js, que se carga antes).
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
      if (v) n.textContent = v;
    });
  }

  /* ---------- Cuenta atrás ---------- */

  function iniciarCuentaAtras() {
    var inicio = new Date(F.inicio).getTime();
    var fin = new Date(F.fin).getTime();
    var titulo = $('cuentaTitulo');
    var cajas = $('cuentaCajas');
    var nums = {};
    cajas.querySelectorAll('[data-u]').forEach(function (n) { nums[n.dataset.u] = n; });

    $('cuentaFecha').textContent = capital(diaLargo(F.inicio)) + ' · ' + hora(F.inicio) + ' h';

    var dos = function (n) { return String(n).padStart(2, '0'); };
    var temporizador;

    function tick() {
      var ahora = Date.now();

      if (ahora >= fin) {
        titulo.textContent = 'La fiesta ha terminado';
        cajas.hidden = true;
        clearInterval(temporizador);
        return;
      }
      // Antes del inicio: tiempo que falta. Durante: tiempo que queda hasta el fin.
      var objetivo = inicio;
      if (ahora >= inicio) {
        objetivo = fin;
        titulo.textContent = '¡Ha empezado! Quedan';
        $('cuenta').classList.add('cuenta--empezada');
      }

      var s = Math.floor((objetivo - ahora) / 1000);
      nums.d.textContent = dos(Math.floor(s / 86400));
      nums.h.textContent = dos(Math.floor(s % 86400 / 3600));
      nums.m.textContent = dos(Math.floor(s % 3600 / 60));
      nums.s.textContent = dos(s % 60);
    }

    tick();
    temporizador = setInterval(tick, 1000);
  }

  /* ---------- Información ---------- */

  function pintarInfo() {
    var mismoDia = fmt(F.inicio, { dateStyle: 'short' }) === fmt(F.fin, { dateStyle: 'short' });
    $('infoCuando').textContent = mismoDia
      ? capital(diaLargo(F.inicio)) + ', de ' + hora(F.inicio) + ' a ' + hora(F.fin)
      : 'Del ' + diaLargo(F.inicio) + ' (' + hora(F.inicio) + ') al ' + diaLargo(F.fin) + ' (' + hora(F.fin) + ')';

    var e = F.entrada;
    $('infoEntrada').textContent =
      'De ' + hora(e.desde) + ' a ' + hora(e.hasta) + ' h, el ' + diaLargo(e.desde) + '.';
    $('infoEntradaNota').textContent = e.nota || '';

    var l = F.lugar;
    $('lugarNombre').textContent = l.nombre;
    $('lugarDireccion').textContent = l.direccion;
    $('lugarIndicaciones').textContent = l.indicaciones || '';
    // Si no hay enlace propio, generamos uno de búsqueda con la dirección (API pública de URLs de Maps)
    $('lugarMaps').href = l.mapsUrl ||
      'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.nombre + ', ' + l.direccion);

    var ul = $('listaLlevar');
    F.llevar.forEach(function (cosa) { ul.appendChild(el('li', null, cosa)); });
  }

  /* ---------- Agenda con pestañas por día ---------- */

  function pintarAgenda() {
    var tabs = $('agendaTabs');
    var panel = $('agendaPanel');
    var botones = [];

    function mostrar(i) {
      botones.forEach(function (b, j) {
        b.setAttribute('aria-selected', String(i === j));
        b.tabIndex = i === j ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', botones[i].id);
      panel.replaceChildren();
      F.agenda[i].eventos.forEach(function (ev, k) {
        var li = el('li', 'evento evento--entra');
        li.style.setProperty('--i', k);
        li.appendChild(el('p', 'evento__hora', ev.hora));
        li.appendChild(el('p', 'evento__titulo', ev.titulo));
        if (ev.detalle) li.appendChild(el('p', 'evento__detalle', ev.detalle));
        panel.appendChild(li);
      });
    }

    F.agenda.forEach(function (dia, i) {
      var b = el('button', 'agenda__tab', dia.dia);
      b.type = 'button';
      b.id = 'tab-dia-' + i;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', function () { mostrar(i); });
      // flechas izquierda/derecha entre pestañas (patrón accesible de tabs)
      b.addEventListener('keydown', function (ev) {
        var d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var sig = (i + d + botones.length) % botones.length;
        mostrar(sig);
        botones[sig].focus();
      });
      botones.push(b);
      tabs.appendChild(b);
    });

    // El propio día de la fiesta se abre directamente su pestaña
    var hoy = hoyMadrid();
    var inicial = F.agenda.findIndex(function (d) { return d.fecha === hoy; });
    mostrar(inicial >= 0 ? inicial : 0);
  }

  /* ---------- FAQ ---------- */

  function pintarFAQ() {
    var cont = $('faqLista');
    if (!F.faq || !F.faq.length) { $('faq').hidden = true; return; }
    F.faq.forEach(function (item) {
      var d = el('details');
      d.appendChild(el('summary', null, item.pregunta));
      d.appendChild(el('p', null, item.respuesta));
      cont.appendChild(d);
    });
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
    guirnalda(top, -10, 2, 410, 2, 18, 13, 2.6);
    guirnalda(top, -10, -4, 410, -4, 36, 17, 3.4);

    var casa = $('guirnaldaCasa');
    guirnalda(casa, 84, 126, 292, 126, 10, 14, 2.6);
    guirnalda(casa, 292, 152, 372, 150, 7, 5, 2.4);

    var cielo = $('estrellas');
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

  /* ---------- Navegación activa y aparición al hacer scroll ---------- */

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

    var enlaces = document.querySelectorAll('.nav__item');
    // Franja estrecha en el centro de la pantalla: la sección que la cruza es la "activa"
    var activa = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        enlaces.forEach(function (a) {
          var si = a.dataset.seccion === e.target.id;
          a.classList.toggle('activo', si);
          if (si) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['inicio', 'info', 'reto', 'subir', 'faq'].forEach(function (id) {
      var s = $(id);
      if (s) activa.observe(s);
    });
  }

  /* ---------- Arranque ---------- */
  pintarCampos();
  decorar();
  iniciarCuentaAtras();
  pintarInfo();
  pintarAgenda();
  pintarFAQ();
  iniciarObservadores();
})();
