# FESTA 21–22 novembre

Web de una fiesta privada (~50 personas) en una casa rural. Estática (HTML +
CSS + JavaScript sin frameworks ni build), publicada en GitHub Pages. La web
está en **catalán**.

- **Web:** <https://festa21-22.github.io>
- **Repositorio:** <https://github.com/festa21-22/festa21-22.github.io>

- **`index.html`** — portada con cuenta atrás, información, agenda y FAQ.
- **`reto.html`** — reto personal (tragaperras) y subida de la foto/vídeo de la prueba.

## Estructura

```
index.html          Página de información
reto.html           Página del reto + formulario de subida
data.js             ⭐ TODOS los datos editables (textos, horarios, retos, backend)
css/styles.css      Estilos (mobile-first)
js/comun.js         Compartido: utilidades, decoración, menú, animaciones de scroll
js/info.js          Solo index.html: cuenta atrás, info, agenda, FAQ
js/storage.js       localStorage seguro (try/catch)
js/reto.js          Sorteo y animación del reto
js/upload.js        Formulario de subida a Apps Script
apps-script/        Backend de Google Apps Script (Code.gs + GUIA.md)
assets/             Favicon e imágenes
serve.ps1           Servidor local para probar (Windows, sin instalar nada)
```

## Editar los datos

Todo lo que se puede cambiar está en **[`data.js`](data.js)**, comentado:
nombre, fechas, horario de entrada, ubicación, qué llevar, agenda, FAQ, retos
y configuración de la subida. No hace falta tocar nada más.

Reglas importantes:

- **Fechas** en formato `"2026-11-21T17:00:00+01:00"` (el `+01:00` es la hora de invierno de España).
- **Retos:** hay 3 listas (`facil`, `medio`, `dificil`) de 10 retos. Cada persona
  elige una dificultad (definitiva) y se le guarda la **dificultad y el número**
  de su reto, no el texto. Puedes cambiar los textos cuando quieras, pero
  **no reordenes ni borres retos** una vez repartidos; para añadir, al final.
- **Subida:** `scriptUrl: "demo"` simula la subida (sale un aviso azul).
  **Antes de la fiesta** pon la URL real del Apps Script siguiendo
  [`apps-script/GUIA.md`](apps-script/GUIA.md).
- Si después de editar la web sale en blanco, abre la consola (F12): casi
  siempre es una coma o una comilla que falta en `data.js`.

## Probar en local

Hace falta un servidor (no abrir el HTML con doble clic), para que todo se
cargue igual que en Internet.

**Windows** (sin instalar nada), desde la carpeta del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Abre <http://localhost:8080>. `Ctrl+C` para parar.

**Mac / Linux** (Python viene instalado):

```bash
python3 -m http.server 8080
```

**Probar como en el móvil:** en Chrome, F12 → icono de móvil (Ctrl+Shift+M).
Para probar en un móvil de verdad, lo más fácil es publicarlo en GitHub Pages.

**Volver a sortear el reto (solo para probar):** abre `reto.html?reset`
(p. ej. <http://localhost:8080/reto.html?reset>): borra el reto guardado y
vuelven a salir los botones de dificultad. Desde la interfaz no hay botón para
hacerlo, a propósito.

## Publicar en GitHub Pages

El repositorio está en la organización `festa21-22` y se llama
`festa21-22.github.io`. Con ese nombre especial, GitHub Pages lo sirve en la
raíz del dominio: **<https://festa21-22.github.io>** (sin subcarpeta).

1. Primera vez (ya hecho): el remoto `origin` apunta a
   `https://github.com/festa21-22/festa21-22.github.io.git`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**
   → Branch: `main`, carpeta `/ (root)` → **Save**.
   Con plan gratuito el repositorio debe ser **público** para usar Pages.
3. En 1–2 minutos estará en <https://festa21-22.github.io>.
   Cada `git push` a `main` la actualiza sola.

La web lleva `noindex` para que Google no la muestre en búsquedas, pero el
enlace es accesible para quien lo tenga: compártelo solo por el grupo.

## Trabajar entre dos

- Añade a tu compañero a la organización `festa21-22` (o al repositorio en
  **Settings → Collaborators and teams**). Él descarga el proyecto con:
  `git clone https://github.com/festa21-22/festa21-22.github.io.git`
- Antes de empezar a trabajar: `git pull`. Al terminar: `git add`, `git commit`, `git push`.
- Si los dos tocáis lo mismo a la vez, git pedirá resolver el conflicto: avisaos
  de quién está editando qué (sobre todo `data.js`).
- Convenciones del código: ver [`CLAUDE.md`](CLAUDE.md).
