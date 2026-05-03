# ResidenciAPP v34.5 — Fix nodos Aprender desde cero

Corrección puntual sobre v34.4.

## Problema
En algunos despliegues GitHub Pages seguía mostrando 6 nodos porque el navegador podía estar sirviendo la lista vieja de `assets/data/lessons.js` o porque no se había reemplazado toda la carpeta `assets/data`.

## Corrección
- Se creó un archivo nuevo de datos: `assets/data/lessons.v34.5.js`.
- `index.html` ahora apunta a ese archivo nuevo con `?v=34.5`, forzando cache busting real.
- Se mantiene también `lessons.js` y `lessons.json` con los 12 nodos.
- Se agregó una advertencia visual si la app detecta menos de 12 nodos cargados.

## Validación
- Total de nodos: 12.
- Nuevos nodos agregados: 6.
- Banco de preguntas: 974.
- IDs de preguntas: sin cambios.
