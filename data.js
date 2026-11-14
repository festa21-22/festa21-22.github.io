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

   ⚠️  Fechas, horarios, lugar, agenda y actividades ya son los REALES.
       Siguen siendo de EJEMPLO (pendientes de confirmar): dirección,
       indicaciones, "qué llevar", las respuestas de la FAQ, las
       descripciones de las actividades y los retos.
   =========================================================================== */

window.FIESTA = {

  /* ---------- PORTADA ---------- */
  nombre: "FESTA",                              // título grande de la portada
  subtitulo: "21–22 NOVEMBRE",                  // línea bajo el título
  etiqueta: "Festa privada en una casa rural",  // texto pequeño sobre el título

  // Inicio y fin de la fiesta. La cuenta atrás va hasta "inicio".
  inicio: "2026-11-21T17:00:00+01:00",
  fin:    "2026-11-22T15:00:00+01:00",   // diumenge a les 15:00 marxem


  /* ---------- HORARIO DE ENTRADA ---------- */
  entrada: {
    desde: "2026-11-21T17:00:00+01:00",   // a partir de cuándo se puede llegar
    hasta: "2026-11-21T19:00:00+01:00",   // hasta cuándo
    nota: ""                              // texto opcional bajo el horario ("" = nada)
  },


  /* ---------- UBICACIÓN ---------- */
  lugar: {
    nombre: "Casa de Colònies Can Ramió",
    // ⚠️ La dirección y las indicaciones son de EJEMPLO: cámbialas por las reales.
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
     Solo los momentos CON HORA. Las actividades sin hora van en
     "actividades" (más abajo), para que no salgan repetidas.
     Un bloque por día. "fecha" (AAAA-MM-DD) sirve para que, el propio día,
     la web abra directamente la pestaña de ese día. "detalle" es opcional.  */
  agenda: [
    {
      dia: "Dissabte 21",
      fecha: "2026-11-21",
      eventos: [
        { hora: "17:00 – 19:00", titulo: "Arribada de la gent + relax", detalle: "" },
        { hora: "20:00", titulo: "Comença la festa", detalle: "" },
        { hora: "22:00", titulo: "Sopar", detalle: "Menú per decidir. Hi haurà opció vegetariana i per a intoleràncies alimentàries." }
      ]
    },
    {
      dia: "Diumenge 22",
      fecha: "2026-11-22",
      eventos: [
        { hora: "12:00", titulo: "Recollida", detalle: "" },
        { hora: "13:30", titulo: "Dinar", detalle: "" },
        { hora: "15:00", titulo: "Marxem", detalle: "" }
      ]
    }
  ],


  /* ---------- ACTIVIDADES ----------
     Tarjetas SIN hora. "icono" es uno de estos nombres (dibujos en info.js):
       "micro", "bingo", "karaoke", "pong", "dj"   (si no existe, sale una estrella)
     ⚠️ Las descripciones son de EJEMPLO: cámbialas por las vuestras
        (o déjalas en "" y la tarjeta sale solo con el nombre).             */
  actividades: [
    { nombre: "Monòleg",       icono: "micro",   descripcion: "Riure és obligatori. Aplaudir, també." },
    { nombre: "Bingo Musical", icono: "bingo",   descripcion: "Com el bingo de l'àvia, però amb cançons." },
    { nombre: "Karaoke",       icono: "karaoke", descripcion: "Afinar és opcional. Cantar, no." },
    { nombre: "Beer Pong",     icono: "pong",    descripcion: "Primer la punteria, després la dignitat." },
    { nombre: "DJ",            icono: "dj",      descripcion: "S'accepten peticions. Queixes, no." }
  ],


  /* ---------- PREGUNTAS FRECUENTES ----------
     ⚠️ Respuestas de EJEMPLO (precio, aparcamiento, camas): revísalas.     */
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


  /* ---------- RETOS (3 dificultades) ----------
     Cada persona elige UNA dificultad (definitiva) y la ruleta le sortea un
     número del 1 al 10 dentro de esa lista. En su móvil se guarda la
     DIFICULTAD y el NÚMERO (posición en la lista, empezando en 1), nunca el
     texto. Por eso:
       ✅ Puedes cambiar el TEXTO de un reto cuando quieras: quien tenga ese
          número verá el texto nuevo.
       ⚠️  NO reordenes ni borres retos una vez repartidos: cambiarías el
           reto de quien ya lo tenga.
       ⚠️  Cada lista tiene 10 retos. Si añades más, añádelos al FINAL
           (la ruleta usa el tamaño de cada lista).
     Las claves facil / medio / dificil NO se cambian (se usan en el código
     y en el nombre del archivo en Drive). El nombre visible está en
     "nombresDificultad".                                                    */
  nombresDificultad: {
    facil:   "Fàcil",
    medio:   "Mitjà",
    dificil: "Difícil"
  },

  retos: {
    // 🟢 FÀCIL
    facil: [
      "Repte fàcil 1",    // 01
      "Repte fàcil 2",    // 02
      "Repte fàcil 3",    // 03
      "Repte fàcil 4",    // 04
      "Repte fàcil 5",    // 05
      "Repte fàcil 6",    // 06
      "Repte fàcil 7",    // 07
      "Repte fàcil 8",    // 08
      "Repte fàcil 9",    // 09
      "Repte fàcil 10"    // 10
    ],

    // 🟡 MITJÀ
    medio: [
      "Repte mitjà 1",    // 01
      "Repte mitjà 2",    // 02
      "Repte mitjà 3",    // 03
      "Repte mitjà 4",    // 04
      "Repte mitjà 5",    // 05
      "Repte mitjà 6",    // 06
      "Repte mitjà 7",    // 07
      "Repte mitjà 8",    // 08
      "Repte mitjà 9",    // 09
      "Repte mitjà 10"    // 10
    ],

    // 🔴 DIFÍCIL
    dificil: [
      "Repte difícil 1",  // 01
      "Repte difícil 2",  // 02
      "Repte difícil 3",  // 03
      "Repte difícil 4",  // 04
      "Repte difícil 5",  // 05
      "Repte difícil 6",  // 06
      "Repte difícil 7",  // 07
      "Repte difícil 8",  // 08
      "Repte difícil 9",  // 09
      "Repte difícil 10"  // 10
    ]
  },


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
