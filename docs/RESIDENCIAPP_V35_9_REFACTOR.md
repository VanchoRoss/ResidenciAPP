# ResidenciAPP v35.9 · Refactor cognitivo

## Filosofía del refactor

**No duplicar lo que ya funciona. Limpiar lo que confunde. Agregar solo lo que falta.**

El sistema NeuroPREP nativo (en `main.js`) ya implementaba calibración de confianza con `state.neuroprep.reasoning`. La versión v35.8 anterior creaba un sistema paralelo redundante. Esta v35.9 lee del estado nativo y agrega solo lo que faltaba: **dashboard accionable, predictor de aprobación, mapa de cobertura, sidebar limpio**.

---

## Cambios visibles

### Sidebar limpio
- ❌ Eliminado: botón "🤝 Activar Colaboración" (fricción innecesaria para uso individual).
- ❌ Oculto: "Métodos de estudio" (los métodos se eligen dentro de cada sesión).
- ❌ Oculto: "Biblioteca personal" (feature secundaria, no esencial para el examen).
- ✅ Reordenado: NeuroPREP destacado visualmente (es el flujo principal).
- ✅ Orden lógico: Panel principal → NeuroPREP → Sesión → Repaso → Temario → Aprender → Juegos.

### Dashboard cognitivo (nuevo bloque)
Tres indicadores accionables que aparecen en el panel principal:

1. **🚨 Zona de peligro** — Cuántas preguntas fallaste estando seguro. Botón directo para trabajarlas en modo razonamiento. Es el indicador más importante a días del examen: las **falsas certezas** son la trampa cognitiva más peligrosa.

2. **🎯 Calibración** — % de aciertos cuando estás seguro. Si es <90%, hay falsa confianza. Detecta también los aciertos por adivinar (no se cuentan como dominio real).

3. **🧬 Patrón de error dominante** — El tipo de error más frecuente (ej: "no vi el dato clave", "caí en distractor"). Botón con la **estrategia específica** para corregir ese patrón.

### Predictor de aprobación
Cálculo ponderado por peso real del examen:
- Adultos y adultos mayores: 53%
- Pediatría: 21%
- Salud integral de las mujeres: 19%
- Salud pública: 7%

Devuelve un % con interpretación: "Excelente / Aprobando / Zona crítica / Riesgo alto" + barra de progreso por eje. Ajustado por confianza de cobertura: si solo respondiste 5%, el predictor lo refleja como tentativo.

### Mapa de cobertura (heatmap)
Visualización tipo GitHub-contribution-graph: cada celda es un sprint.
- Color por rendimiento: verde ≥85%, ámbar 65-85%, rojo <65%, gris sin tocar.
- Opacidad por cobertura: cuanto más respondido, más opaco.
- Tap en una celda → inicia el sprint directamente.

De un vistazo se ve la geografía completa de tu conocimiento.

### Onboarding diagnóstico
Banner inteligente que aparece al entrar al panel principal **solo si**:
- Tenés menos de 30 preguntas respondidas.
- No lo dismissaste explícitamente.
- No lo hiciste en los últimos 7 días.

Botón "Empezar diagnóstico (5 min)" → activa `startNeuroDiagnostic()` (función nativa de v34.3) con 3 preguntas en modo razonamiento.

---

## Archivos nuevos

```
assets/js/v35_9_refactor.js          (~17 KB) — capa principal
assets/css/v35_9_refactor.css        (~3 KB)  — estilos componentes
docs/RESIDENCIAPP_V35_9_REFACTOR.md  este archivo
```

---

## Funciones públicas expuestas

```js
v359StartDangerZone()        // entrenar las preguntas con falsa seguridad
v359ShowStrategy(type)       // mostrar estrategia para tipo de error
v359StartOnboarding()        // iniciar diagnóstico inicial
v359DismissOnboarding()      // descartar el banner
```

Todas las funciones nativas (`startNeuroReasoning`, `startNeuroDiagnostic`,
`startNeuroInterleaving`, `startNeuroPredictiveExam`) **siguen funcionando idénticas**.
v35.9 no las sobreescribe.

---

## Estado adicional

Solo agrega:

```js
state.onboarding = { dismissed: bool, lastDoneAt: timestamp }
```

**No duplica** la calibración. Lee de `state.neuroprep.reasoning[qid]` que el sistema nativo ya guarda con `{text, confidence, at}` donde `confidence` es `'seguro' | 'dudaba' | 'adivine' | 'sin_calibrar'`.

---

## Compatibilidad

- ✅ 100% compatible con datos guardados de v35.7 y anteriores.
- ✅ No modifica banco, IDs ni progreso histórico.
- ✅ Si rompe en producción → eliminar las dos líneas de carga en `index.html` y la app vuelve a v35.7 sin pérdida de datos.

---

## Verificación rápida en consola del browser

```js
window.__RESIDENCIAPP_V359__   // → true
typeof v359StartDangerZone      // → 'function'
typeof startNeuroReasoning      // → 'function' (nativa, intacta)
```

Si los tres dan `true` y `'function'`, todo está corriendo correctamente.

---

## Cómo probar el flujo completo

1. Abrir la app → si tenés <30 respuestas, ves el banner de onboarding.
2. Tocar "Empezar diagnóstico (5 min)" → se abre una sesión de razonamiento de 3 preguntas.
3. Por cada pregunta: escribir hipótesis, elegir confianza (Seguro/Dudaba/Adiviné), guardar, ver opciones, responder.
4. Volver al panel principal → aparecen los 3 indicadores cognitivos + predictor + heatmap.
5. Si fallás algo estando seguro → la zona de peligro empieza a contar y el botón "Trabajar las N" se vuelve accionable.

---

**Compatible con todo el código previo. Sin redundancias. Sin ruido. Diseñado para los 37 días que faltan al examen.**
