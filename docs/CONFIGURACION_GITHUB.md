# Configuración de GitHub para ResidenciAPP

## A) Crear un Personal Access Token mínimo

1. Entrá a GitHub.
2. Abrí **Settings**.
3. Entrá a **Developer settings**.
4. Entrá a **Personal access tokens**.
5. Elegí **Fine-grained tokens**.
6. Tocá **Generate new token**.
7. Seleccioná solo el repositorio de ResidenciAPP.
8. En permisos del repositorio, habilitá:
   - **Issues: Read and write**
9. Generá el token y copialo.
10. En la app, usá **Configurar GitHub** y pegá:
   - owner
   - repo
   - token

⚠️ No compartas ese token. Si el repositorio es público, evitá pegarlo directamente en el código.

## B) Validar sugerencias con GitHub Action

La Action incluida escucha issues etiquetados con:

```text
aprobado-residenciapp
```

Flujo sugerido:

1. Un colaborador envía una sugerencia desde la app.
2. Se crea un Issue con el análisis y un payload JSON.
3. Vos revisás el contenido.
4. Si está bien, agregás la etiqueta `aprobado-residenciapp`.
5. La Action actualiza `assets/data/collabdata.json` y `assets/data/collabdata.js`.
6. La app empieza a leer esos análisis como base integrada.
