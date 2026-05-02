# ResidenciAPP v34.4 — Nodos nuevos en Aprender desde cero

Se agregan 6 materiales HTML como nodos/mega-nodos en la sección **Aprender desde cero**, preservando el banco de 974 preguntas y los IDs originales.

## Nodos agregados

1. Crecimiento, Desarrollo y Nutrición Pediátrica
2. Ginecología endocrinológica — 10 nodos
3. Hemorragias de la primera mitad — nodo conceptual
4. TORCH, periparto y neonatal precoz
5. Vault — Hemorragias primera mitad: 10 nodos
6. Vault — Hemorragias segunda mitad y postparto: 10 nodos

## Integración

- Archivos copiados a `assets/lessons/`.
- Metadata agregada en `assets/data/lessons.json` y `assets/data/lessons.js`.
- Cache busting actualizado en `index.html` a `v=34.4` para evitar cache viejo en GitHub Pages.
- Se agregaron variables CSS base para que los HTML nuevos se rendericen correctamente dentro del iframe de lecciones.
- Se vincularon preguntas explícitas por sprint/tema cuando el mapeo es confiable.
