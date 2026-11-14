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

- **Reto con 3 dificultades:** `FIESTA.retos = {facil, medio, dificil}`, 10 retos
  cada una (nombres visibles en `FIESTA.nombresDificultad`). Primera visita:
  3 botones → confirmación (`<dialog>`, fallback `confirm()`) → ruleta 1..10 de
  esa lista → número + texto + etiqueta de color (verde/amarillo/rojo).
  La elección es **definitiva**: se guarda en localStorage
  `fiesta2122:reto-v2 = '{"dificultad":"medio","numero":7}'` (número 1-based,
  **nunca el texto**), **antes** de la animación (recargar no re-sortea ni deja
  cambiar de dificultad). `fiesta2122:revelado-v2 = "1"` tras ver la animación;
  después se muestra el resultado directamente, sin botones ni ruleta.
  Las claves antiguas (`fiesta2122:reto`/`revelado`) se ignoran.
- **Cambio de reto (una sola vez):** bajo el resultado, botón «Canviar repte
  (només 1 cop)» → confirmación → ruleta otra vez en la **misma dificultad**,
  nunca al mismo número (`aleatorioDistinto`). Se guarda en la misma clave,
  antes de la animación: `{"dificultad":"medio","numero":3,"cambiado":true,"anterior":7}`,
  y se borra `revelado-v2` (si recargan a mitad, sale «Descobreix» con el
  número nuevo). Con `cambiado: true` el botón desaparece y sale «Ja has fet
  servir el canvi de repte.». Durante el giro se emite `reto:cambiando` y el
  formulario no muestra ni envía el número viejo.
  **No debe existir forma de re-sortear desde la interfaz.** Única excepción,
  oculta y solo para pruebas: abrir `reto.html?reset` borra el reto guardado
  **y el cambio usado** (van en la misma clave) y quita `?reset` de la URL con
  `history.replaceState`. Ni el orden de cada
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
  El menú inferior está **duplicado** en `index.html` y `reto.html`: si cambias
  uno, cambia el otro.
- Comentarios breves que expliquen el **porqué**, en castellano.

## Probar

- Servidor local en Windows: `powershell -ExecutionPolicy Bypass -File serve.ps1`
  → http://localhost:8080 (en Claude Code: `.claude/launch.json`, nombre `web-fiesta`).
  Mac/Linux: `python3 -m http.server 8080`.
- Probar siempre en vista móvil (375×812) y comprobar la consola sin errores.
- Re-sortear para pruebas: abrir `reto.html?reset` (o `localStorage.clear()` en la consola).

## Git

- Rama `main`, publicada por GitHub Pages. Hacer `git pull` antes de empezar.
- Mensajes de commit en castellano, claros, con lista de cambios.
- Saltos de línea LF (`.gitattributes`).
- En PowerShell 5.1, las comillas dobles dentro de `git commit -m` rompen el
  mensaje: escríbelo en un archivo y usa `git commit -F archivo`.
