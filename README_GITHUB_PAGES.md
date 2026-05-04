# ResidenciAPP v35.1 — versión para GitHub Pages

Esta carpeta está preparada para subirse directamente al repositorio de GitHub Pages.

## Cómo subir

1. Descomprimir este ZIP.
2. Entrar a la carpeta descomprimida.
3. Subir TODO el contenido al repositorio, incluyendo:
   - `index.html`
   - `.nojekyll`
   - `assets/`
   - `docs/`
   - `scripts/`
   - `manifest.webmanifest`
4. En GitHub: Settings → Pages.
5. Source: `Deploy from a branch`.
6. Branch: `main`.
7. Folder: `/root` si subiste los archivos en la raíz del repo.

## Importante

- No subir la carpeta contenedora completa; subir el contenido interno.
- Reemplazar todos los archivos anteriores para evitar caché viejo.
- El banco, IDs, progreso local, métricas y estadísticas no fueron modificados.
- La app guarda el progreso en el navegador del usuario mediante localStorage.

## Cambios incluidos

- Corrección final muestra solo preguntas respondidas.
- Revancha sin feedback inmediato: corrección al final.
- Respuestas correctas/incorrectas con colores más visibles.
- Reemplazo de “fallada” por “incorrecta”.
- Calendario de vacunas con selección/deselección por toque.
- Calendario más adaptable y con mejor scroll.
- Eliminada fila “Desde los 11 años”.
