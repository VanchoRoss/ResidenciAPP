# ResidenciAPP

Plataforma de estudio activo para residencia médica: banco de preguntas por temario, sprints, repaso espaciado, flashcards, error log, modo Feynman y colaboración por GitHub Issues.

## Estructura

```text
.
├── index.html
├── assets/
│   ├── css/styles.css
│   ├── data/questions.json
│   ├── data/questions.js
│   ├── data/collabdata.json
│   ├── data/collabdata.js
│   ├── img/icon.svg
│   ├── img/og-image.svg
│   └── js/main.js
├── .github/workflows/merge-approved-analysis.yml
├── scripts/apply-issue-analysis.mjs
├── manifest.webmanifest
└── docs/
```

## Cómo subir a GitHub Pages

1. Creá un repositorio en GitHub.
2. Subí todos estos archivos respetando la estructura.
3. En GitHub: **Settings → Pages**.
4. En **Build and deployment**, elegí **Deploy from a branch**.
5. Branch: `main`; folder: `/root`.
6. Guardá.

## Configurar metadatos

Editá en `index.html` estos placeholders:

```html
https://TU_USUARIO.github.io/TU_REPOSITORIO/
```

Reemplazalos por la URL real de tu GitHub Pages.

## Colaboración por GitHub Issues

La app puede crear Issues con sugerencias de explicación. Para eso necesitás configurar owner, repo y token desde la UI o desde el código.

⚠️ **Seguridad:** no es recomendable dejar un Personal Access Token en un repositorio público ni en un HTML servido por GitHub Pages. Para uso personal puede servir, pero lo profesional es usar una función serverless como intermediaria.

### Permisos mínimos del token

Usá un fine-grained token con acceso solo al repositorio de ResidenciAPP y permiso:

- **Issues: Read and write**

## Integración automática de sugerencias aprobadas

La GitHub Action incluida se activa cuando etiquetás un issue con:

```text
aprobado-residenciapp
```

El workflow extrae el payload JSON del issue y actualiza:

- `assets/data/collabdata.json`
- `assets/data/collabdata.js`

## Desarrollo futuro recomendado

La app ya está separada en archivos principales. El próximo salto sería migrar `assets/js/main.js` a módulos reales con Vite + TypeScript. Dejé servicios ejemplo en `assets/js/*.service.js` para esa transición.
