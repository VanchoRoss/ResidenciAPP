# ResidenciAPP v35.10 · Estabilidad de botones y exámenes equilibrados

Cambios:
- Se retiró el `MutationObserver` global de v35.7 porque podía re-renderizar paneles completos ante cada cambio del DOM y trabar botones.
- Se agregó una capa final `v35_10_stability_buttons.js` para estabilizar el flujo de Exámenes equilibrados.
- En Exámenes equilibrados el flujo queda: modalidad → tipo → Iniciar.
- Modo libre: sin tiempo y feedback inmediato.
- Modos 1:00, 1:30 y 2:00: simulacro ciego con corrección final.
- No se modifican banco, IDs, progreso histórico ni métricas.
