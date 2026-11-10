/* ===========================================================================
   data.js — TODOS LOS DATOS EDITABLES DE LA WEB
   ---------------------------------------------------------------------------
   Este es el ÚNICO archivo que hay que tocar para cambiar textos, horarios,
   sitio, agenda, retos o la URL del backend. El resto del código lee de aquí.

   Reglas rápidas:
   - Las fechas van en formato ISO con zona horaria de España:
       "AAAA-MM-DDTHH:MM:SS+01:00"   (+01:00 = horario de invierno, CET)
   - Los textos van entre comillas "". Si un texto lleva comillas dentro,
     usa comillas simples dentro: "Trae tu 'mejor' pijama".
   - No borres comas entre elementos de una lista. Si la web sale en blanco
     después de editar, casi siempre es una coma o comilla que falta
     (abre la consola del navegador con F12 y mira el error).

   ⚠️  TODO lo que hay ahora son DATOS DE EJEMPLO inventados.
   =========================================================================== */

window.FIESTA = {

  /* ---------- PORTADA ---------- */
  nombre: "fiESTA",                       // título grande de la portada
  subtitulo: "21–22 NOVIEMBRE",           // línea bajo el título
  etiqueta: "Fiesta privada en casa rural", // texto pequeño sobre el título

  // Inicio y fin de la fiesta. La cuenta atrás va hasta "inicio".
  inicio: "2026-11-21T17:00:00+01:00",
  fin:    "2026-11-22T19:00:00+01:00",


  /* ---------- HORARIO DE ENTRADA ---------- */
  entrada: {
    desde: "2026-11-21T17:00:00+01:00",   // a partir de cuándo se puede llegar
    hasta: "2026-11-21T21:00:00+01:00",   // hasta cuándo hay alguien abriendo
    nota: "Si vas a llegar más tarde, avisa por el grupo para que alguien te abra la puerta."
  },


  /* ---------- UBICACIÓN ---------- */
  lugar: {
    nombre: "Casa Rural El Robledal",
    direccion: "Camino del Molino 12, 40189 Villanueva del Roble, Segovia",
    // Enlace de Google Maps. Si lo dejas vacío "", se genera solo a partir
    // de la dirección. Para uno exacto: Google Maps > Compartir > Copiar enlace.
    mapsUrl: "",
    indicaciones: "Los últimos 2 km son de camino de tierra: ve despacio. Se puede aparcar en la explanada de la entrada."
  },


  /* ---------- QUÉ HAY QUE LLEVAR ---------- */
  llevar: [
    "Saco de dormir o sábanas y almohada",
    "Toalla y neceser",
    "Ropa de abrigo: por la noche baja de 5 °C",
    "Calzado cómodo para el campo",
    "Bebida para compartir",
    "Cargador del móvil",
    "DNI"
  ],


  /* ---------- AGENDA ----------
     Un bloque por día. "fecha" (AAAA-MM-DD) sirve para que, el propio día,
     la web abra directamente la pestaña de ese día.                        */
  agenda: [
    {
      dia: "Sábado 21",
      fecha: "2026-11-21",
      eventos: [
        { hora: "17:00", titulo: "Llegada y reparto de habitaciones", detalle: "Deja tus cosas y localiza tu cama." },
        { hora: "18:30", titulo: "Juegos en el jardín", detalle: "Por equipos. Los equipos se hacen allí." },
        { hora: "21:00", titulo: "Cena: barbacoa", detalle: "Hay opción vegetariana." },
        { hora: "23:00", titulo: "Fiesta", detalle: "Música en el salón y hoguera fuera." }
      ]
    },
    {
      dia: "Domingo 22",
      fecha: "2026-11-22",
      eventos: [
        { hora: "11:00", titulo: "Desayuno", detalle: "Hasta que se acabe el café." },
        { hora: "12:30", titulo: "Paseo por el pueblo", detalle: "Opcional, unos 40 minutos." },
        { hora: "14:30", titulo: "Comida", detalle: "" },
        { hora: "17:00", titulo: "Recogida entre todos", detalle: "Cuantos más seamos, antes acabamos." },
        { hora: "19:00", titulo: "Salida de la casa", detalle: "" }
      ]
    }
  ],


  /* ---------- PREGUNTAS FRECUENTES ---------- */
  faq: [
    { pregunta: "¿Puedo llevar a alguien?",
      respuesta: "Pregunta antes a la organización: las plazas para dormir están contadas." },
    { pregunta: "¿Hay camas para todos?",
      respuesta: "Hay camas y colchones para todos, pero trae saco o sábanas." },
    { pregunta: "¿Hay que pagar algo?",
      respuesta: "Sí: 25 € por persona para casa y comida. Bizum a la organización antes del 18 de noviembre." },
    { pregunta: "¿Dónde aparco?",
      respuesta: "En la explanada de la entrada. Si está llena, en el camino sin bloquear el paso." },
    { pregunta: "¿Puedo irme el sábado por la noche?",
      respuesta: "Sí, pero ten en cuenta que no hay transporte público cerca. Organiza la vuelta antes." }
  ],


  /* ---------- RETOS ----------
     Cada persona recibe UNO al azar y se guarda su NÚMERO (posición en esta
     lista, empezando en 1). Por eso:
       ✅ Puedes cambiar el TEXTO de un reto cuando quieras.
       ⚠️  NO reordenes ni borres retos una vez repartidos: cambiarías el
           reto de quien ya lo tenga. Para añadir, añade al FINAL.          */
  retos: [
    "Reto 1",  "Reto 2",  "Reto 3",  "Reto 4",  "Reto 5",
    "Reto 6",  "Reto 7",  "Reto 8",  "Reto 9",  "Reto 10",
    "Reto 11", "Reto 12", "Reto 13", "Reto 14", "Reto 15",
    "Reto 16", "Reto 17", "Reto 18", "Reto 19", "Reto 20"
  ],


  /* ---------- SUBIDA DE PRUEBAS (Google Apps Script) ----------
     Se rellena en la fase 3 siguiendo apps-script/GUIA.md                 */
  subida: {
    scriptUrl: "",          // URL de la aplicación web de Apps Script (termina en /exec)
    clave: "",              // la misma clave que pongas en Code.gs
    maxMB: 25,              // tamaño máximo por archivo
    segundosVideoRecomendados: 30
  }
};
