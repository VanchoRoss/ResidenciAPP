# Feedback colaborativo como explicación oficial

Esta versión muestra inmediatamente los campos del aporte colaborativo dentro de la **Experiencia de aprendizaje** de la pregunta.

## Flujo local

1. Activar colaboración.
2. Completar:
   - Por qué es correcta
   - Datos clave
   - Análisis de distractores
   - Regla de Oro
   - Bibliografía / fuente
3. La pregunta empieza a mostrar ese contenido arriba como feedback colaborativo local.

## Para que lo vea cualquier usuario

GitHub Pages es una app estática: el navegador no puede escribir directamente en el repositorio sin un backend o token. Para publicar feedback como oficial para todos:

1. Usar **Exportar feedback para GitHub**.
2. Tomar el JSON exportado.
3. Integrar las explicaciones aprobadas en:
   - `assets/data/collabdata.json`
   - `assets/data/collabdata.js`
4. Subir esos archivos a GitHub.

Una vez integrado, cualquier usuario que abra ResidenciAPP verá ese feedback dentro de la Experiencia de aprendizaje.

## Alternativa futura

Para que esto sea automático sin tocar GitHub manualmente, habría que usar una base de datos o backend, por ejemplo Supabase/Firebase, o una GitHub Action con token seguro del lado servidor.
