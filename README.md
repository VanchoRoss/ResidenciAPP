# ResidenciAPP

Plataforma de estudio activo para residencia médica: banco de preguntas por temario, sprints, repaso espaciado, flashcards, error log, modo Feynman y colaboración sin GitHub para usuarios comunes.

## Qué trae esta versión

- Banco de preguntas separado en `assets/data/questions.json` y `assets/data/questions.js`.
- Estilos separados en `assets/css/styles.css`.
- Lógica principal en `assets/js/main.js`.
- Panel de rendimiento con métricas persistentes.
- Repaso espaciado tipo Anki.
- Flashcards dinámicas.
- Modo Feynman.
- Panel colaborativo por pregunta.
- Envío de aportes a Google Sheets mediante Apps Script.
- Endpoint de Google Apps Script ya configurado.
- Sección para subir imágenes en preguntas que requieren ECG, Rx, mamografía, colposcopía u otra imagen.
- Backup manual en JSON.

## Estructura

```txt
.
├── index.html
├── assets/
│   ├── css/styles.css
│   ├── data/questions.json
│   ├── data/questions.js
│   ├── data/collabdata.json
│   ├── data/collabdata.js
│   ├── img/
│   └── js/
│       ├── main.js
│       ├── config.js
│       ├── storage.service.js
│       ├── retention.service.js
│       ├── dom.js
│       └── shuffle.js
├── docs/
│   ├── ARQUITECTURA.md
│   └── CONFIGURACION_APORTES.md
├── scripts/
│   └── google-apps-script.gs
├── manifest.webmanifest
├── package.json
└── .nojekyll
```

## Cómo subir a GitHub Pages

1. Subir todos los archivos y carpetas a la raíz del repositorio.
2. En GitHub: **Settings → Pages**.
3. Source: **Deploy from a branch**.
4. Branch: `main`.
5. Folder: `/root`.
6. Guardar.

## Configurar aportes sin GitHub para usuarios

La app no pide GitHub a los usuarios. Para recibir aportes en una Google Sheet:

1. Crear o abrir la Google Sheet de aportes.
2. Ir a **Extensiones → Apps Script**.
3. Pegar el contenido actualizado de `scripts/google-apps-script.gs`.
4. Desplegar como **Aplicación web**.
5. Autorizar permisos de Sheets y Drive.

El endpoint ya quedó cargado en `assets/js/config.js`.

Ver detalles en `docs/CONFIGURACION_APORTES.md`.

## Imágenes

Cuando una pregunta menciona imagen, ECG, radiografía o similar, en el modo colaboración aparece un bloque para subir imagen. La imagen se envía a Apps Script, se guarda en Google Drive y la URL queda registrada en la Google Sheet.

## Backup manual

Si Google Apps Script no está disponible, los aportes quedan en el navegador del usuario y se pueden descargar con el botón **Exportar aportes JSON**.


## ResidenciAPP Tutor

Esta versión agrega la sección **Aprender desde cero**, con nodos de aprendizaje guiado para estudiar por tema antes de practicar preguntas. Los nodos están en `assets/lessons/` y se cargan desde `assets/data/lessons.js`.

Nodos incluidos:
- Cáncer de cérvix
- Cáncer de endometrio
- Cáncer de mama
- Cáncer de ovario
- Endometriosis
- Rotura prematura de membranas

Cada nodo combina explicación narrativa, algoritmos, trampas de examen y preguntas reales.
Actualización Tutor v2
