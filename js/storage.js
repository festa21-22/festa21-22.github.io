/* ===========================================================================
   storage.js — Acceso SEGURO a localStorage.
   localStorage puede fallar (lanzar una excepción) en modo privado de algunos
   navegadores, con las cookies bloqueadas o si el almacenamiento está lleno.
   Aquí envolvemos cada acceso en try/catch para que la web nunca se rompa.
   =========================================================================== */
(function () {
  'use strict';

  // Probamos de verdad a escribir y borrar: en algunos navegadores
  // window.localStorage existe pero falla al usarlo.
  var disponible = (function () {
    try {
      var k = '__prueba__';
      window.localStorage.setItem(k, k);
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  })();

  window.Almacen = {
    disponible: disponible,

    leer: function (clave) {
      try { return window.localStorage.getItem(clave); }
      catch (e) { return null; }
    },

    // Devuelve true si se ha guardado bien
    guardar: function (clave, valor) {
      try { window.localStorage.setItem(clave, String(valor)); return true; }
      catch (e) { return false; }
    }
  };
})();
