# NeuroPREP · ResidenciAPP v2.7

NeuroPREP es una nueva sección dentro de ResidenciAPP pensada como capa cognitiva adaptativa. No reemplaza los sprints ni los nodos de estudio: se apoya sobre ellos.

## Objetivo

Ayudar al usuario a elegir el modo de entrenamiento adecuado según su progreso local:

- errores activos;
- repasos vencidos;
- temas débiles;
- precisión global;
- tiempo promedio;
- estado de avance.

## Modos incluidos

### Diagnóstico rápido

Selecciona 3 preguntas de ejes distintos. Usa razonamiento guiado antes de mostrar opciones y registra confianza.

### Modo razonamiento

La pregunta aparece sin opciones. El usuario escribe hipótesis y nivel de confianza. Luego se muestran las opciones ABCD.

### Interleaving automático

Mezcla preguntas de temas distintos para entrenar discriminación entre diagnósticos/conductas.

### Examen predictivo

Simulacro de hasta 40 preguntas con timer de 1:30 por pregunta.

## Datos

Todo funciona sobre localStorage y el banco actual. No requiere backend ni IA integrada.

## Próximos pasos sugeridos

- Calibración formal de confianza.
- Detección automática de patrones de error cognitivo.
- Plan correctivo de 7 días más detallado.
- Grafo de conocimiento real por relaciones entre conceptos.
- Integración opcional con una IA externa o backend seguro.
