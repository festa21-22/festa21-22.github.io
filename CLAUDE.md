# CLAUDE.md — Web FESTA 21–22 novembre

Contexto para cualquier Claude que trabaje en este repo. Lo desarrollan dos
estudiantes (de telecomunicaciones), cada uno desde su casa, vía GitHub.
Quieren **aprender**: explica brevemente las decisiones técnicas importantes,
sin enrollarte.

## Qué es

Web estática de una fiesta privada (~50 personas) en una casa rural, el
21–22 de noviembre de 2026. Casi todos la abren desde el **móvil** (mobile-first).
Publicada en **GitHub Pages** en <https://festa21-22.github.io> (repo
`festa21-22/festa21-22.github.io`, se sirve en la raíz del dominio); subida de
archivos a Google Drive con **Google Apps Script**.

## Reglas del proyecto (no negociables)

- **HTML + CSS + JavaScript vanilla.** Sin frameworks, sin build, sin npm,
  sin dependencias que instalar. Solo Google Fonts como recurso externo.
- **Todos los datos editables en `data.js`** (`window.FIESTA`). No metas textos
  de contenido, fechas o retos en el HTML/JS: léelos de `data.js`.
- **Idioma:** todo texto visible para los invitados en **catalán**
  (HTML, mensajes de JS, `data.js`). Comentarios del código y documentación en **castellano**.
- **Estética:** casa rural de noche con guirnaldas de luces cálidas. Tono claro
  y útil: **nada de frases de relleno o chistes** que no hayan pedido.
- El nombre de la fiesta es **`FESTA`** (todo mayúsculas).

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Portada (casa SVG, cuenta atrás), información, agenda (solo momentos con hora), activitats (tarjetas sin hora), FAQ |
| `reto.html` | Elección de dificultad + reto personal (tragaperras) + formulario de subida |
| `match.html` | «Match de la festa»: registro con nombre + PIN, lista de participantes, likes, matches mutuos |
| `js/match.js` | Interfaz del Match. No decide nada: pinta lo que devuelve el servidor |
| `js/match-demo.js` | Servidor simulado (localStorage) con el mismo contrato que `Match.gs`. Solo con `scriptUrl:"demo"` o `match.html?demo` en localhost |
| `apps-script/Match.gs` | Backend del Match (segundo archivo del mismo proyecto de Apps Script; Sheet como BD) |
| `data.js` | Datos editables. Cargar SIEMPRE primero |
| `js/comun.js` | `window.Comun`: utilidades (`$`, `el`, formato de fechas `ca-ES` en `Europe/Madrid`), guirnaldas, estrellas, `IntersectionObserver` (aparición y menú activo), `irAlAncla()` |
| `js/info.js` | Solo `index.html` |
| `js/storage.js` | `window.Almacen`: `leer`/`guardar`/`borrar`/`disponible`, todo en try/catch |
| `js/reto.js` | Dificultad + confirmación + sorteo + animación + cambio único de reto. Expone `window.MiReto` (`dificultad`, `nombreDificultad`, `numero`, `etiqueta`, `texto`, `cambiado`, `revelado`) y emite los eventos `reto:revelado` y `reto:cambiando` |
| `js/upload.js` | Formulario, validación, base64, XHR con progreso |
| `apps-script/Code.gs` | Backend (se copia a mano en script.google.com, NO se despliega desde aquí) |
| `apps-script/GUIA.md` | Pasos para desplegar el backend |
| `css/styles.css` | Un solo archivo, secciones numeradas |

Orden de scripts (todos con `defer`): `data.js` → `storage.js` → `comun.js` → script(s) de la página.

## Lógica que no hay que romper

- **Reto con 3 dificultades:** `FIESTA.retos = {facil, medio, dificil}`, listas
  de **tamaño libre** (ahora 18 / 11 / 13; nada de números fijos: todo usa
  `lista(dif).length`; nombres visibles en `FIESTA.nombresDificultad`). Primera visita:
  3 botones → confirmación (`<dialog>`, fallback `confirm()`) → ruleta 1..N de
  esa lista → número + texto + etiqueta de color (verde/amarillo/rojo).
  La elección es **definitiva**: se guarda en localStorage
  `fiesta2122:reto-v3 = '{"dificultad":"medio","numero":7}'` (número 1-based,
  **nunca el texto**), **antes** de la animación (recargar no re-sortea ni deja
  cambiar de dificultad). `fiesta2122:revelado-v3 = "1"` tras ver la animación;
  después se muestra el resultado directamente, sin botones ni ruleta.
  Las claves antiguas (`fiesta2122:reto`/`revelado` y `-v2`) se **borran** al
  entrar en `reto.html` (reinicio general del 15-11-2026: todo el mundo vuelve
  a elegir). Para otro reinicio general: subir a `-v4` y añadir las `-v3` a
  `CLAVES_ANTIGUAS` en `reto.js`.
- **Retos bloqueados hasta la fiesta:** hasta `FIESTA.retosApertura`
  (sábado 21, 20:00) `reto.html` muestra una sorpresa con «?», cuenta atrás y
  `FIESTA.retosSorpresa.mensaje`; no se ve la elección, ni ningún reto, ni la
  subida (`#subir` viene `hidden` en el HTML y lo enseña `iniciar()`). Si la
  página está abierta a la hora, se desbloquea sola con animación («?» → dado
  + confeti); si llega en segundo plano, espera a que vuelva a estar visible.
  **Interruptor** en la Sheet: `Config!B2` `FORZAR_APERTURA_RETOS` =
  `AUTO` (manda `retosApertura`, medida con la hora del servidor) | `SI` | `NO`.
  La web lo pregunta con la acción `retos` del Apps Script
  (`Comun.preguntarServidor`, timeout 8 s) → `{ok, modo, ahora}`; responde
  aunque el Match esté cerrado. Solo se pregunta mientras está bloqueado
  (al cargar, cada 5 min, al llegar a 0 y luego cada minuto si `NO`; solo
  visible). **Si el servidor no contesta o no entiende `retos`, manda la hora
  de `data.js`** (un fallo de red nunca deja los retos cerrados). Mientras
  contesta: sorpresa si por la hora del móvil aún no toca; si ya toca,
  «Carregant…» (no se enseñan retos hasta saber que no está en `NO`).
  No es seguridad (los retos están en `data.js`, público): es una sorpresa.
  Pruebas: `reto.html?unlock` desbloquea
  ese navegador (`fiesta2122:retos-unlock = "1"`, se recuerda; no pregunta al
  servidor); `reto.html?lock` lo quita. Ambos se quitan de la URL como `?reset`.
- **Cambio de reto (una sola vez):** bajo el resultado, botón «Canviar repte
  (només 1 cop)» → confirmación → ruleta otra vez en la **misma dificultad**,
  nunca al mismo número (`aleatorioDistinto`). Se guarda en la misma clave,
  antes de la animación: `{"dificultad":"medio","numero":3,"cambiado":true,"anterior":7}`,
  y se borra `revelado-v3` (si recargan a mitad, sale «Descobreix» con el
  número nuevo). Con `cambiado: true` el botón desaparece y sale «Ja has fet
  servir el canvi de repte.». Durante el giro se emite `reto:cambiando` y el
  formulario no muestra ni envía el número viejo.
  **No debe existir forma de re-sortear desde la interfaz.** Única excepción,
  oculta y solo para pruebas: abrir `reto.html?reset` borra el reto guardado
  **y el cambio usado** (van en la misma clave) y quita `?reset` de la URL con
  `history.replaceState` (también borra la marca «una cuenta por móvil» del
  Match). Ni el orden de cada
  lista ni las claves `facil/medio/dificil` se cambian una vez repartidos.
- Todo acceso a localStorage pasa por `Almacen` (try/catch). Si no hay
  almacenamiento, la web sigue funcionando y avisa.
- El formulario no muestra el número de reto hasta que `MiReto.revelado` es true.
- **Subida:** POST con `Content-Type: text/plain;charset=utf-8` (evita el
  preflight CORS que Apps Script no soporta), cuerpo JSON
  `{clave, nombre, dificultad, reto, nombreArchivo, tipo, datos(base64)}`
  (`dificultad` = `facil|medio|dificil`; otra cosa → error `datos`), respuesta
  `{ok, archivo}` o `{ok:false, error:"clave|datos|tipo|grande|servidor"}`.
  **Nunca añadir listeners a `xhr.upload`** (p. ej. `upload.onprogress`): fuerzan
  preflight CORS aunque sea `text/plain` y la subida a Apps Script falla
  (comprobado). Por eso la barra de progreso es indeterminada. Límite 25 MB (base64 +33 %; Apps
  Script falla hacia 50 MB). Si cambias el contrato, cambia `Code.gs` y `upload.js` a la vez.
- `scriptUrl: "demo"` simula la subida. No publicar la versión final así.
- Archivos en Drive: `Nombre_Dificil_Reto07_yyyy-MM-dd_HH-mm-ss.ext`
  (dificultad sin acentos: `Facil`, `Mitja`, `Dificil`).

## Match de la festa — reglas de privacidad (no negociables)

Maneja información sensible (a quién le gusta quién). Guía de despliegue y
lista de pruebas: `apps-script/GUIA.md` (sección «Match de la festa»).

- **Apertura («Sorpresa»):** hasta `CONFIG_MATCH.APERTURA` (sábado 21, 20:00)
  el servidor rechaza **todas** las acciones con `cerrado`, usando **su** hora.
  Interruptor en la hoja `Config` de la Sheet: B1 `FORZAR_APERTURA` =
  `AUTO` (manda la hora) | `SI` | `NO`. Única acción permitida cerrada:
  `apertura` → `{ok, abierto, apertura, ahora}` (`ahora` = hora del servidor,
  el cliente corrige con ella la cuenta atrás). `data.js` → `match.apertura`
  debe coincidir, pero solo se usa para pintar. Mientras está cerrado, la web
  no dice qué es: menú «Sorpresa» con «?», títulos genéricos en el HTML
  (match.js pone los de verdad al abrir; `comun.js` → `Comun.menuMatch`).
  Consultas de apertura: cada 5 min, al llegar a 0 (+ 0–3 s al azar) y luego
  cada minuto; siempre solo con la página visible.
- **Toda la lógica sensible en el servidor** (`Match.gs`): comprobar PIN,
  guardar likes, calcular matches, hora de revelación, bloqueo, validación.
  El cliente nunca calcula matches ni recibe datos ajenos.
- **El servidor solo devuelve** nombres de participantes (`{id, nombre}`), los
  likes **propios**, los matches **propios** y el **número** de likes recibidos
  propio. **Nunca** quién ha dado like a alguien si no es recíproco, ni hashes,
  ni datos (ni números) de otras cuentas. Que nada ajeno sea visible con F12.
- **Likes recibidos:** solo el total, calculado en `Match.gs`. `estado` lo
  incluye (`recibidos`) **solo si la petición lleva `recibidos: true`**, y
  `match.js` solo lo pide en la primera consulta (al entrar o recargar), nunca
  en la periódica: si subiera en directo, por el momento se podría deducir
  quién fue. Con 0 no se muestra el número sino `match.recibidos.cero`.
- Antes de `REVELACION`, un like recíproco responde **igual** que uno no
  recíproco (`match: null`) y `estado` devuelve `matches: []`.
- **PIN:** 4 cifras; en la Sheet solo `SHA-256(pimienta + ":" + salt + ":" + PIN)`.
  Salt aleatorio por usuario; pimienta en Propiedades del script
  (`MATCH_PIMIENTA`), nunca en la Sheet ni en el repo.
- **Sesión:** token aleatorio que da el servidor; en la Sheet se guarda su
  SHA-256. En el móvil (`fiesta2122:match-sesion`) solo `{id, token, nombre}`,
  **nunca el PIN**. Entrar de nuevo genera token nuevo (cierra otras sesiones).
- **Una cuenta por móvil** (solo cliente, es un freno y no seguridad): al
  registrarse, `match.js` guarda `fiesta2122:match-compte = {id, nombre}`
  (vía `Almacen`, aunque no se marque «Recorda'm»). Con la marca, «Apunta-m'hi»
  no cambia de pestaña: queda en «Ja estic apuntat» con el nombre puesto y el
  aviso «Ja tens un compte en aquest mòbil…». Se borra al darse de baja **de
  esa misma cuenta** (si un amigo entra con la suya y se da de baja, la marca
  sigue) y con `match.html?reset` o `reto.html?reset` (se quitan de la URL;
  `?demo` se conserva). Nombre ya registrado → «Aquest nom ja està registrat.
  Si no has estat tu, avisa ara mateix els organitzadors.»
- **Fuerza bruta:** 5 PIN fallidos por nombre → bloqueado 15 min, incluso con
  el PIN correcto. Nombre inexistente y PIN mal dan el mismo error (`credenciales`).
- **Nombres:** se comparan normalizados (minúsculas, sin acentos, espacios
  colapsados). 3–40 caracteres, empiezan por letra (evita inyección de
  fórmulas en Sheets: nada que empiece por `= + - @`). Columnas en formato texto.
- Todas las peticiones del Match pasan por `LockService` (registros con el mismo
  nombre o likes cruzados simultáneos).
- **Consulta periódica:** cada 45 s como mínimo (`match.segundosConsulta`, el
  código no deja bajar) y **solo con la página visible** (Page Visibility API).
  Cada match anima una sola vez: el servidor marca `match_vist` al entregarlo.
- **Baja:** borra la fila del participante y todos los likes dados y recibidos.
  Los matches no se guardan: se calculan con likes recíprocos, así que
  desaparecen con ellos. Borrado manual de cuentas falsas: `apps-script/GUIA.md`
  → «Tareas de organizadores» (`borrarCuentaManual` o a mano en la Sheet).
- La hoja Likes guarda también `de_nom` y `a_nom` (columnas E-F, solo para que
  los organizadores lean la Sheet; el código usa los ids de A-D por posición).
- Los organizadores pueden ver la Sheet (son sus dueños). Se decidió no
  mencionarlo en el texto «Com funciona».
- **Contrato** (POST text/plain, mismo `doPost` y `clave` que la subida; con
  `accion` va al Match): `registro`/`entrar` `{nombre, pin}` → `{ok, id, token, nombre}`;
  `estado`/`like`/`quitarLike`/`salir`/`baja` con `{id, token}` (+ `a` = id destino).
  `estado` (+ `recibidos: true` opcional) → `{yo, participantes, likes, matches, nuevos, revelado, revelacion, maxLikes}`
  (+ `recibidos` = número, solo si se pidió);
  `like` → `{ok, match: {id, nombre} | null}`. Errores: `nombre`, `pin`,
  `nombre_ocupado`, `credenciales` (+`quedan`), `bloqueado` (+`minutos`),
  `sesion`, `no_existe`, `limite`, `lleno`, `ocupado`, `accion`, `datos`, `clave`,
  `cerrado` (+`apertura`, `ahora`). Acción aparte para `reto.html`:
  `retos` → `{ok, modo: AUTO|SI|NO, ahora}` (Config!B2; no es del Match).
  Si cambias el contrato, cambia `Match.gs`, `match.js` y `match-demo.js` a la vez.

## Estilo de código

- **JS:** cada archivo es una IIFE con `'use strict'`, `var` y funciones clásicas
  (compatibilidad amplia, sin transpilar). Nombres en castellano (`pintarAgenda`,
  `mostrarError`). Inserta texto con `textContent`/`el()`, **nunca `innerHTML`**
  con datos.
- **CSS:** mobile-first (estilos base para ~375 px; `@media (min-width)` para ampliar).
  Colores y medidas como variables en `:root`. Clases en castellano tipo BEM
  (`.tarjeta__icono`, `.btn--luz`). Respetar `prefers-reduced-motion`.
  Botones táctiles ≥ 48 px. Inputs a 16 px (evita zoom en iOS).
- **HTML:** semántico y accesible (`aria-*`, `<details>`, `role="tablist"`, etc.).
  El menú inferior está **duplicado** en `index.html`, `reto.html` y `match.html`:
  si cambias uno, cambia los otros.
- Comentarios breves que expliquen el **porqué**, en castellano.

## Probar

- Servidor local en Windows: `powershell -ExecutionPolicy Bypass -File serve.ps1`
  → http://localhost:8080 (en Claude Code: `.claude/launch.json`, nombre `web-fiesta`).
  Mac/Linux: `python3 -m http.server 8080`.
- Probar siempre en vista móvil (375×812) y comprobar la consola sin errores.
- Re-sortear para pruebas: abrir `reto.html?reset` (o `localStorage.clear()` en la consola).
- Retos antes de la hora: `reto.html?unlock` (solo ese navegador); `?lock` para volver
  a verlo bloqueado. Se combinan: `reto.html?reset&unlock`.
- En el panel del navegador de Claude Code, si está **oculto**, Chrome no pinta
  fotogramas: no se disparan `requestAnimationFrame` ni el evento `close` de
  `<dialog>` (los diálogos parecen no hacer nada). No es un fallo de la web.
- Match sin backend: `http://localhost:8080/match.html?demo` (participantes falsos;
  `&revelacion=2` simula revelación en 2 min; `&apertura=1` Sorpresa que se abre en 1 min;
  `&reset` quita la marca de cuenta para poder registrar otra). Con backend real: lista de pruebas en `apps-script/GUIA.md`.

## Git

- Rama `main`, publicada por GitHub Pages. Hacer `git pull` antes de empezar.
- Mensajes de commit en castellano, claros, con lista de cambios.
- Saltos de línea LF (`.gitattributes`).
- En PowerShell 5.1, las comillas dobles dentro de `git commit -m` rompen el
  mensaje: escríbelo en un archivo y usa `git commit -F archivo`.
