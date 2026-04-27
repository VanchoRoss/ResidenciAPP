# Arquitectura de ResidenciAPP

Esta versión separa el monolito inicial en archivos de datos, estilos y lógica.

## Capas principales

- `index.html`: estructura base, metadatos, contenedores visuales y carga de scripts.
- `assets/css/styles.css`: estilos propios complementarios a Tailwind.
- `assets/data/questions.json`: banco de preguntas editable.
- `assets/data/questions.js`: wrapper para exponer el banco en GitHub Pages sin build.
- `assets/data/collabdata.json`: análisis curados ya integrados.
- `assets/data/collabdata.js`: wrapper de datos colaborativos.
- `assets/js/main.js`: motor principal de la app.
- `assets/js/config.js`: configuración de aportes externos.
- `scripts/google-apps-script.gs`: endpoint de recepción de aportes para Google Sheets.

## Colaboración

El usuario común no necesita entrar a GitHub. La app envía los aportes a una bandeja externa configurada, idealmente Google Sheets mediante Apps Script.

Flujo:

```txt
Usuario → ResidenciAPP → Apps Script → Google Sheet → revisión manual → collabdata.json
```

## Próximo salto técnico recomendado

- Migrar `main.js` a módulos reales.
- Pasar a Vite + TypeScript.
- Usar IndexedDB para datos grandes locales.
- Crear un panel administrativo para aprobar aportes y exportarlos a `collabdata.json`.
