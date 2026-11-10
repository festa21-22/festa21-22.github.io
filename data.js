/* ===========================================================================
   data.js — TODOS LOS DATOS EDITABLES DE LA WEB
   ---------------------------------------------------------------------------
   Este es el ÚNICO archivo que hay que tocar para cambiar textos, horarios,
   sitio, agenda, retos o la URL del backend. El resto del código lee de aquí.

   La web está en CATALÁN: escribe aquí los textos en catalán.

   Reglas rápidas:
   - Las fechas van en formato ISO con zona horaria de España:
       "AAAA-MM-DDTHH:MM:SS+01:00"   (+01:00 = horario de invierno, CET)
   - Los textos van entre comillas dobles "". El apóstrofo catalán (l', d')
     se puede usar sin problema dentro de comillas dobles: "l'entrada".
   - No borres comas entre elementos de una lista. Si la web sale en blanco
     después de editar, casi siempre es una coma o comilla que falta
     (abre la consola del navegador con F12 y mira el error).

   ⚠️  TODO lo que hay ahora son DATOS DE EJEMPLO inventados.
   =========================================================================== */

window.FIESTA = {

  /* ---------- PORTADA ---------- */
  nombre: "FESTA",                              // título grande de la portada
  subtitulo: "21–22 NOVEMBRE",                  // línea bajo el título
  etiqueta: "Festa privada en una casa rural",  // texto pequeño sobre el título

  // Inicio y fin de la fiesta. La cuenta atrás va hasta "inicio".
  inicio: "2026-11-21T17:00:00+01:00",
  fin:    "2026-11-22T19:00:00+01:00",


  /* ---------- HORARIO DE ENTRADA ---------- */
  entrada: {
    desde: "2026-11-21T17:00:00+01:00",   // a partir de cuándo se puede llegar
    hasta: "2026-11-21T21:00:00+01:00",   // hasta cuándo hay alguien abriendo
    nota: "Si arribaràs més tard, avisa pel grup perquè algú t'obri la porta."
  },


  /* ---------- UBICACIÓN ---------- */
  lugar: {
    nombre: "Mas El Roure",
    direccion: "Camí del Molí 12, 17150 Sant Pere del Bosc, Girona",
    // Enlace de Google Maps. Si lo dejas vacío "", se genera solo a partir
    // de la dirección. Para uno exacto: Google Maps > Compartir > Copiar enlace.
    mapsUrl: "",
    indicaciones: "Els últims 2 km són de camí de terra: ves a poc a poc. Es pot aparcar a l'esplanada de l'entrada."
  },


  /* ---------- QUÉ HAY QUE LLEVAR ---------- */
  llevar: [
    "Sac de dormir o llençols i coixí",
    "Tovallola i necesser",
    "Roba d'abric: a la nit baixa de 5 °C",
    "Calçat còmode per al camp",
    "Beguda per compartir",
    "Carregador del mòbil",
    "DNI"
  ],


  /* ---------- AGENDA ----------
     Un bloque por día. "fecha" (AAAA-MM-DD) sirve para que, el propio día,
     la web abra directamente la pestaña de ese día.                        */
  agenda: [
    {
      dia: "Dissabte 21",
      fecha: "2026-11-21",
      eventos: [
        { hora: "17:00", titulo: "Arribada i repartiment d'habitacions", detalle: "Deixa les teves coses i troba el teu llit." },
        { hora: "18:30", titulo: "Jocs al jardí", detalle: "Per equips. Els equips es fan allà." },
        { hora: "21:00", titulo: "Sopar: barbacoa", detalle: "Hi ha opció vegetariana." },
        { hora: "23:00", titulo: "Festa", detalle: "Música al menjador i foguera a fora." }
      ]
    },
    {
      dia: "Diumenge 22",
      fecha: "2026-11-22",
      eventos: [
        { hora: "11:00", titulo: "Esmorzar", detalle: "Fins que s'acabi el cafè." },
        { hora: "12:30", titulo: "Passeig pel poble", detalle: "Opcional, uns 40 minuts." },
        { hora: "14:30", titulo: "Dinar", detalle: "" },
        { hora: "17:00", titulo: "Recollida entre tots", detalle: "Com més serem, abans acabarem." },
        { hora: "19:00", titulo: "Sortida de la casa", detalle: "" }
      ]
    }
  ],


  /* ---------- PREGUNTAS FRECUENTES ---------- */
  faq: [
    { pregunta: "Puc portar algú?",
      respuesta: "Pregunta-ho abans a l'organització: les places per dormir són limitades." },
    { pregunta: "Hi ha llits per a tothom?",
      respuesta: "Hi ha llits i matalassos per a tothom, però porta sac o llençols." },
    { pregunta: "S'ha de pagar alguna cosa?",
      respuesta: "Sí: 25 € per persona per la casa i el menjar. Bizum a l'organització abans del 18 de novembre." },
    { pregunta: "On aparco?",
      respuesta: "A l'esplanada de l'entrada. Si és plena, al camí sense tallar el pas." },
    { pregunta: "Puc marxar dissabte a la nit?",
      respuesta: "Sí, però tingues en compte que no hi ha transport públic a prop. Organitza la tornada abans." }
  ],


  /* ---------- RETOS ----------
     Cada persona recibe UNO al azar y se guarda su NÚMERO (posición en esta
     lista, empezando en 1). Por eso:
       ✅ Puedes cambiar el TEXTO de un reto cuando quieras.
       ⚠️  NO reordenes ni borres retos una vez repartidos: cambiarías el
           reto de quien ya lo tenga. Para añadir, añade al FINAL.          */
  retos: [
    "Repte 1",  "Repte 2",  "Repte 3",  "Repte 4",  "Repte 5",
    "Repte 6",  "Repte 7",  "Repte 8",  "Repte 9",  "Repte 10",
    "Repte 11", "Repte 12", "Repte 13", "Repte 14", "Repte 15",
    "Repte 16", "Repte 17", "Repte 18", "Repte 19", "Repte 20"
  ],


  /* ---------- SUBIDA DE PRUEBAS (Google Apps Script) ----------
     Cómo conseguir la URL y la clave: apps-script/GUIA.md

     scriptUrl puede ser:
       "demo"  → MODO DE PRUEBA: la subida se simula y sale un aviso en la web.
                 Útil para probar el diseño sin backend. ⚠️ NO publicar así.
       ""      → la subida aparece desactivada ("encara no està configurada").
       "https://script.google.com/macros/s/XXXX/exec" → subida real a Drive.

     ⚠️  maxMB: no subas de 25. El archivo viaja en base64 (+33 %) y Apps
         Script empieza a fallar con peticiones de unos 50 MB.            */
  subida: {
    scriptUrl: "demo",
    clave: "",              // la misma clave que pongas en CONFIG.CLAVE de Code.gs
    maxMB: 25,              // tamaño máximo por archivo (MB)
    segundosVideoRecomendados: 30
  }
};
