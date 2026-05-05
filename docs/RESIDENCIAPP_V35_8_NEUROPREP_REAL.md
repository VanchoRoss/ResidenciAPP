# ResidenciAPP v35.8 · NeuroPREP Real

> Capa cognitiva activa sobre v35.7. **Sin cambios destructivos** — todo el código previo sigue funcionando idéntico. Solo se agregan funciones nuevas en una capa adicional.

## Qué se agregó (v35.8)

### 1. Modo Razonamiento REAL
El método `razonamiento` ahora oculta las opciones ABCD hasta que el usuario registra su nivel de confianza (Lo sé / Dudoso / Adiviné). Esto activa metacognición real antes de responder.

**Cómo se usa:**
- En cualquier sesión, cambiar el método a "🧬 Razonamiento guiado".
- Aparece el panel de confianza primero.
- Las opciones aparecen tras seleccionar.
- Al responder, hay alerta visual si fallaste estando seguro (zona de peligro) o acertaste adivinando (suerte).

### 2. Dashboard cognitivo (3 indicadores)
En el panel principal aparece un nuevo bloque con tres indicadores accionables:
- **🚨 Zona de peligro:** preguntas donde fallaste estando seguro. Botón directo para trabajarlas en modo razonamiento.
- **🎯 Calibración:** % de aciertos cuando estabas seguro. Si es <90%, hay falsa confianza.
- **🧬 Patrón dominante:** el tipo de error más frecuente y la estrategia exacta para corregirlo.

Se activa después de 5 preguntas en modo razonamiento.

### 3. Onboarding diagnóstico
Si el usuario tiene <30 preguntas respondidas, aparece un banner al entrar al dashboard con un diagnóstico de 5 preguntas (1 por eje) en modo razonamiento. Activa la calibración cognitiva desde el primer uso.

### 4. Predictor de aprobación
Un cálculo ponderado por peso real del examen (Adultos 53% · Pediatría 21% · Mujeres 19% · Salud Pública 7%) que arroja un % de probabilidad de aprobar el 10 de junio. Ajustado por confianza de cobertura (si solo respondiste 5%, el predictor lo refleja).

### 5. Mapa de calor (heatmap)
Visualización tipo GitHub-contribution-graph: cada celda es un sprint, color por rendimiento (verde ≥85% · ámbar 65-85% · rojo <65% · gris sin tocar), opacidad por cobertura. Tap en una celda inicia el sprint.

### 6. Interleaving real
`startNeuroInterleaving()` arma 20 preguntas con round-robin entre los 4 ejes (no random). Garantiza que nunca aparezcan 3 del mismo eje seguidas — activa la discriminación entre esquemas que el shuffle aleatorio no garantiza.

### 7. Recomendación adaptativa en NeuroPREP
La vista NeuroPREP ahora sugiere automáticamente qué hacer hoy según tu estado:
- Si hay zona de peligro → trabajar zona de peligro.
- Si hay >5 vencidas → repaso espaciado.
- Si hay eje débil <60% → sesión dirigida en ese eje.
- Si todo bien → sesión estándar de razonamiento o interleaving.

## Archivos nuevos

```
assets/js/v35_8_neuroprep_cognitive.js       (~22 KB) — capa principal
assets/css/v35_8_neuroprep_cognitive.css     (~3 KB)  — estilos componentes
docs/RESIDENCIAPP_V35_8_NEUROPREP_REAL.md     este archivo
```

## Funciones públicas expuestas en window

```js
startOnboardingDiagnostic()    // inicia las 5 preguntas iniciales
startNeuroReasoning()          // sesión de razonamiento balanceada (15)
startNeuroDiagnostic()         // alias de onboarding
startNeuroInterleaving()       // sesión interleaved (20)
startNeuroPredictiveExam()     // simulacro 40 preguntas
startDangerZoneSession()       // entrenar las preguntas peligrosas
showErrorPatternHelp(type)     // estrategia para tipo de error
npRecordConfidence(qid, level) // registrar confianza
```

## Estado adicional en localStorage

```js
state.calibration[qid] = { confidence:'sure'|'doubt'|'guess', wasCorrect:bool, at, confAt }
state.onboarding       = { lastDoneAt, baselineAccuracy, dismissed }
state.preferences      = { reasoningMode: bool }
state.dailySessions[YYYY-MM-DD] = count
state.narrativeMode    = bool (preparado, no activado por defecto)
state.__np358_phase__  = { qid: 'confidence'|'options' }
```

## Rendimiento

- Tamaño total agregado: ~25 KB (gzip <8 KB).
- Sin librerías externas adicionales.
- Hooks no destructivos sobre `renderAll`, `showView`, `selectAnswer`, `questionTemplate`.
- Compatible 100% con datos guardados de v35.7.

## Cómo probar

1. Subir el ZIP a GitHub Pages.
2. Esperar 60 segundos a que GitHub Pages actualice.
3. Abrir la app — debería aparecer el banner de onboarding si tenés <30 respuestas.
4. Hacer las 5 preguntas iniciales en modo razonamiento.
5. Volver al dashboard: aparecen los 3 indicadores cognitivos + predictor + heatmap.

## Verificación

En la consola del browser:
```js
window.__RESIDENCIAPP_V358__ // debe ser true
typeof startNeuroReasoning   // debe ser 'function'
```

Si alguna función no aparece, recargar con Ctrl+F5 (cache busting incluido).

---

**Compatible con todo el código de v35.7 y anteriores. Si rompe algo en producción, eliminar las dos líneas de carga en index.html y la app vuelve a v35.7 sin más.**
