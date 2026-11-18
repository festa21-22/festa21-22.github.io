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

   ⚠️  Fechas, horarios, lugar, dirección, agenda y actividades ya son
       los REALES. Siguen siendo de EJEMPLO (pendientes de confirmar):
       "qué llevar" (oculto), algunas respuestas de la FAQ, las
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
    direccion: "Camí del Molí 12, 17150 Sant Pere del Bosc, Girona",
    // Enlace de Google Maps. Si lo dejas vacío "", se genera solo a partir
    // de la dirección. Para uno exacto: Google Maps > Compartir > Copiar enlace.
    mapsUrl: "",
    indicaciones: "Els últims 2 km són de camí de terra: ves a poc a poc. Es pot aparcar a l'esplanada de l'entrada.",
    // PDF con las indicaciones para llegar (se abre en una pestaña nueva).
    // "" = no se muestra el botón.
    pdf: "assets/com-arribar.pdf"
  },


  /* ---------- QUÉ HAY QUE LLEVAR ----------
     De momento OCULTO. Para volver a mostrarlo: mostrarLlevar: true
     (la lista se conserva tal cual; ⚠️ es de EJEMPLO, revísala antes).      */
  mostrarLlevar: false,
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
     ⚠️ Pendientes de confirmar: "Puc portar algú?", "On aparco?" y
        "Puc marxar dissabte a la nit?".                                     */
  faq: [
    { pregunta: "Puc portar algú?",
      respuesta: "Pregunta-ho abans a l'organització: les places per dormir són limitades." },
    { pregunta: "Hi ha llits per a tothom?",
      respuesta: "Sí, hi ha llits per a tothom." },
    { pregunta: "On aparco?",
      respuesta: "A l'esplanada de l'entrada. Si és plena, al camí sense tallar el pas." },
    { pregunta: "Puc marxar dissabte a la nit?",
      respuesta: "Sí, però tingues en compte que no hi ha transport públic a prop. Organitza la tornada abans." }
  ],


  /* ---------- RETOS (3 dificultades) ----------
     Cada persona elige UNA dificultad (definitiva) y la ruleta le sortea un
     número del 1 al total de esa lista. En su móvil se guarda la
     DIFICULTAD y el NÚMERO (posición en la lista, empezando en 1), nunca el
     texto. Por eso:
       ✅ Puedes cambiar el TEXTO de un reto cuando quieras: quien tenga ese
          número verá el texto nuevo.
       ⚠️  NO reordenes ni borres retos una vez repartidos: cambiarías el
           reto de quien ya lo tenga.
       ⚠️  Las listas pueden tener tamaños distintos (la ruleta usa la
           longitud de cada una). Si añades más, añádelos al FINAL.
     Las claves facil / medio / dificil NO se cambian (se usan en el código
     y en el nombre del archivo en Drive). El nombre visible está en
     "nombresDificultad".                                                    */
  /* Bloqueo de la página del reto (y de la subida de pruebas): hasta esta
     hora sale una sorpresa con cuenta atrás.
     Interruptor sin tocar código: Google Sheet → hoja "Config" → B2
     FORZAR_APERTURA_RETOS = AUTO (manda esta hora) / SI (abiertos ya) /
     NO (cerrados aunque sea la hora). Si el servidor no contesta, manda
     esta hora. Los retos están aquí, en un archivo público: no es un
     secreto real, solo una sorpresa.
     Para probar antes de hora en TU navegador: reto.html?unlock
     (se recuerda; reto.html?lock lo vuelve a bloquear).                     */
  retosApertura: "2026-11-21T20:00:00+01:00",
  retosSorpresa: {
    mensaje: "Els reptes es desbloquejaran a la festa 😉",
    noEncara: "Encara no s'han obert. Torna-ho a provar d'aquí a una estona."
  },

  nombresDificultad: {
    facil:   "Fàcil",
    medio:   "Mitjà",
    dificil: "Difícil"
  },

  retos: {
    // 🟢 FÀCIL
    facil: [
      "Fes-te una foto amb una peça de roba d'una altra persona",                       // 01
      "Pregunta a 10 persones a qui votaran a les eleccions",                           // 02
      "Fes una foto de 10 peus diferents",                                              // 03
      "Fes 5 fotos de gent dormint",                                                    // 04
      "Fes una piràmide humana",                                                        // 05
      "Ensenya el teu millor pas de ball",                                              // 06
      "Intercanvia les sabates amb algú del sexe oposat",                               // 07
      "Canta la cançó «Oh me vengo» de Faraón Love Shady",                              // 08
      "Fes una foto a algú i edita-la amb IA",                                          // 09
      "Recrea una escena d'una pel·lícula amb més persones",                            // 10
      "Grava el TikTok de «Toc toc, on frappe à ma porte»",                             // 11
      "Fes un vídeo imitant un animal",                                                 // 12
      "Fes un vídeo imitant un famós",                                                  // 13
      "Fes un vídeo imitant algú de la festa",                                          // 14
      "Fes un vídeo parlant amb un altre accent",                                       // 15
      "Dobla la conversa d'altres persones: grava-les de lluny i parla tu per elles",   // 16
      "Fes un tutorial de com fer un tutorial",                                         // 17
      "Grava un tutorial de com seure en una cadira, amb els errors més comuns"         // 18
    ],

    // 🟡 MITJÀ
    medio: [
      "Pinta-li la cara a algú (hi ha retoladors a la casa)",                           // 01
      "Maquilla algú",                                                                  // 02
      "Fes una esmaixada a la cistella",                                                // 03
      "Fes-te un pico amb algú",                                                        // 04
      "Desperta algú fent molt de soroll",                                              // 05
      "Fes una conga de 30 persones",                                                   // 06
      "Aconsegueix que dues persones facin una petita coreografia de ball amb tu",      // 07
      "Organitza un casament entre dues persones (s'han de fer un petó)",               // 08
      "Fes-te una foto amb 4 persones que no es coneguin entre elles",                  // 09
      "Troba l'aneguet de goma amagat a la casa",                                       // 10
      "Fes un freestyle"                                                                // 11
    ],

    // 🔴 DIFÍCIL
    dificil: [
      "Banya't al riu (encara que sigui una mica)",                                     // 01
      "Fes-te un pico amb algú del sexe oposat",                                        // 02
      "Fes veure que et desmaies per l'alcohol",                                        // 03
      "Escala un arbre",                                                               // 04
      "Fes-te una foto amb un animal",                                                  // 05
      "Lliga algú a alguna cosa amb una brida (hi ha brides a la casa)",                // 06
      "Canta el Cara al Sol amb la mà al pit",                                          // 07
      "Dutxa't amb roba",                                                               // 08
      "Truca a la teva mare o al teu pare i digues-li que estàs embarassada (o que has deixat embarassada una noia, si ets noi)", // 09
      "Penja a Instagram una història amb la foto d'un peu i deixa-la 24 hores",        // 10
      "Penja una història dient que deixes les xarxes (i deixa-la 24 hores)",           // 11
      "Truca a la teva mare o al teu pare i digues-li que has canviat d'orientació sexual", // 12
      "Troba la creu del bosc"                                                          // 13
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
    scriptUrl: "https://script.google.com/macros/s/AKfycbxTOIWzhmF1BFrRkyNneER2VqngtOqhzNN5qCutxD4jW6kCY1k1-3IUGcEQkQHoRhm_BA/exec",
    clave: "daniputovago",  // la misma clave que pongas en CONFIG.CLAVE de Code.gs
    maxMB: 25,              // tamaño máximo por archivo (MB)
    segundosVideoRecomendados: 30
  },


  /* ---------- MATCH DE LA FESTA (match.html) ----------
     Usa el MISMO Apps Script y la misma clave que "subida" (arriba).
     Toda la lógica y los datos están en el servidor (apps-script/Match.gs);
     aquí solo van los textos y cada cuánto se consulta si hay matches nuevos.

     ⚠️  segundosConsulta: no bajes de 45. Cada consulta es una ejecución de
         Apps Script; con ~50 móviles abiertos a la vez se nota en las cuotas.
         (El código no deja bajar de 45 aunque pongas menos.)
     Para probar sin backend en tu ordenador: http://localhost:8080/match.html?demo  */
  match: {
    // Hasta esta hora el Match sale como "Sorpresa" con cuenta atrás.
    // ⚠️ Debe coincidir con CONFIG_MATCH.APERTURA de Match.gs: aquí solo
    //    sirve para la cuenta atrás; quien abre o no es el SERVIDOR (y su
    //    hoja "Config" → FORZAR_APERTURA = AUTO / SI / NO).
    apertura: "2026-11-21T20:00:00+01:00",

    // Textos mientras está cerrado (no dicen qué es)
    sorpresa: {
      menu: "Sorpresa",
      titulo: "Sorpresa",
      mensaje: "Aquí hi ha alguna cosa amagada. S'obrirà quan comenci la festa.",
      noEncara: "Encara no s'ha obert. Torna-ho a provar d'aquí a una estona."
    },

    // Textos cuando ya está abierto
    menu: "Match",
    titulo: "Match de la festa",
    subtitulo: "Marca qui t'agrada. Si és mutu, és un match.",

    // Likes recibidos: solo se ve el número total, nunca de quién. Se
    // actualiza al entrar o recargar la página (no en directo).
    recibidos: {
      titulo: "Likes rebuts",
      uno: "like",                              // detrás del número: "♥ 1 like"
      varios: "likes",                          // "♥ 5 likes"
      cero: "De moment, misteri absolut 😏",    // con 0 no se enseña el número
      nota: "Ningú no sap de qui són. El número s'actualitza quan tornes a obrir la pàgina."
    },

    segundosConsulta: 45,
    // Texto "Com funciona": un párrafo por línea
    explicacion: [
      "Apunta't amb el teu nom i cognoms i un PIN de 4 xifres que t'inventis. Només surts a la llista si t'hi apuntes.",
      "Marca les persones que t'agradin. Pots desmarcar-les quan vulguis.",
      "Si dues persones es marquen mútuament, és un match i totes dues ho veuran.",
      "Si marques algú i no et marca, ningú no ho sabrà mai: els likes no recíprocs no es mostren a ningú.",
      "Veuràs quantes persones t'han marcat en total, però mai qui.",
      "Et pots donar de baixa quan vulguis: s'esborra el teu compte i tots els teus likes."
    ]
  }
};
