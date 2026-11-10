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
3. Abre `reto.html`, sube una foto de prueba y comprueba que aparece en la carpeta.
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
