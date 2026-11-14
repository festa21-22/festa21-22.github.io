/* ===========================================================================
   reto.js — Elección de dificultad, sorteo y revelación del reto personal
   (solo reto.html).

   Cómo funciona:
   1. Al entrar se busca en localStorage el reto guardado: {dificultad, numero}.
      - Si hay uno válido → ese es tu reto, siempre (sin botones ni ruleta si
        ya lo viste).
      - Si no → se enseñan los 3 botones de dificultad. Al elegir uno y
        confirmar, se sortea un número 1..10 de esa lista y se GUARDA AL
        MOMENTO (antes de la animación): recargar a mitad no permite volver a
        elegir dificultad ni re-sortear.
   2. Se guarda la DIFICULTAD y el NÚMERO, no el texto. El texto se busca en
      data.js cada vez, así si cambiáis el texto del reto 7 de "medio", quien
      lo tenga ve el texto nuevo.
   3. Una segunda clave ("revelado") recuerda si ya viste la animación;
      en visitas posteriores se muestra el resultado directamente.
   4. Cambio de reto: UNA sola vez, dentro de la MISMA dificultad y nunca al
      mismo número. Se guarda en la misma clave que el reto:
        {"dificultad":"medio","numero":3,"cambiado":true,"anterior":7}
      También se guarda ANTES de la animación (recargar no da otro intento).
   5. Modo prueba oculto: abrir reto.html?reset borra el reto guardado
      (y con él el cambio usado, porque van en la misma clave).

   Las claves llevan "-v2": las del sistema antiguo (un solo listado de
   retos) se ignoran y la persona elige dificultad como si fuera nueva.
   =========================================================================== */
(function () {
  'use strict';

  var F = window.FIESTA;
  var C = window.Comun;
  var A = window.Almacen;
  if (!F || !C || !A) return;
  var $ = C.$;

  var CLAVE_RETO = 'fiesta2122:reto-v2';          // '{"dificultad":"medio","numero":7,"cambiado":false}'
  var CLAVE_REVELADO = 'fiesta2122:revelado-v2';  // "1" tras ver la animación
  var DIFICULTADES = ['facil', 'medio', 'dificil'];
  var NOMBRES = F.nombresDificultad || { facil: 'Fàcil', medio: 'Mitjà', dificil: 'Difícil' };
  var DURACION_GIRO = 3600; // ms

  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Modo prueba: ?reset ---------- */
  // Borra el reto guardado y quita "?reset" de la dirección (replaceState no
  // recarga), para que una recarga normal no lo vuelva a borrar.
  if (/[?&]reset\b/.test(location.search)) {
    A.borrar(CLAVE_RETO);
    A.borrar(CLAVE_REVELADO);
    history.replaceState(null, '', location.pathname + location.hash);
  }

  /* ---------- Lógica (sin interfaz) ---------- */

  function lista(dif) { return (F.retos && F.retos[dif]) || []; }

  function esValido(r) {
    return !!r && DIFICULTADES.indexOf(r.dificultad) >= 0 &&
      Number.isInteger(r.numero) && r.numero >= 1 && r.numero <= lista(r.dificultad).length;
  }

  function leerGuardado() {
    try {
      var r = JSON.parse(A.leer(CLAVE_RETO));
      return esValido(r) ? r : null;
    } catch (e) {
      return null;   // JSON roto o vacío → como si no hubiera nada
    }
  }

  // Número aleatorio 1..total. crypto.getRandomValues da mejor aleatoriedad
  // que Math.random; si no existe (navegadores muy viejos) usamos Math.random.
  function aleatorio(total) {
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint32Array(1);
      window.crypto.getRandomValues(a);
      return (a[0] % total) + 1;
    }
    return Math.floor(Math.random() * total) + 1;
  }

  // Número 1..total distinto de "excluido", con la misma probabilidad para
  // todos los demás: sorteamos entre total-1 huecos y "saltamos" el excluido.
  // (Repetir el sorteo hasta que salga otro también valdría, pero así es
  // un solo sorteo y siempre termina.)
  function aleatorioDistinto(total, excluido) {
    var n = aleatorio(total - 1);
    return n >= excluido ? n + 1 : n;
  }

  // ¿Se puede cambiar? Solo si no se ha usado y hay al menos otro reto
  function puedeCambiar(r) { return !r.cambiado && lista(r.dificultad).length > 1; }

  // 7 → "07" (mismo formato que el nombre de archivo Reto07)
  function dosCifras(n) { return String(n).padStart(2, '0'); }

  // Disponible para upload.js. Empieza vacío (sin dificultad) y se rellena
  // al elegir. "revelado" indica si la persona ya ha visto su reto (para no
  // destripárselo en el formulario antes de la animación).
  window.MiReto = {
    dificultad: null,
    nombreDificultad: '',
    numero: null,
    etiqueta: '',
    texto: '',
    cambiado: false,
    revelado: false
  };

  function asignar(r) {
    var R = window.MiReto;
    R.dificultad = r.dificultad;
    R.nombreDificultad = NOMBRES[r.dificultad];
    R.numero = r.numero;
    R.etiqueta = dosCifras(r.numero);
    R.texto = lista(r.dificultad)[r.numero - 1];
    R.cambiado = !!r.cambiado;
  }

  function marcarRevelado() {
    window.MiReto.revelado = true;
    // Evento propio: upload.js lo escucha para actualizar el formulario
    document.dispatchEvent(new CustomEvent('reto:revelado'));
  }

  /* ---------- Interfaz ---------- */

  var eleccion = $('eleccion');
  var dialogo = $('dialogoConfirmar');
  var btnCambiar = $('btnCambiar');
  var maquina = $('maquina');
  var tira = $('tira');
  var btn = $('btnDescubrir');
  var resultado = $('resultado');

  // Etiqueta de color con la dificultad (verde/amarillo/rojo en el CSS)
  function pintarChip(nodo, dif) {
    nodo.textContent = NOMBRES[dif];
    nodo.className = 'chip-dif chip-dif--' + dif;
    nodo.hidden = false;
  }

  function mostrarMaquina() {
    eleccion.hidden = true;
    maquina.hidden = false;
    pintarChip($('maquinaDif'), window.MiReto.dificultad);
  }

  function pintarResultado(animar) {
    var R = window.MiReto;
    pintarChip($('resDif'), R.dificultad);
    $('resKicker').textContent = 'Repte núm. ' + R.etiqueta;
    $('resTexto').textContent = R.texto;
    btn.hidden = true;
    resultado.hidden = false;
    if (animar) resultado.classList.add('resultado--entra');
    pintarCambio();
  }

  // Botón "Canviar repte" si aún no se ha usado; si no, el texto de aviso
  function pintarCambio() {
    var r = leerGuardado() || window.MiReto;
    var puede = puedeCambiar(r);
    btnCambiar.hidden = !puede;
    btnCambiar.disabled = false;
    $('cambioUsado').hidden = !r.cambiado;
  }

  // Deja el rodillo mostrando solo el número final (sin animación)
  function mostrarNumeroFijo() {
    tira.replaceChildren(C.el('span', 'rodillo__num', window.MiReto.etiqueta));
    // sin transición: si no, la tira "volvería" despacio desde abajo (3,6 s)
    // y el rodillo se vería vacío justo al terminar el giro
    tira.style.transitionDuration = '0ms';
    tira.style.transform = 'none';
    maquina.classList.add('maquina--revelada');
  }

  /* --- Confirmación (sirve para elegir dificultad y para cambiar el reto) --- */

  var alConfirmar = null;   // función a ejecutar si dicen que sí

  function confirmar(texto, accion) {
    alConfirmar = accion;
    $('dialogoTexto').textContent = texto;

    // <dialog> nativo: accesible (foco atrapado, Esc cierra). Si el navegador
    // es antiguo y no lo tiene, usamos confirm() del sistema.
    if (dialogo && typeof dialogo.showModal === 'function') {
      dialogo.returnValue = '';
      dialogo.showModal();
    } else if (window.confirm('Segur? ' + texto)) {
      alConfirmar = null;
      accion();
    }
  }

  // <form method="dialog">: al pulsar un botón, el diálogo se cierra solo
  // y returnValue vale el "value" del botón ("si" / "no"; Esc → "").
  if (dialogo) {
    dialogo.addEventListener('close', function () {
      var accion = alConfirmar;
      alConfirmar = null;
      if (dialogo.returnValue === 'si' && accion) accion();
    });
  }

  /* --- Paso 1: elegir dificultad --- */

  function pedirConfirmacion(dif) {
    confirmar('Has triat «' + NOMBRES[dif] + '». No podràs canviar la dificultat.',
      function () { elegir(dif); });
  }

  function elegir(dif) {
    if (leerGuardado()) return;   // por si acaso: nunca se re-sortea
    var r = { dificultad: dif, numero: aleatorio(lista(dif).length) };
    A.guardar(CLAVE_RETO, JSON.stringify(r));   // ANTES de la animación
    asignar(r);
    mostrarMaquina();
    btn.hidden = true;   // la ruleta arranca sola tras confirmar
    girar();
  }

  /* --- Cambio de reto (una sola vez, misma dificultad) --- */

  function pedirCambio() {
    confirmar('Només pots canviar el repte una vegada.', cambiarReto);
  }

  function cambiarReto() {
    var R = window.MiReto;
    // Sin localStorage (modo incógnito) usamos lo que hay en memoria
    var actual = leerGuardado() ||
      (R.dificultad ? { dificultad: R.dificultad, numero: R.numero, cambiado: R.cambiado } : null);
    if (!actual || !puedeCambiar(actual)) { pintarCambio(); return; }  // por si acaso

    var nuevo = {
      dificultad: actual.dificultad,
      numero: aleatorioDistinto(lista(actual.dificultad).length, actual.numero),
      cambiado: true,
      anterior: actual.numero        // por si los organizadores lo quieren saber
    };
    // Igual que al elegir: se guarda ANTES de la animación y se marca como
    // no revelado; si recargan a mitad, sale el botón de girar con el nuevo.
    A.guardar(CLAVE_RETO, JSON.stringify(nuevo));
    A.borrar(CLAVE_REVELADO);
    asignar(nuevo);
    R.revelado = false;
    document.dispatchEvent(new CustomEvent('reto:cambiando'));  // upload.js oculta el número viejo

    // Volvemos a la máquina: se esconde el resultado y gira otra vez
    btnCambiar.hidden = true;
    resultado.hidden = true;
    resultado.classList.remove('resultado--entra');
    maquina.classList.remove('maquina--revelada');
    btn.hidden = true;
    maquina.scrollIntoView({ behavior: sinMovimiento ? 'auto' : 'smooth', block: 'center' });
    girar();
  }

  /* --- Paso 2: ruleta --- */

  // Tragaperras: llenamos la tira con varias vueltas de números en orden
  // aleatorio y terminamos en el nuestro. Luego desplazamos la tira hacia
  // arriba con una transición CSS que frena al final (ease-out con rebote).
  function girar() {
    btn.disabled = true;

    if (sinMovimiento) { revelar(); return; }

    var R = window.MiReto;
    var total = lista(R.dificultad).length;
    var nums = ['?'];
    for (var vuelta = 0; vuelta < 3; vuelta++) {
      var orden = [];
      for (var i = 1; i <= total; i++) orden.push(i);
      orden.sort(function () { return Math.random() - .5; });
      nums = nums.concat(orden);
    }
    nums.push(R.numero);

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
    marcarRevelado();
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

  // Nombres de los botones desde data.js
  eleccion.querySelectorAll('[data-dificultad]').forEach(function (b) {
    var dif = b.getAttribute('data-dificultad');
    b.querySelector('.btn-dif__nombre').textContent = NOMBRES[dif];
    b.addEventListener('click', function () { pedirConfirmacion(dif); });
  });
  btnCambiar.addEventListener('click', pedirCambio);

  var guardado = leerGuardado();

  if (guardado && A.leer(CLAVE_REVELADO) === '1') {
    // Visita posterior: directamente el resultado
    asignar(guardado);
    mostrarMaquina();
    mostrarNumeroFijo();
    pintarResultado(false);
    marcarRevelado();
  } else if (guardado) {
    // Ya eligió (y se sorteó) pero cerró antes de ver la animación:
    // misma dificultad y mismo número, solo falta girar.
    asignar(guardado);
    mostrarMaquina();
    btn.addEventListener('click', girar);
  } else {
    // Primera vez: elegir dificultad
    eleccion.hidden = false;
  }

  C.irAlAncla();
})();
