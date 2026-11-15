# Guía: backend de subida con Google Apps Script

Los invitados suben fotos/vídeos desde `reto.html` → el navegador los envía a
un **Google Apps Script** → el script los guarda en una **carpeta privada de
Google Drive**. Solo los organizadores ven esa carpeta.

```
Móvil del invitado ──POST (JSON en text/plain)──▶ Apps Script (se ejecuta como tú) ──▶ Carpeta de Drive privada
```

Tiempo estimado: 10 minutos. Hazlo con la cuenta de Google **donde quieras
guardar los archivos** (ocupan espacio de esa cuenta: 15 GB gratis).

---

## 1. Crear la carpeta de Drive

1. Entra en [drive.google.com](https://drive.google.com) → **Nuevo → Carpeta** → por ejemplo `Proves FESTA`.
2. Ábrela y copia el **ID** de la URL (lo que va después de `/folders/`):
   ```
   https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
                                          └──────────── ID ────────────┘
   ```
3. **No la compartas públicamente.** Si quieres que tu compañero la vea:
   botón **Compartir** → añade su email (solo él).

## 2. Crear el proyecto de Apps Script

1. Entra en [script.google.com](https://script.google.com) → **Nuevo proyecto**.
2. Arriba a la izquierda cambia el nombre (“Proyecto sin título”) por `Pujada FESTA`.
3. Borra todo lo que hay en `Código.gs` y pega el contenido de [`Code.gs`](Code.gs).
4. Rellena `CONFIG` al principio del archivo:
   - `CARPETA_ID`: el ID del paso 1.
   - `CLAVE`: una palabra inventada, p. ej. `roure-2026-xk7`.
   - `MAX_MB`: deja `25` (debe coincidir con `maxMB` de `data.js`).
5. Guarda (icono del disquete o `Ctrl+S`).

## 3. Dar permisos (solo la primera vez)

1. En el desplegable de funciones de arriba elige **`probarConfiguracion`** → **Ejecutar**.
2. Google pedirá permisos: **Revisar permisos** → elige tu cuenta.
3. Saldrá *“Google no ha verificado esta aplicación”*. Es normal: la app es
   tuya. Pulsa **Configuración avanzada → Ir a Pujada FESTA (no seguro)** → **Permitir**.
4. En el registro de abajo debe salir:
   `OK. Los archivos se guardarán en: "Proves FESTA"`.
   Si sale un error, el `CARPETA_ID` está mal.

## 4. Desplegar como aplicación web

1. Arriba a la derecha: **Implementar → Nueva implementación**.
2. En el engranaje ⚙️ de “Seleccionar tipo” elige **Aplicación web**.
3. Configura:
   | Campo | Valor |
   |---|---|
   | Descripción | `v1` |
   | Ejecutar como | **Yo** (tu cuenta) |
   | Quién tiene acceso | **Cualquier usuario** |
4. **Implementar** → copia la **URL de la aplicación web** (termina en `/exec`).

> **¿Por qué “Cualquier usuario” si la carpeta es privada?**
> Ese ajuste solo dice *quién puede llamar al script* (los invitados, sin
> iniciar sesión). El script escribe en Drive **con tu cuenta**, y los
> invitados nunca reciben acceso a la carpeta: solo reciben `{"ok":true}`.

## 5. Conectar la web

1. Abre la URL `/exec` en el navegador. Debe mostrar:
   `{"ok":true,"mensaje":"Servei de pujada actiu"}`
2. En [`data.js`](../data.js), sección `subida`:
   ```js
   subida: {
     scriptUrl: "https://script.google.com/macros/s/XXXXXXXX/exec",
     clave: "roure-2026-xk7",   // la misma que CONFIG.CLAVE
     maxMB: 25,
     segundosVideoRecomendados: 30
   }
   ```
3. Abre `reto.html`, sube una foto de prueba y comprueba que aparece en la carpeta
   con un nombre como `Nombre_Dificil_Reto07_2026-11-21_23-15-42.jpg`.
   El aviso azul de “Mode de prova” debe haber desaparecido.

## 6. Si cambias `Code.gs` más adelante

Guardar **no** actualiza la web: hay que publicar una versión nueva.
**Implementar → Gestionar implementaciones → ✏️ Editar → Versión: Nueva versión → Implementar.**
Así **la URL no cambia**. (Si haces “Nueva implementación”, obtienes una URL
distinta y habría que cambiarla en `data.js`.)

---

## Problemas frecuentes

| Lo que ves en la web | Causa probable | Solución |
|---|---|---|
| “No s'ha pogut connectar amb el servidor” | Acceso no es “Cualquier usuario”, o URL mal copiada | Revisa el paso 4; la URL debe terminar en `/exec` (no `/dev`) |
| “Clau incorrecta” | `clave` de `data.js` ≠ `CONFIG.CLAVE` | Iguálalas (y publica nueva versión si cambiaste `Code.gs`) |
| “Hi ha hagut un error en desar l'arxiu” | `CARPETA_ID` mal o sin permisos | Ejecuta `probarConfiguracion` y mira **Ejecuciones** en el menú izquierdo |
| “El servidor ha respost de manera inesperada” | El script ha lanzado un error no controlado o Google ha devuelto una página HTML | Mira **Ejecuciones** para ver el error |
| Cambié `Code.gs` y no hace caso | No se publicó versión nueva | Paso 6 |
| “Falten dades al formulari” al subir | `Code.gs` y la web no coinciden (p. ej. la web envía `dificultad` y el script desplegado es antiguo, o al revés) | Copia el `Code.gs` actual y publica versión nueva (paso 6) |

## Límites a tener en cuenta

- **Tamaño:** el archivo viaja en base64 (+33 %). Con `maxMB: 25` la petición
  ronda los 34 MB; Apps Script empieza a fallar cerca de 50 MB. No subas el límite.
- **Tiempo:** cada ejecución tiene un máximo de 6 minutos (de sobra).
- **Concurrencia:** unas 30 ejecuciones simultáneas por cuenta. Con 50
  invitados sin problema, aunque suban todos a la vez a la 1 de la mañana.
- **Seguridad:** la URL y la clave están en `data.js`, que es público en
  GitHub. Cualquiera que lea el código podría subir archivos a la carpeta
  (no verlos ni borrarlos). Para una fiesta privada es aceptable; si algún
  día molesta, cambia la clave y publica nueva versión.

---

# Match de la festa (`match.html`)

Usa **el mismo proyecto de Apps Script** (misma URL `/exec` y misma clave) y
una **Google Sheet** como base de datos.

```
Móvil ──POST {accion:"like",...}──▶ doPost (Code.gs) ──▶ atenderMatch (Match.gs) ──▶ Google Sheet privada
                                                         (comprueba token, guarda,
                                                          calcula matches)
```

## Privacidad: qué ve cada uno

| Quién | Qué ve |
|---|---|
| Invitado (web, también con F12) | Nombres de participantes, **sus** likes, **sus** matches. Nunca quién le ha marcado si no es mutuo. |
| Organizadores (dueños de la Sheet) | Todo: participantes y likes (por id). |
| Nadie | El PIN: solo se guarda `SHA-256(pimienta + salt + PIN)`. |

La **pimienta** es un secreto aleatorio que se guarda en *Configuración del
proyecto → Propiedades del script* (`MATCH_PIMIENTA`), **no** en la Sheet. Un
PIN de 4 cifras solo tiene 10.000 combinaciones: sin pimienta, quien tuviera la
Sheet podría probarlas todas contra el hash en un segundo. ⚠️ **No borres ni
cambies esa propiedad**: todos los PIN dejarían de funcionar.

## 1. Crear la Google Sheet

1. Con la **misma cuenta** que el Apps Script: [sheets.new](https://sheets.new).
2. Ponle nombre, p. ej. `Match FESTA`. **No la compartas** (como mucho, con tu compañero).
3. Copia el **ID** de la URL:
   ```
   https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/edit
                                          └──────────── ID ────────────┘
   ```

## 2. Añadir `Match.gs` al proyecto

1. Abre el proyecto `Pujada FESTA` en [script.google.com](https://script.google.com).
2. Sustituye todo `Código.gs` por el [`Code.gs`](Code.gs) actual (tiene 3 líneas
   nuevas que pasan las peticiones del Match a `Match.gs`). **Conserva tu
   `CARPETA_ID` y tu `CLAVE`.**
3. Junto a "Archivos", pulsa **+ → Secuencia de comandos** → nómbralo `Match`
   y pega el contenido de [`Match.gs`](Match.gs).
4. En `CONFIG_MATCH` pon el `SHEET_ID` del paso 1. Opcional:
   - `REVELACION`: `''` = matches al momento. Si queréis que nadie vea ningún
     match hasta una hora concreta: `'2026-11-21T23:00:00+01:00'`.
   - `MAX_LIKES`: `0` = sin límite.
5. Guarda (`Ctrl+S`).

## 3. Preparar la Sheet y dar permisos

1. En el desplegable de funciones elige **`configurarMatch`** → **Ejecutar**.
2. Google pedirá permisos nuevos (ahora también Hojas de cálculo): acéptalos
   igual que la primera vez.
3. En el registro debe salir `OK. Hojas listas en "Match FESTA"`. En la Sheet
   aparecen las pestañas **Participants** y **Likes** (puedes borrar "Hoja 1").

## 4. Publicar la nueva versión (la URL no cambia)

**Implementar → Gestionar implementaciones → ✏️ Editar → Versión: Nueva versión → Implementar.**

No hace falta tocar `data.js`: el Match usa `subida.scriptUrl` y `subida.clave`.

## 5. Probar sin backend (opcional)

En local, `http://localhost:8080/match.html?demo` usa un servidor simulado en
el navegador (`js/match-demo.js`) con 3 participantes falsos:
Anna (match al momento), Laia (te marca 50 s después: prueba la consulta
periódica) y Jordi (nunca te marca). `?demo&revelacion=2` simula una hora de
revelación dentro de 2 minutos. Solo funciona en localhost.

## Tareas de organizadores

**Alguien ha registrado un nombre que no es el suyo** (o alguien olvidó su PIN):
- Recomendado: en `Match.gs`, función `borrarCuentaManual`, cambia `'Nom Cognom'`
  por el nombre y **Ejecutar**. Borra la cuenta y todos sus likes (dados y recibidos).
- A mano: en la pestaña **Participants**, clic derecho en el número de su fila →
  **Eliminar fila**. Sus likes quedan en **Likes** pero se ignoran (solo cuentan
  likes entre ids que existen) y se limpian solos en la próxima baja.
  **No** dejes la fila vacía: elimínala.

Después la persona correcta ya puede registrarse con ese nombre.

**Desbloquear un nombre antes de 15 min:** en **Participants**, pon
`intents_fallits` y `bloquejat_fins` a `0` en su fila.

**No edites otras columnas a mano** (`salt`, `hash_pin`, `hash_sessio`…):
romperías el acceso de esa persona.

## Límites de Apps Script

Cada consulta es una ejecución. La web consulta cada **45 s** y **solo con la
página visible** (en segundo plano se para). Con 50 móviles abiertos a la vez
son ~1 petición por segundo, dentro de lo que aguanta una cuenta gratuita
(~30 ejecuciones simultáneas). Por eso `segundosConsulta` no baja de 45.
Las peticiones del Match se atienden de una en una (`LockService`) para que
dos likes cruzados al mismo segundo no se pierdan el match.

## Lista de pruebas (con el backend real)

Usa 2–3 navegadores distintos (o ventanas de incógnito) como usuarios A, B y C.
Al terminar, bórralos con `borrarCuentaManual` o dándolos de baja.

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | A se registra (`Prova A`, PIN 1111) | Entra; en **Participants** hay una fila con hash, **sin el PIN** |
| 2 | Con `Prova A` registrado, registrar `  prova   a ` y luego `PRÒVA A` | Los dos: «Aquest nom ja està registrat…» |
| 3 | Registro con PIN `12a4` o de 3 cifras / nombre `=SUMA(1)` | Error en la web; sin fila nueva |
| 4 | A sale y entra con PIN incorrecto 4 veces | «Et queden N intents» |
| 5 | 5º fallo, y luego el PIN **correcto** | «Massa intents… 15 minuts», incluso con el PIN bueno |
| 6 | Poner `bloquejat_fins` a 0 en la Sheet | A puede entrar |
| 7 | B se registra; A marca a B | A: sin animación. B: no ve nada de A (tampoco con F12 → Red → respuesta de `estado`) |
| 8 | B marca a A | B: «És un match!» al instante. A (página abierta): animación en ≤ 45 s |
| 9 | Recargar A y B | No se repite la animación; el match sale en «Els teus matches» |
| 10 | A con la pestaña en segundo plano > 1 min (F12 → Red) | No hay peticiones mientras está oculta; al volver, una |
| 11 | A desmarca a B | Desaparece el match en los dos (B tras recargar o ≤ 45 s) |
| 12 | Revelación: `REVELACION` a 5 min vista, nueva versión; A y C se marcan | Nadie ve el match ni la animación; la web dice cuándo se mostrarán. Pasada la hora, animación a los dos |
| 13 | A entra en otro navegador | El primero, en la siguiente acción: «La sessió s'ha tancat…» |
| 14 | «Recorda'm» desmarcado, cerrar la pestaña y volver | Pide PIN otra vez. En localStorage nunca aparece el PIN |
| 15 | C se da de baja (confirmación) | Fila de C y todos sus likes fuera de la Sheet; C desaparece de la lista de los demás |
| 16 | `borrarCuentaManual` con el nombre de B | Igual que la baja |

Recuerda devolver `REVELACION` a su valor y publicar versión nueva tras la prueba 12.
