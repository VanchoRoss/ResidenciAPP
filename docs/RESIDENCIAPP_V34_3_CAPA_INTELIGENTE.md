# ResidenciAPP v34.3 · Capa inteligente

## Objetivo
Agregar una capa central que convierta las métricas existentes en acción directa: qué estudiar ahora, cómo armar exámenes equilibrados y cómo separar el uso libre del uso guiado por NeuroPREP.

## Cambios principales

### 1. Dos universos
- **Modo Libre:** el usuario elige sprint, tema, método y timing.
- **Modo IA / NeuroPREP:** la app combina errores activos, repasos vencidos y sprints sin cubrir para iniciar una sesión recomendada con un solo botón.

### 2. Exámenes equilibrados
Se agregó `buildBalancedExam(totalQ)` y accesos para:
- Mini examen: 20 preguntas.
- Examen medio: 50 preguntas.
- Simulacro completo: 100 preguntas.

La distribución usa los pesos reales por eje:
- EJE1 Salud Pública: 7%.
- EJE2 Salud integral de las mujeres: 19%.
- EJE3 Salud del niño, niña y adolescentes: 21%.
- EJE4 Salud adultos y adultos mayores: 53%.

### 3. NeuroPREP operativo
La pantalla NeuroPREP ahora muestra:
- Zona débil detectada.
- Preguntas vencidas.
- Sprint/nodo sin cubrir.
- Botón “Empezar sesión recomendada”.

### 4. Repaso espaciado refinado
En una sesión de repaso:
- Si el usuario acierta, la pregunta sale del repaso automático.
- Si falla, vuelve mañana y queda como error.
- Si el usuario marca Fácil / Dudosa / Difícil, esa elección programa manualmente el próximo contacto.

### 5. Biblioteca personal activa
Si una pregunta tiene notas asociadas por pregunta, sprint o tema, aparece un aviso discreto dentro de la pregunta.

### 6. Nodos con estado
Los nodos de “Aprender desde cero” muestran estado visual:
- Sin ver.
- En práctica.
- Dominado, si las preguntas relacionadas superan 70% de acierto.

## Archivos modificados
- `index.html`
- `assets/js/v34_3_intelligence.js`

## Banco validado
- Total: 974 preguntas.
- Sprints: 36.
- Ejes: 4.
- Áreas/fuentes: Clínica 457, Cirugía 63, Pediatría 200, Gineco-Obstetricia 186, Salud Pública 68.
