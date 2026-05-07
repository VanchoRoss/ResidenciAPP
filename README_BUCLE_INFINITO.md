# Bucle Infinito 2.0 integrado a ResidenciAPP

## Qué hace

El módulo `bucle_infinito_2.html` funciona como motor de consolidación profunda. Lee métricas de ResidenciAPP en modo solo lectura y recomienda qué sprint conviene trabajar con IA.

## Separación de datos

- Lee, sin modificar: `residenciapp_integrada_state`.
- Lee el banco: `assets/data/questions.js`.
- Guarda solo su propio estado: `bi2-ss` y `bi2-last`.

Esto significa que el Bucle puede nutrirse de errores, cobertura y respuestas de la app principal, pero no altera respuestas, errores, sesiones, métricas ni progreso principal.

## Uso con IA

La forma recomendada en GitHub Pages es copiar el prompt estructurado y pegarlo en Gemini, Google AI Studio, Claude u otra IA.

No se recomienda colocar una API key de Gemini directamente en el frontend público. Para una integración automática, usar un intermediario como Google Apps Script, Cloudflare Worker, Vercel Function o Firebase Function.

## Botón de inicio

El enlace superior vuelve a `index.html#dashboard`, es decir al panel principal de ResidenciAPP cuando el usuario ya tiene acceso concedido en ese navegador.
