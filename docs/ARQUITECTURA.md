# Arquitectura actual

Esta versión separa el monolito original en:

- HTML liviano de layout y metadata.
- CSS custom en `assets/css/styles.css`.
- Banco de preguntas en `assets/data/questions.json` y wrapper `questions.js`.
- Datos colaborativos en `assets/data/collabdata.json` y wrapper `collabdata.js`.
- Lógica principal en `assets/js/main.js`.
- Servicios ejemplo para migración futura.

## Por qué hay `.json` y `.js`

GitHub Pages sirve JSON, pero para no reescribir toda la app a carga asíncrona, se usa un wrapper JS que expone los datos como variables globales:

```js
window.RESIDENCIAPP_DATA = {...}
```

Esto conserva compatibilidad y permite separar el archivo grande del HTML.

## Siguiente refactor ideal

1. Convertir `main.js` en módulos.
2. Eliminar `onclick` inline con event delegation.
3. Migrar estado grande a IndexedDB.
4. Pasar a Vite + TypeScript.
5. Mover token GitHub a serverless.
