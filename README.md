# ResidenciAPP v35.9 · Refactor cognitivo

Plataforma de estudio activo para residencia médica con motor cognitivo basado en neurociencia del aprendizaje.

**v35.9 (5 mayo 2026)** — Refactor de inteligencia cognitiva: dashboard accionable, predictor de aprobación, mapa de cobertura, sidebar limpio. Lee del sistema NeuroPREP nativo sin duplicación.

Ver `docs/RESIDENCIAPP_V35_9_REFACTOR.md` para detalles completos.

---


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


## v34.10 - Juegos + desafío IA

- La sección **Juegos de memoria** pasa a llamarse **Juegos**.
- Se conserva el juego de calendario de vacunación.
- Se agrega **Desafío IA por link**: el desafío y los resultados viajan en base64 dentro de la URL, sin backend.
- La Anthropic API key se configura desde el botón ⚙ API de la sección Juegos y queda guardada en localStorage del navegador.

## v35.18 · Bucle Infinito acoplado a ResidenciAPP

Esta versión mantiene `bucle_infinito_2.html`, pero lo rediseña para verse integrado con la estética de ResidenciAPP. El Bucle lee las métricas principales en modo solo lectura y genera prompts para IA sin alterar el progreso de la app principal.

Archivos nuevos:

```txt
bucle_infinito_2.html
bucle_hub.html
css/vars.css
README_BUCLE_INFINITO.md
assets/js/v35_18_bucle_module.js
assets/css/v35_18_bucle_module.css
```

Notas:
- El Bucle Infinito 2.0 guarda su progreso en `localStorage` con la key `bi2-ss`.
- Lee, sin modificar, la key principal `residenciapp_integrada_state`.
- Ese progreso es independiente de las métricas principales de ResidenciAPP.
- El botón superior del Bucle vuelve a `index.html#dashboard` para regresar al panel principal.
- Si agregás archivos de clasificación standalone, incluí en su `<head>`:

```html
<link rel="stylesheet" href="css/vars.css">
```


## v35.19
- Agrega 4 vaults nuevos a Aprender desde cero: Infectología adultos, Salud Pública/APS/Leyes, Endocrinología adultos y Neumología.
- Corrige la selección del juego Calendario de vacunas con una única capa de interacción robusta.

## v35.20 · Estabilidad de clicks y revancha

- Mantiene el banco corregido de 974 preguntas sin modificar IDs ni datos de preguntas.
- Agrega una capa final `v35_20_stability_clicks` y deja de cargar el script antiguo `v35_2_vaccine_fullscreen.js` desde `index.html` para reducir listeners duplicados del calendario de vacunas. El comportamiento final queda: tocar marca/desmarca; arrastrar desplaza.
- Refuerza pantalla completa del calendario y compatibilidad PC/celular.
- Corrige Revancha de errores: las correctas salen de errores activos; las incorrectas permanecen como incorrectas.
- Actualiza cache busting a `v=35.20` para GitHub Pages.

## v35.23 · Notas móviles por nodo en Aprender desde cero

- Agrega mini pizarras personales en cada nodo de Aprender desde cero.
- Cada nota queda guardada por nodo en localStorage separado: `residenciapp.lessonNodeNotes.v35_23:<id_del_nodo>`.
- Las notas se crean como iconos de papel, se abren al hacer click, pueden moverse, cerrarse, editarse, redimensionarse y eliminarse.
- No modifica banco, IDs, métricas, sesiones, errores activos ni progreso principal.
- Actualiza cache busting a `v=35.23` para GitHub Pages.

## v35.22 · Reportes de errores + vacunas final

- Agrega debajo de cada pregunta un apartado de **Reportar error** con: enunciado editable, motivo del problema y comentario adicional.
- Los reportes se envían al mismo endpoint de Google Apps Script que los aportes colaborativos, pero se guardan en una pestaña separada: `Reportes de errores`.
- Actualiza `scripts/google-apps-script.gs` para separar visualmente `Feedback IA`/`Aportes` y `Reportes de errores`, con columnas y estados propios.
- Quita de la UI pública el botón **Configurar recepción** del panel de feedback colaborativo. La recepción queda centralizada en `assets/js/config.js`.
- Reemplaza las capas finales v35.19/v35.20 por `v35_21_error_reports_vaccine_final.js`, que guarda la celda inicial del tap para que el calendario de vacunas marque/desmarque aun con pointer capture activo.
- Al terminar el juego de vacunas, se muestra un resumen separado de **aciertos, errores, faltantes y precisión**.
- Actualiza cache busting a `v=35.22` para GitHub Pages.


## v35.24 · migración automática de endpoint colaborativo

Esta versión fuerza el endpoint oficial de aportes en `config.js` y migra automáticamente navegadores que tenían guardada una URL vieja en `localStorage` o dentro de `residenciapp_integrada_state`. No modifica banco, IDs, métricas ni progreso.
