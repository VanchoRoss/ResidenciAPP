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

## v2.8
Incluye NeuroPREP funcional con razonamiento guiado, calibración de confianza y plan correctivo; además consolida el pizarrón local con pantalla completa, selección/movimiento de textos y trazos, colores, resaltado y bordes opcionales.


## v2.9
- Navegación Anterior/Siguiente arriba en sesiones de práctica, simulacro, revancha y NeuroPREP.
- Pizarrón local plegado por defecto para que la pregunta y opciones sean el foco inicial.
- Pantalla completa del pizarrón con scroll interno más estable.


## v3.3 Banco 974 corregido

- Banco integrado actualizado a 974 preguntas.
- Semáforo por áreas: Clínica 457, Cirugía 63, Pediatría 200, Gineco-Obstetricia 186 y Salud Pública 68.
- Se preservan IDs conservados para mantener el progreso local.


## v3.4 Premium Clean

- Mantiene el Banco Integrado en 974 preguntas y preserva los IDs existentes.
- Agrega dashboard limpio con continuidad de sesión, accesos rápidos y semáforo por área.
- El semáforo distingue rendimiento de cobertura para evitar interpretaciones engañosas.
- Incluye auditoría visual del banco: total, 36 sprints, distribución por área e IDs duplicados.
- Agrega navegación inferior para celular y mejoras de lectura en modo pregunta.
- Actualiza cache busting a `v=34` para evitar que GitHub Pages muestre datos viejos.
