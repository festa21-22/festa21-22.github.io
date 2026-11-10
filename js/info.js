/* ===========================================================================
   info.js — Solo para index.html: cuenta atrás, información, agenda y FAQ.
   Usa window.FIESTA (data.js) y window.Comun (comun.js).
   =========================================================================== */
(function () {
  'use strict';

  var F = window.FIESTA;
  var C = window.Comun;
  if (!F || !C) return;
  var $ = C.$, el = C.el, hora = C.hora, diaLargo = C.diaLargo;

  /* ---------- Cuenta atrás ---------- */

  function iniciarCuentaAtras() {
    var inicio = new Date(F.inicio).getTime();
    var fin = new Date(F.fin).getTime();
    var titulo = $('cuentaTitulo');
    var cajas = $('cuentaCajas');
    var nums = {};
    cajas.querySelectorAll('[data-u]').forEach(function (n) { nums[n.dataset.u] = n; });

    $('cuentaFecha').textContent = C.capital(diaLargo(F.inicio)) + ' · ' + hora(F.inicio) + ' h';

    var dos = function (n) { return String(n).padStart(2, '0'); };
    var temporizador;

    function tick() {
      var ahora = Date.now();

      if (ahora >= fin) {
        titulo.textContent = "La festa s'ha acabat";
        cajas.hidden = true;
        clearInterval(temporizador);
        return;
      }

      // Antes del inicio: tiempo que falta. Durante: tiempo que queda hasta el fin.
      var objetivo = inicio;
      if (ahora >= inicio) {
        objetivo = fin;
        titulo.textContent = 'Ha començat! Queden';
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
    var mismoDia = C.fmt(F.inicio, { dateStyle: 'short' }) === C.fmt(F.fin, { dateStyle: 'short' });
    // Textos en catalán: "Del dissabte 21 de novembre (17:00) al diumenge..."
    $('infoCuando').textContent = mismoDia
      ? C.capital(diaLargo(F.inicio)) + ', de ' + hora(F.inicio) + ' a ' + hora(F.fin)
      : 'Del ' + diaLargo(F.inicio) + ' (' + hora(F.inicio) + ') al ' + diaLargo(F.fin) + ' (' + hora(F.fin) + ')';

    var e = F.entrada;
    $('infoEntrada').textContent =
      'De ' + hora(e.desde) + ' a ' + hora(e.hasta) + ' h, el ' + diaLargo(e.desde) + '.';
    $('infoEntradaNota').textContent = e.nota || '';

    var l = F.lugar;
    $('lugarNombre').textContent = l.nombre;
    $('lugarDireccion').textContent = l.direccion;
    $('lugarIndicaciones').textContent = l.indicaciones || '';
    // Si no hay enlace propio, generamos uno de búsqueda con la dirección (formato público de URLs de Maps)
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
    var hoy = C.hoyMadrid();
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

  iniciarCuentaAtras();
  pintarInfo();
  pintarAgenda();
  pintarFAQ();
  C.irAlAncla();
})();
