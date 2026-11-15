/* ===========================================================================
   match-demo.js — Servidor SIMULADO del Match, para probar la interfaz sin
   desplegar Apps Script. Solo se usa con scriptUrl: "demo" o, en local,
   abriendo match.html?demo. Los datos viven en el localStorage de ESTE
   navegador (nadie más los ve) y responden con el mismo contrato que
   apps-script/Match.gs.

   Participantes falsos para probar los casos:
     - Anna Puig:  te marca en cuanto te registras → like = match al momento
     - Laia Serra: te marca 50 s DESPUÉS de que tú la marques → prueba la
                   consulta periódica (deja la página abierta ~1 min)
     - Jordi Vila: nunca marca a nadie → like no recíproco
   Extra: match.html?demo&revelacion=2 → los matches se revelan dentro de 2 min.
          match.html?demo&apertura=1   → "Sorpresa" cerrada que se abre en 1 min.
   Para empezar de cero: localStorage.removeItem('fiesta2122:match-demo')
   =========================================================================== */
(function () {
  'use strict';

  var A = window.Almacen;
  var CLAVE = 'fiesta2122:match-demo';
  var MAX_INTENTOS = 5, MIN_BLOQUEO = 15;

  function cargar() {
    var bd = null;
    try { bd = JSON.parse(A.leer(CLAVE)); } catch (e) { /* nada */ }
    if (!bd || !bd.part) {
      bd = { part: [], likes: [], revelacion: null };
      ['Anna Puig', 'Jordi Vila', 'Laia Serra'].forEach(function (n, i) {
        bd.part.push({ id: 'bot' + i, nombre: n, norm: normalizar(n), hash: 'x', sesion: '', intentos: 0, bloqueo: 0 });
      });
    }
    var m = /[?&]revelacion=(\d+)/.exec(location.search);
    if (m && !bd.revelacion) bd.revelacion = new Date(Date.now() + m[1] * 60000).toISOString();
    // ?demo&apertura=N → el Match está cerrado ("Sorpresa") hasta dentro de N minutos
    var ap = /[?&]apertura=(\d+)/.exec(location.search);
    if (ap && !bd.apertura) bd.apertura = new Date(Date.now() + ap[1] * 60000).toISOString();
    return bd;
  }
  function guardar(bd) { A.guardar(CLAVE, JSON.stringify(bd)); }

  function normalizar(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Ni en la demo guardamos el PIN tal cual: SHA-256 con el navegador
  function sha256(texto) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function aleatorio() {
    var a = new Uint32Array(4); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (n) { return n.toString(16); }).join('');
  }

  function revelado(bd) { return !bd.revelacion || Date.now() >= new Date(bd.revelacion).getTime(); }
  // Los likes de Laia tienen "desde": no existen hasta que pasa ese momento
  function likesActivos(bd) { return bd.likes.filter(function (l) { return !l.desde || l.desde <= Date.now(); }); }

  var acciones = {
    registro: function (bd, p) {
      var nombre = String(p.nombre || '').replace(/\s+/g, ' ').trim();
      if (nombre.length < 3 || nombre.length > 40) return { ok: false, error: 'nombre' };
      if (!/^\d{4}$/.test(p.pin)) return { ok: false, error: 'pin' };
      if (bd.part.some(function (x) { return x.norm === normalizar(nombre); })) return { ok: false, error: 'nombre_ocupado' };
      var u = { id: 'p' + aleatorio().slice(0, 11), nombre: nombre, norm: normalizar(nombre), salt: aleatorio(), intentos: 0, bloqueo: 0 };
      var token = aleatorio() + aleatorio();
      return Promise.all([sha256(u.salt + p.pin), sha256(token)]).then(function (h) {
        u.hash = h[0]; u.sesion = h[1];
        bd.part.push(u);
        bd.likes.push({ de: 'bot0', a: u.id, vist: '' });   // Anna te marca ya
        return { ok: true, id: u.id, token: token, nombre: nombre };
      });
    },

    entrar: function (bd, p) {
      if (!/^\d{4}$/.test(p.pin)) return { ok: false, error: 'pin' };
      var u = bd.part.find(function (x) { return x.norm === normalizar(p.nombre); });
      if (!u || !u.salt) return { ok: false, error: 'credenciales' };
      var ahora = Date.now();
      if (u.bloqueo > ahora) return { ok: false, error: 'bloqueado', minutos: Math.ceil((u.bloqueo - ahora) / 60000) };
      return sha256(u.salt + p.pin).then(function (h) {
        if (h === u.hash) {
          var token = aleatorio() + aleatorio();
          return sha256(token).then(function (ht) {
            u.sesion = ht; u.intentos = 0; u.bloqueo = 0;
            return { ok: true, id: u.id, token: token, nombre: u.nombre };
          });
        }
        u.intentos++;
        if (u.intentos >= MAX_INTENTOS) {
          u.intentos = 0; u.bloqueo = ahora + MIN_BLOQUEO * 60000;
          return { ok: false, error: 'bloqueado', minutos: MIN_BLOQUEO };
        }
        return { ok: false, error: 'credenciales', quedan: MAX_INTENTOS - u.intentos };
      });
    },

    estado: function (bd, yo) {
      var activos = likesActivos(bd);
      var mios = activos.filter(function (l) { return l.de === yo.id; });
      var porId = {};
      bd.part.forEach(function (x) { porId[x.id] = x; });
      var matches = [], nuevos = [];
      if (revelado(bd)) {
        mios.forEach(function (l) {
          if (!activos.some(function (o) { return o.de === l.a && o.a === yo.id; })) return;
          var m = { id: l.a, nombre: porId[l.a].nombre };
          matches.push(m);
          if (l.vist !== 'si') { l.vist = 'si'; nuevos.push(m); }
        });
      }
      return {
        ok: true, yo: { id: yo.id, nombre: yo.nombre },
        participantes: bd.part.filter(function (x) { return x.id !== yo.id; })
          .map(function (x) { return { id: x.id, nombre: x.nombre }; })
          .sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'ca'); }),
        likes: mios.map(function (l) { return l.a; }),
        matches: matches, nuevos: nuevos,
        revelado: revelado(bd), revelacion: bd.revelacion, maxLikes: 0
      };
    },

    like: function (bd, yo, p) {
      if (p.a === yo.id) return { ok: false, error: 'datos' };
      var otro = bd.part.find(function (x) { return x.id === p.a; });
      if (!otro) return { ok: false, error: 'no_existe' };
      if (bd.likes.some(function (l) { return l.de === yo.id && l.a === p.a; })) return { ok: true, match: null };
      var reciproco = likesActivos(bd).some(function (l) { return l.de === p.a && l.a === yo.id; });
      var hay = reciproco && revelado(bd);
      bd.likes.push({ de: yo.id, a: p.a, vist: hay ? 'si' : '' });
      // Laia contesta 50 s más tarde (si aún no te había marcado)
      if (p.a === 'bot2' && !reciproco && !bd.likes.some(function (l) { return l.de === 'bot2' && l.a === yo.id; })) {
        bd.likes.push({ de: 'bot2', a: yo.id, vist: '', desde: Date.now() + 50000 });
      }
      return { ok: true, match: hay ? { id: otro.id, nombre: otro.nombre } : null };
    },

    quitarLike: function (bd, yo, p) {
      bd.likes = bd.likes.filter(function (l) { return !(l.de === yo.id && l.a === p.a); });
      return { ok: true };
    },

    salir: function (bd, yo) { yo.sesion = ''; return { ok: true }; },

    baja: function (bd, yo) {
      bd.likes = bd.likes.filter(function (l) { return l.de !== yo.id && l.a !== yo.id; });
      bd.part = bd.part.filter(function (x) { return x.id !== yo.id; });
      return { ok: true };
    }
  };

  function llamar(p) {
    var bd = cargar();
    var accion = acciones[p.accion];
    var res;
    // Igual que Match.gs: con el Match cerrado solo responde "apertura"
    var abierto = !bd.apertura || Date.now() >= new Date(bd.apertura).getTime();
    var info = { apertura: bd.apertura || null, ahora: Date.now() };
    if (p.accion === 'apertura') res = Object.assign({ ok: true, abierto: abierto }, info);
    else if (!abierto) res = Object.assign({ ok: false, error: 'cerrado' }, info);
    else if (!accion) res = { ok: false, error: 'accion' };
    else if (p.accion === 'registro' || p.accion === 'entrar') res = accion(bd, p);
    else {
      var yo = bd.part.find(function (x) { return x.id === p.id; });
      res = !yo || !yo.sesion || !p.token
        ? { ok: false, error: 'sesion' }
        : sha256(p.token).then(function (h) { return h === yo.sesion ? accion(bd, yo, p) : { ok: false, error: 'sesion' }; });
    }
    // Retraso para que se parezca a la red real
    return Promise.resolve(res).then(function (r) {
      guardar(bd);
      return new Promise(function (ok) { setTimeout(function () { ok(r); }, 350 + Math.random() * 400); });
    });
  }

  window.MatchDemo = { llamar: llamar };
})();
