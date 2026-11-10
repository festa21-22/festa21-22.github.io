/* ===========================================================================
   reto.js — Sorteo y revelación del reto personal (solo reto.html).

   Cómo funciona:
   1. Al entrar se busca el número guardado en localStorage.
      - Si hay uno válido → ese es tu reto, siempre.
      - Si no → se sortea uno y se GUARDA AL MOMENTO (antes de enseñarlo),
        así recargar a mitad de la animación no permite volver a sortear.
   2. Se guarda el NÚMERO (1, 2, 3...), no el texto. El texto se busca en
      data.js cada vez, así si cambiáis el texto del reto 7, quien tenga el 7
      ve el texto nuevo.
   3. Una segunda clave ("revelado") recuerda si ya viste la animación;
      en visitas posteriores se muestra el resultado directamente.
   =========================================================================== */
(function () {
  'use strict';

  var F = window.FIESTA;
  var C = window.Comun;
  var A = window.Almacen;
  if (!F || !C || !A) return;
  var $ = C.$;

  var CLAVE_RETO = 'fiesta2122:reto';
  var CLAVE_REVELADO = 'fiesta2122:revelado';
  var TOTAL = F.retos.length;
  var DURACION_GIRO = 3600; // ms

  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lógica (sin interfaz) ---------- */

  function esValido(n) { return Number.isInteger(n) && n >= 1 && n <= TOTAL; }

  // Número aleatorio 1..TOTAL. crypto.getRandomValues da mejor aleatoriedad
  // que Math.random; si no existe (navegadores muy viejos) usamos Math.random.
  function aleatorio() {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return (a[0] % TOTAL) + 1;
    }
    return Math.floor(Math.random() * TOTAL) + 1;
  }

  function obtenerReto() {
    var guardado = parseInt(A.leer(CLAVE_RETO), 10);
    if (esValido(guardado)) return guardado;

    var n = aleatorio();
    A.guardar(CLAVE_RETO, n);   // si falla (sin localStorage) seguimos igual
    return n;
  }

  // 7 → "07" (mismo formato que el nombre de archivo Reto07)
  function dosCifras(n) { return String(n).padStart(2, '0'); }

  var numero = obtenerReto();

  // Disponible para upload.js (fase 3)
  window.MiReto = {
    numero: numero,
    etiqueta: dosCifras(numero),
    texto: F.retos[numero - 1]
  };

  /* ---------- Interfaz ---------- */

  var maquina = $('maquina');
  var tira = $('tira');
  var btn = $('btnDescubrir');
  var resultado = $('resultado');

  function pintarResultado(animar) {
    $('resKicker').textContent = 'Repte núm. ' + dosCifras(numero);
    $('resTexto').textContent = F.retos[numero - 1];
    btn.hidden = true;
    resultado.hidden = false;
    if (animar) resultado.classList.add('resultado--entra');
  }

  // Deja el rodillo mostrando solo el número final (sin animación)
  function mostrarNumeroFijo() {
    tira.replaceChildren(C.el('span', 'rodillo__num', dosCifras(numero)));
    tira.style.transform = 'none';
    maquina.classList.add('maquina--revelada');
  }

  // Tragaperras: llenamos la tira con varias vueltas de números en orden
  // aleatorio y terminamos en el nuestro. Luego desplazamos la tira hacia
  // arriba con una transición CSS que frena al final (ease-out con rebote).
  function girar() {
    btn.disabled = true;

    if (sinMovimiento) { revelar(); return; }

    var nums = ['?'];
    for (var vuelta = 0; vuelta < 3; vuelta++) {
      var orden = F.retos.map(function (_, i) { return i + 1; });
      orden.sort(function () { return Math.random() - .5; });
      nums = nums.concat(orden);
    }
    nums.push(numero);

    tira.replaceChildren();
    nums.forEach(function (n) {
      tira.appendChild(C.el('span', 'rodillo__num', typeof n === 'number' ? dosCifras(n) : n));
    });

    var alto = tira.firstElementChild.getBoundingClientRect().height;
    maquina.classList.add('maquina--girando');
    tira.style.transitionDuration = DURACION_GIRO + 'ms';

    // Forzamos un "reflow" para que el navegador aplique el estado inicial
    // antes de cambiar transform; si no, no habría transición.
    void tira.offsetHeight;
    tira.style.transform = 'translateY(' + (-(nums.length - 1) * alto) + 'px)';

    setTimeout(revelar, DURACION_GIRO + 80);
  }

  function revelar() {
    mostrarNumeroFijo();
    maquina.classList.remove('maquina--girando');
    A.guardar(CLAVE_REVELADO, '1');
    pintarResultado(true);
    if (!sinMovimiento) confeti();
    if (navigator.vibrate) navigator.vibrate([30, 50, 80]);  // solo Android
  }

  /* ---------- Confeti con Web Animations API ---------- */
  // element.animate() anima desde JS con la misma eficiencia que CSS, sin librerías.
  function confeti() {
    var capa = $('confeti');
    var caja = maquina.getBoundingClientRect();
    var x0 = caja.left + caja.width / 2;
    var y0 = caja.top + caja.height * .45;
    var colores = ['#ffc65c', '#ff9f4a', '#fff1c9', '#ff7a5c', '#8fd3ff', '#b8f28c'];

    for (var i = 0; i < 70; i++) {
      var p = document.createElement('span');
      p.className = 'confeti__pieza';
      p.style.background = colores[i % colores.length];
      p.style.left = x0 + 'px';
      p.style.top = y0 + 'px';
      if (i % 3 === 0) p.style.borderRadius = '50%';
      capa.appendChild(p);

      var ang = Math.random() * Math.PI * 2;
      var fuerza = 80 + Math.random() * 160;
      var dx = Math.cos(ang) * fuerza;
      var dy = Math.sin(ang) * fuerza - 120;      // hacia arriba
      var giro = (Math.random() * 720 - 360) + 'deg';

      p.animate([
        { transform: 'translate(-50%, -50%) rotate(0)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + giro + ')', opacity: 1, offset: .35 },
        { transform: 'translate(' + (dx * 1.3) + 'px,' + (dy + 420) + 'px) rotate(' + giro + ')', opacity: 0 }
      ], {
        duration: 1600 + Math.random() * 900,
        easing: 'cubic-bezier(.2,.7,.4,1)'
      }).onfinish = (function (pieza) { return function () { pieza.remove(); }; })(p);
    }
  }

  /* ---------- Arranque ---------- */

  if (!A.disponible) $('avisoAlmacen').hidden = false;

  if (A.leer(CLAVE_REVELADO) === '1') {
    // Visita posterior: directamente el resultado
    mostrarNumeroFijo();
    pintarResultado(false);
  } else {
    btn.addEventListener('click', girar);
  }

  C.irAlAncla();
})();
