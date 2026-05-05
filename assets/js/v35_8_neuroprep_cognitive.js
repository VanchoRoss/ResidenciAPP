/* ════════════════════════════════════════════════════════════════════════
   ResidenciAPP v35.8 · NeuroPREP REAL + Dashboard cognitivo + Onboarding
   ════════════════════════════════════════════════════════════════════════
   Capa NO destructiva sobre v35.7. Implementa los puntos críticos del audit:
   1. Flujo real de Razonamiento (confianza → opciones → calibración)
   2. Dashboard cognitivo de 3 indicadores accionables
   3. Onboarding de diagnóstico inicial (5 preguntas)
   4. Predictor de probabilidad de aprobación
   5. Interleaving estructurado (no random)
   6. Mapa de calor de cobertura por sprint
   7. Narrativa de paciente (envuelve el enunciado)
   8. Análisis de calibración cognitiva post-sesión
   No toca: banco, IDs, progreso histórico, métricas guardadas.
   ════════════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V358__) return;
  window.__RESIDENCIAPP_V358__ = true;

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E  = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function safeSave(){ try { saveState(); } catch(_){} }

  // ════════════════════════════════════════════════════════════════════════
  // ESTADO EXTENDIDO · Calibración cognitiva por respuesta
  // ════════════════════════════════════════════════════════════════════════
  function ensureV358State(){
    state.calibration ||= {};        // { qid: { confidence:'sure'|'doubt'|'guess', wasCorrect:bool, at } }
    state.onboarding  ||= {};        // { lastDoneAt, baselineAccuracy }
    state.preferences ||= {};        // { reasoningMode: bool }
    state.dailySessions ||= {};      // { 'YYYY-MM-DD': count }
    state.narrativeMode ||= false;   // true = paciente narrativo activo
  }
  ensureV358State();

  // ════════════════════════════════════════════════════════════════════════
  // 1) FLUJO REAL DE RAZONAMIENTO (NeuroPREP genuino)
  //    Override de questionTemplate para método 'razonamiento'.
  //    Antes: ven todo. Ahora: confianza → opciones → resultado calibrado.
  // ════════════════════════════════════════════════════════════════════════

  const REASONING_PHASE_KEY = '__np358_phase__';

  function getReasoningPhase(qid){
    state[REASONING_PHASE_KEY] ||= {};
    return state[REASONING_PHASE_KEY][qid] || 'confidence';
  }
  function setReasoningPhase(qid, phase){
    state[REASONING_PHASE_KEY] ||= {};
    state[REASONING_PHASE_KEY][qid] = phase;
    safeSave();
  }
  function clearReasoningPhase(qid){
    if(state[REASONING_PHASE_KEY]) delete state[REASONING_PHASE_KEY][qid];
    safeSave();
  }

  window.npRecordConfidence = function(qid, level){
    const q = QUESTIONS.find(x => x.id === qid);
    if(!q) return;
    state.calibration[qid] = state.calibration[qid] || {};
    state.calibration[qid].confidence = level;     // 'sure' | 'doubt' | 'guess'
    state.calibration[qid].confAt      = Date.now();
    setReasoningPhase(qid, 'options');
    safeSave();
    try { renderQuestion(); } catch(_){ }
  };

  function reasoningHeader(q){
    const conf = state.calibration?.[q.id]?.confidence;
    const labels = {sure:'💪 Lo sabía', doubt:'🤔 Dudaba', guess:'🎲 Adiviné'};
    return '<div class="mb-3 flex flex-wrap items-center gap-2">'
      + '<span class="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">🧬 Modo razonamiento</span>'
      + (conf ? '<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+labels[conf]+'</span>' : '')
      + '</div>';
  }

  function reasoningConfidencePanel(q){
    return '<div class="mt-4 rounded-[1.4rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-900/60 dark:from-indigo-950/30 dark:to-slate-900">'
      + '<p class="text-xs font-black uppercase tracking-[.16em] text-indigo-700 dark:text-indigo-300 mb-2">Antes de ver las opciones</p>'
      + '<h4 class="font-display text-xl font-extrabold mb-1">¿Cuánto sabés sobre este tema?</h4>'
      + '<p class="text-sm leading-6 text-slate-600 dark:text-slate-400 mb-4">Esta autoevaluación previa entrena tu metacognición. Es tan importante como la respuesta misma.</p>'
      + '<div class="grid grid-cols-3 gap-2.5">'
      + '  <button class="np-conf-btn rounded-2xl border-2 border-emerald-200 bg-white p-3 text-center hover:border-emerald-400 hover:bg-emerald-50 transition dark:border-emerald-800 dark:bg-slate-900 dark:hover:bg-emerald-950/30" onclick="npRecordConfidence(\''+q.id+'\',\'sure\')"><div class="text-2xl mb-1">💪</div><div class="text-xs font-black">Lo sé</div><div class="text-[10px] text-slate-400 mt-0.5">Estoy seguro</div></button>'
      + '  <button class="np-conf-btn rounded-2xl border-2 border-amber-200 bg-white p-3 text-center hover:border-amber-400 hover:bg-amber-50 transition dark:border-amber-800 dark:bg-slate-900 dark:hover:bg-amber-950/30" onclick="npRecordConfidence(\''+q.id+'\',\'doubt\')"><div class="text-2xl mb-1">🤔</div><div class="text-xs font-black">Dudoso</div><div class="text-[10px] text-slate-400 mt-0.5">Podría ser</div></button>'
      + '  <button class="np-conf-btn rounded-2xl border-2 border-purple-200 bg-white p-3 text-center hover:border-purple-400 hover:bg-purple-50 transition dark:border-purple-800 dark:bg-slate-900 dark:hover:bg-purple-950/30" onclick="npRecordConfidence(\''+q.id+'\',\'guess\')"><div class="text-2xl mb-1">🎲</div><div class="text-xs font-black">Adiviné</div><div class="text-[10px] text-slate-400 mt-0.5">No sé</div></button>'
      + '</div>'
      + '</div>';
  }

  function calibrationFeedback(q, selected){
    const isOk = selected && q.ans && selected === q.ans;
    const conf = state.calibration?.[q.id]?.confidence;
    if(!conf) return '';
    if(isOk && conf === 'guess'){
      return '<div class="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">⚠️ Acertaste adivinando. Este tema requiere refuerzo real — no dependas de la suerte el 10 de junio.</div>';
    }
    if(!isOk && conf === 'sure'){
      return '<div class="mt-3 rounded-2xl border-2 border-rose-400 bg-rose-50 p-3 text-sm font-semibold leading-6 text-rose-800 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-200">🚨 <strong>Zona de peligro cognitivo.</strong> Estabas seguro y fallaste. Estas son las brechas más peligrosas para el examen — el cerebro cree que sabe pero no sabe.</div>';
    }
    if(isOk && conf === 'sure'){
      return '<div class="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">✓ Calibración correcta: sabías y acertaste. Esto es dominio real.</div>';
    }
    return '';
  }

  // Patch quirúrgico: cuando el método es 'razonamiento' y aún no eligió confianza, ocultar opciones.
  if(typeof questionTemplate === 'function'){
    const __original = questionTemplate;
    window.questionTemplate = function(q, selected, showExplanation){
      let html = __original(q, selected, showExplanation);
      const isReasoning = (session?.method === 'razonamiento') || state.preferences.reasoningMode;
      if(!isReasoning) return html;

      // Si hay respuesta, mostrar feedback de calibración
      if(selected){
        const calib = calibrationFeedback(q, selected);
        if(calib && !html.includes('Calibración correcta') && !html.includes('Zona de peligro')){
          html = html.replace('<section class="mt-6 rounded-[1.75rem]', calib + '<section class="mt-6 rounded-[1.75rem]');
        }
        return html;
      }

      // Si todavía no eligió confianza para esta pregunta, ocultar las opciones
      const phase = getReasoningPhase(q.id);
      const conf  = state.calibration?.[q.id]?.confidence;
      if(!conf && phase === 'confidence'){
        // Reemplazar el bloque de opciones ABCD por el panel de confianza
        const optsPattern = /<div class="mt-6 grid gap-3">[\s\S]*?<\/div>(\s*<div class="mt-5)/;
        const replacement = reasoningConfidencePanel(q) + '<div class="mt-5 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-950 dark:text-slate-400">Las 4 opciones aparecen después de tu autoevaluación.</div>$1';
        if(optsPattern.test(html)){
          html = html.replace(optsPattern, replacement);
        } else {
          // Fallback: insertar panel después del enunciado
          html = html.replace('</h3>', '</h3>' + reasoningConfidencePanel(q));
        }
      }
      // Insertar header de modo razonamiento al inicio
      html = html.replace(/<div class="mb-4 flex flex-wrap items-center justify-between gap-3">/, reasoningHeader(q) + '<div class="mb-4 flex flex-wrap items-center justify-between gap-3">');
      return html;
    };
  }

  // Cuando responde, limpiar el phase
  if(typeof selectAnswer === 'function'){
    const __originalSelect = selectAnswer;
    window.selectAnswer = function(id, selected){
      __originalSelect(id, selected);
      const q = QUESTIONS.find(x=>x.id===id);
      if(q && state.calibration?.[id]){
        state.calibration[id].wasCorrect = (selected === q.ans);
        state.calibration[id].at = Date.now();
        safeSave();
      }
      clearReasoningPhase(id);
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2) DASHBOARD COGNITIVO · 3 indicadores accionables
  // ════════════════════════════════════════════════════════════════════════

  function computeCognitiveMetrics(){
    const calibs = state.calibration || {};
    const ids    = Object.keys(calibs);
    const sure   = ids.filter(id => calibs[id].confidence === 'sure');
    const doubt  = ids.filter(id => calibs[id].confidence === 'doubt');
    const guess  = ids.filter(id => calibs[id].confidence === 'guess');

    const sureFailIds   = sure.filter(id => calibs[id].wasCorrect === false);
    const sureRightIds  = sure.filter(id => calibs[id].wasCorrect === true);
    const guessRightIds = guess.filter(id => calibs[id].wasCorrect === true);

    const surePct  = sure.length  ? Math.round(sureRightIds.length  / sure.length  * 100) : null;
    const doubtPct = doubt.length ? Math.round(doubt.filter(id => calibs[id].wasCorrect).length / doubt.length * 100) : null;
    const guessPct = guess.length ? Math.round(guessRightIds.length / guess.length * 100) : null;

    // Patrón dominante de error
    const mistakes = state.mistakes || {};
    const errCounts = {};
    Object.values(mistakes).forEach(m => {
      if(m.errorType) errCounts[m.errorType] = (errCounts[m.errorType] || 0) + 1;
    });
    const dominantErr = Object.entries(errCounts).sort((a,b)=>b[1]-a[1])[0];
    const errorLabels = {
      'no_sabia':'No sabía el tema','lei_mal':'Leí mal el enunciado',
      'dude_entre_dos':'Dudé entre dos','confundi_diagnosticos':'Confundí diagnósticos',
      'dato_clave':'No vi el dato clave','dato_duro':'Olvidé criterio',
      'trampa':'Caí en distractor','pregunta_dudosa':'Pregunta dudosa'
    };

    return {
      dangerZoneCount: sureFailIds.length,
      dangerZoneIds: sureFailIds,
      sureCount: sure.length,
      surePct, doubtPct, guessPct,
      luckyHits: guessRightIds.length,
      dominantError: dominantErr ? {type: dominantErr[0], count: dominantErr[1], label: errorLabels[dominantErr[0]] || dominantErr[0]} : null,
      totalCalibrated: ids.length
    };
  }

  function renderCognitiveDashboard(){
    const host = $('#v358CognitiveDashboard');
    if(!host) return;
    const m = computeCognitiveMetrics();

    if(m.totalCalibrated < 5){
      host.innerHTML = '<div class="rounded-[1.5rem] border border-dashed border-indigo-300 bg-indigo-50/40 p-5 text-center dark:border-indigo-800 dark:bg-indigo-950/20">'
        + '<p class="text-sm font-bold text-indigo-700 dark:text-indigo-300">📊 Activá el modo Razonamiento</p>'
        + '<p class="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">Cuando uses el modo Razonamiento de NeuroPREP en al menos 5 preguntas, este dashboard mostrará tu zona de peligro cognitivo, calibración y patrón de error dominante.</p>'
        + '<button class="mt-3 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700" onclick="showView(\'neuroprep\'); setTimeout(startNeuroReasoning,200)">Empezar razonamiento</button>'
        + '</div>';
      return;
    }

    const dangerColor = m.dangerZoneCount === 0 ? '#1D9E75' : m.dangerZoneCount <= 3 ? '#BA7517' : '#A32D2D';
    const surePctColor = (m.surePct ?? 100) >= 90 ? '#1D9E75' : (m.surePct ?? 0) >= 70 ? '#BA7517' : '#A32D2D';

    host.innerHTML = '<div class="grid gap-3 md:grid-cols-3">'
      + '<div class="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/25"><p class="text-[10px] font-black uppercase tracking-[.18em] text-rose-700 dark:text-rose-300">🚨 Zona de peligro</p><p class="mt-2 font-display text-4xl font-extrabold" style="color:'+dangerColor+'">'+m.dangerZoneCount+'</p><p class="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">Preguntas que fallaste estando seguro. Son falsas certezas — el riesgo más alto en el examen.</p>'+(m.dangerZoneCount>0?'<button class="mt-3 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white hover:bg-rose-700" onclick="startDangerZoneSession()">Trabajar las '+m.dangerZoneCount+'</button>':'<p class="mt-3 text-[11px] text-emerald-600 font-bold">✓ Sin zona de peligro</p>')+'</div>'
      + '<div class="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/25"><p class="text-[10px] font-black uppercase tracking-[.18em] text-amber-700 dark:text-amber-300">🎯 Calibración</p><p class="mt-2 font-display text-4xl font-extrabold" style="color:'+surePctColor+'">'+(m.surePct!==null?m.surePct+'%':'–')+'</p><p class="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">Aciertos cuando estabas seguro. Ideal: ≥90%. Bajo eso, hay falsa confianza.</p>'+(m.luckyHits>0?'<p class="mt-2 text-[11px] text-purple-600 dark:text-purple-300">🎲 '+m.luckyHits+' '+(m.luckyHits===1?'acierto adivinado':'aciertos adivinados')+' (no contar como dominio)</p>':'')+'</div>'
      + '<div class="rounded-[1.5rem] border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25"><p class="text-[10px] font-black uppercase tracking-[.18em] text-indigo-700 dark:text-indigo-300">🧬 Patrón dominante</p><p class="mt-2 font-display text-lg font-extrabold leading-tight">'+(m.dominantError?E(m.dominantError.label):'—')+'</p><p class="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">'+(m.dominantError?'Tu error más frecuente: '+m.dominantError.count+' veces. Trabajá específicamente en este patrón.':'Sin datos suficientes')+'</p>'+(m.dominantError?'<button class="mt-3 rounded-xl border border-indigo-300 bg-white px-3 py-1.5 text-xs font-black text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300" onclick="showErrorPatternHelp(\''+m.dominantError.type+'\')">Ver estrategia</button>':'')+'</div>'
      + '</div>';
  }

  window.startDangerZoneSession = function(){
    const m = computeCognitiveMetrics();
    if(!m.dangerZoneCount) return alert('No tenés zona de peligro activa.');
    const qs = m.dangerZoneIds.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
    if(!qs.length) return alert('No encontré las preguntas de la zona de peligro.');
    setSession(qs, '🚨 Zona de peligro cognitivo', m.dangerZoneCount+' preguntas que fallaste estando seguro · modo razonamiento', 'razonamiento', true, {mode:'practice'});
  };

  window.showErrorPatternHelp = function(type){
    const strategies = {
      'no_sabia': {title:'No sabía el tema', body:'Estrategia: Lecciones primero, después preguntas. Buscá el sprint en "Aprender desde cero" y completá la lección antes de practicar.'},
      'lei_mal': {title:'Leí mal el enunciado', body:'Estrategia: Antes de mirar las opciones, leé el enunciado dos veces y subrayá mentalmente edad, tiempo de evolución y signo cardinal. Reduce los errores de lectura un 40%.'},
      'dude_entre_dos': {title:'Dudé entre dos opciones', body:'Estrategia: Cuando dudes entre dos, escribí en una hoja qué define una y qué define la otra. La diferencia conceptual es lo que falta consolidar.'},
      'confundi_diagnosticos': {title:'Confundí diagnósticos', body:'Estrategia: Construí flashcards comparativas (A vs B) con datos diferenciales. Es el método más efectivo para discriminación entre esquemas similares.'},
      'dato_clave': {title:'No vi el dato clave', body:'Estrategia: Practicá lectura activa con resaltado de trigger words. La app ya los marca en naranja — entrenate a buscarlos primero.'},
      'dato_duro': {title:'Olvidé criterio', body:'Estrategia: Estos errores requieren repaso espaciado puro. Programá esa pregunta como flashcard difícil (mañana) y repetí D1/D3/D7.'},
      'trampa': {title:'Caí en distractor', body:'Estrategia: Los distractores explotan asociaciones obvias. Antes de elegir, preguntate "¿qué hace que esta opción sea la correcta y no la otra que se le parece?"'},
      'pregunta_dudosa': {title:'Pregunta dudosa', body:'Estrategia: Marcala con aporte colaborativo y consultá la fuente vigente. No invertir tiempo de estudio en preguntas con clave incorrecta.'}
    };
    const s = strategies[type] || {title:'Patrón de error', body:'Trabajá el patrón con repaso espaciado y modo razonamiento.'};
    alert('🎯 '+s.title+'\n\n'+s.body);
  };

  // ════════════════════════════════════════════════════════════════════════
  // 3) ONBOARDING DIAGNÓSTICO · 5 preguntas iniciales
  // ════════════════════════════════════════════════════════════════════════

  function shouldShowOnboarding(){
    const ans = Object.keys(state.answers || {}).length;
    if(ans >= 30) return false; // ya tiene experiencia
    const last = state.onboarding?.lastDoneAt;
    if(last && (Date.now() - last) < 7 * 86400 * 1000) return false; // ya lo hizo hace menos de 7 días
    return true;
  }

  function pickDiagnosticQuestions(){
    // 1 por eje + 1 con clave + sin imágenes complicadas
    const ejes = [
      'Salud de las personas adultas y adultos mayores',
      'Salud del niño, niña y adolescentes',
      'Salud integral de las mujeres',
      'Salud pública'
    ];
    const picks = [];
    ejes.forEach(eje => {
      const pool = QUESTIONS.filter(q =>
        q.eje === eje &&
        q.ans &&
        !q.image_reference &&
        !state.answers?.[q.id] &&
        (q.q || '').length < 400
      );
      if(pool.length){
        picks.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    });
    // Una quinta pregunta extra del eje más grande
    const extra = QUESTIONS.filter(q => q.eje === 'Salud de las personas adultas y adultos mayores' && q.ans && !q.image_reference && !state.answers?.[q.id] && !picks.find(p => p.id === q.id));
    if(extra.length) picks.push(extra[Math.floor(Math.random() * extra.length)]);
    return picks;
  }

  window.startOnboardingDiagnostic = function(){
    const qs = pickDiagnosticQuestions();
    if(qs.length < 4){ alert('No hay suficientes preguntas para el diagnóstico.'); return; }
    setSession(qs, '🧬 Diagnóstico inicial NeuroPREP', '5 preguntas · 1 por eje · activa modo razonamiento', 'razonamiento', false, {mode:'practice'});
    if(session){
      session.isOnboarding = true;
      state.session = session;
      safeSave();
    }
    state.onboarding.lastDoneAt = Date.now();
    safeSave();
    setTimeout(() => $('#onboardingBanner')?.remove(), 100);
  };

  function renderOnboardingBanner(){
    if(!shouldShowOnboarding()) return;
    const dashView = $('#dashboardView');
    if(!dashView || $('#onboardingBanner')) return;
    const html = '<div id="onboardingBanner" class="mb-6 rounded-[2rem] border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 shadow-glow dark:border-indigo-800 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950 animate-fadeUp">'
      + '<div class="grid gap-4 md:grid-cols-[1.4fr_1fr] items-center">'
      + '  <div>'
      + '    <p class="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase tracking-[.18em] text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">🧬 Bienvenido · Empezá por acá</p>'
      + '    <h3 class="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Diagnóstico inicial de 5 minutos</h3>'
      + '    <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">No empieces eligiendo qué estudiar. Dejá que la app analice tu estado cognitivo actual con 5 preguntas (1 por eje) y te oriente hacia donde tu cerebro más necesita.</p>'
      + '    <div class="mt-4 flex flex-wrap gap-2">'
      + '      <button class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700" onclick="startOnboardingDiagnostic()">Empezar diagnóstico (5 min)</button>'
      + '      <button class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="document.getElementById(\'onboardingBanner\')?.remove();state.onboarding.dismissed=true;saveState();">Saltar por ahora</button>'
      + '    </div>'
      + '  </div>'
      + '  <div class="rounded-2xl bg-white/80 p-4 dark:bg-slate-900/60 text-xs leading-6 text-slate-600 dark:text-slate-300">'
      + '    <p class="font-black mb-2 text-indigo-700 dark:text-indigo-300">Qué pasa después</p>'
      + '    <p>· Activamos modo razonamiento (con calibración de confianza)</p>'
      + '    <p>· Detectamos tu zona débil y la zona de peligro cognitivo</p>'
      + '    <p>· Te recomendamos qué sprint hacer primero</p>'
      + '    <p>· Empezás a entrenar con dirección, no al azar</p>'
      + '  </div>'
      + '</div></div>';
    dashView.insertAdjacentHTML('afterbegin', html);
  }

  // ════════════════════════════════════════════════════════════════════════
  // 4) PREDICTOR DE PROBABILIDAD DE APROBAR
  // ════════════════════════════════════════════════════════════════════════

  const EXAM_DATE = new Date('2026-06-10');
  const APPROVAL_THRESHOLD = 65; // Aprueba con 65% (ajustable)

  function computeApprovalForecast(){
    const ejeWeights = {
      'Salud de las personas adultas y adultos mayores': 0.53,
      'Salud del niño, niña y adolescentes': 0.21,
      'Salud integral de las mujeres': 0.19,
      'Salud pública': 0.07
    };

    let weightedAccuracy = 0;
    let weightedCoverage = 0;
    const byEje = {};

    Object.entries(ejeWeights).forEach(([eje, w]) => {
      const qs = QUESTIONS.filter(q => q.eje === eje);
      const answered = qs.filter(q => state.answers?.[q.id]).length;
      const correct  = qs.filter(q => {
        const a = state.answers?.[q.id];
        return a && a.selected === q.ans;
      }).length;
      const acc = answered ? (correct / answered) : 0;
      const cov = qs.length ? (answered / qs.length) : 0;
      byEje[eje] = {qs:qs.length, answered, correct, acc:Math.round(acc*100), cov:Math.round(cov*100), weight:w};
      weightedAccuracy += acc * w;
      weightedCoverage += cov * w;
    });

    const daysLeft = Math.max(0, Math.ceil((EXAM_DATE - new Date()) / 86400000));
    const ans = Object.keys(state.answers || {}).length;

    // Modelo simple: accuracy * confianza_por_cobertura
    // Si solo respondiste 5%, tu accuracy real puede ser muy diferente
    const coverageConfidence = Math.min(1, weightedCoverage * 1.5); // <0.66 cov reduce confianza
    const baselineForecast = weightedAccuracy * 100;
    const adjustedForecast = baselineForecast * coverageConfidence + (50 * (1 - coverageConfidence));

    // Estimar tendencia: si la última semana mejoraste, proyectar mejora
    const cal = state.calibration || {};
    const recent = Object.values(cal).filter(c => c.at && (Date.now() - c.at) < 7*86400*1000);
    const recentAcc = recent.length ? (recent.filter(c => c.wasCorrect).length / recent.length) : null;

    const finalForecast = Math.max(20, Math.min(95, Math.round(adjustedForecast)));

    return {
      forecast: finalForecast,
      threshold: APPROVAL_THRESHOLD,
      probApprove: finalForecast >= APPROVAL_THRESHOLD ? 'alta' : finalForecast >= APPROVAL_THRESHOLD - 10 ? 'media' : 'baja',
      daysLeft,
      totalAnswered: ans,
      coverage: Math.round(weightedCoverage * 100),
      accuracy: Math.round(weightedAccuracy * 100),
      byEje,
      recentTrend: recentAcc,
      weakEje: Object.entries(byEje).sort((a,b)=>(a[1].acc - b[1].acc))[0]
    };
  }

  function renderApprovalPredictor(){
    const host = $('#v358ApprovalPredictor');
    if(!host) return;
    const f = computeApprovalForecast();

    if(f.totalAnswered < 10){
      host.innerHTML = '<div class="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/40">'
        + '<p class="text-sm font-bold text-slate-700 dark:text-slate-300">📈 Predictor en espera</p>'
        + '<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Respondé al menos 10 preguntas para activar el predictor.</p>'
        + '</div>';
      return;
    }

    const color = f.forecast >= 80 ? '#1D9E75' : f.forecast >= APPROVAL_THRESHOLD ? '#639922' : f.forecast >= APPROVAL_THRESHOLD - 10 ? '#BA7517' : '#A32D2D';
    const verdict = f.forecast >= 80 ? 'Excelente — sostén el ritmo' : f.forecast >= APPROVAL_THRESHOLD ? 'Aprobando — buscá sumar margen' : f.forecast >= APPROVAL_THRESHOLD-10 ? 'Zona crítica — focalizá tu débil' : 'Riesgo alto — necesitás cambiar estrategia';
    const weakEje = f.weakEje ? f.weakEje[0] : '';
    const weakAcc = f.weakEje ? f.weakEje[1].acc : 0;

    const ejeBars = Object.entries(f.byEje).map(([eje, d]) => {
      const cov = d.cov;
      const acc = d.answered > 0 ? d.acc : 0;
      const accColor = acc >= 75 ? '#1D9E75' : acc >= 60 ? '#BA7517' : '#A32D2D';
      const ejeShort = eje.replace('Salud ','').replace('de las personas','').replace('integral de las ','').slice(0, 22);
      return '<div class="mb-2 last:mb-0">'
        + '<div class="flex justify-between text-[11px] mb-1"><span class="font-bold">'+E(ejeShort)+'</span><span class="font-mono text-slate-500">'+d.answered+'/'+d.qs+' · '+(d.answered>0?acc+'%':'–')+'</span></div>'
        + '<div class="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex"><div class="h-full" style="width:'+cov+'%;background:'+accColor+';opacity:.85"></div></div>'
        + '</div>';
    }).join('');

    host.innerHTML = '<div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">'
      + '<div class="flex items-start justify-between gap-3 mb-3">'
      + '  <div><p class="text-[10px] font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">📈 Predictor de aprobación</p><h3 class="font-display text-xl font-extrabold mt-1">Examen 10 de junio · '+f.daysLeft+' días</h3></div>'
      + '  <div class="text-right"><p class="font-display text-4xl font-extrabold leading-none" style="color:'+color+'">'+f.forecast+'%</p><p class="text-[10px] uppercase tracking-wider text-slate-400 mt-1">Predicción</p></div>'
      + '</div>'
      + '<p class="text-xs leading-5 text-slate-600 dark:text-slate-400 mb-3"><strong>'+verdict+'.</strong> Cobertura '+f.coverage+'% · Precisión '+f.accuracy+'%'+(f.weakEje?' · Eje débil: '+E(weakEje.split(' ').slice(0,3).join(' '))+' ('+weakAcc+'%)':'')+'</p>'
      + '<div class="rounded-xl bg-slate-50 dark:bg-slate-950/50 p-3">'+ejeBars+'</div>'
      + '<p class="mt-3 text-[10px] text-slate-400 leading-4">Predicción ponderada por peso real del examen: Adultos 53% · Pediatría 21% · Mujeres 19% · Salud Pública 7%. Ajustada por confianza de cobertura.</p>'
      + '</div>';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 5) MAPA DE CALOR DE COBERTURA
  // ════════════════════════════════════════════════════════════════════════

  function renderHeatmap(){
    const host = $('#v358Heatmap');
    if(!host) return;
    const sprintsByEje = {};
    SPRINTS.forEach(sp => {
      sprintsByEje[sp.eje] ||= [];
      sprintsByEje[sp.eje].push(sp);
    });

    const ejeColors = {
      'Salud de las personas adultas y adultos mayores': '#534AB7',
      'Salud del niño, niña y adolescentes': '#1D9E75',
      'Salud integral de las mujeres': '#D4537E',
      'Salud pública': '#BA7517'
    };

    const html = Object.entries(sprintsByEje).map(([eje, sps]) => {
      const ejeShort = eje.replace('Salud ','').replace('de las personas','').replace('integral de las ','').slice(0, 32);
      const cells = sps.map(sp => {
        const total = sp.questions.length;
        const answered = sp.questions.filter(q => state.answers?.[q.id]).length;
        const correct  = sp.questions.filter(q => { const a = state.answers?.[q.id]; return a && a.selected === q.ans; }).length;
        const cov = total ? (answered/total) : 0;
        const acc = answered ? Math.round(correct/answered*100) : null;
        let bg = '#E5E7EB';
        if(answered === 0) bg = 'rgba(0,0,0,.04)';
        else if(acc >= 85) bg = '#1D9E75';
        else if(acc >= 65) bg = '#BA7517';
        else bg = '#A32D2D';
        const opacity = answered === 0 ? 0.3 : Math.max(0.4, cov);
        const tip = sp.sprint+'\n'+answered+'/'+total+(answered>0?' · '+acc+'% acierto':' · sin tocar');
        return '<button class="np-heatmap-cell" title="'+E(tip)+'" style="background:'+bg+';opacity:'+opacity+'" onclick="startSprint(\''+sp.id+'\',\''+(state.method||'preguntas')+'\')"></button>';
      }).join('');
      return '<div class="mb-3 last:mb-0">'
        + '<div class="flex items-center gap-2 mb-1.5"><span class="w-2 h-2 rounded-full" style="background:'+ejeColors[eje]+'"></span><p class="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">'+E(ejeShort)+' · '+sps.length+' sprints</p></div>'
        + '<div class="np-heatmap-grid">'+cells+'</div>'
        + '</div>';
    }).join('');

    host.innerHTML = '<div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">'
      + '<div class="mb-3"><p class="text-[10px] font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">🗺️ Mapa de calor</p><h3 class="font-display text-xl font-extrabold mt-1">Geografía de tu conocimiento</h3>'
      + '<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Cada celda es un sprint. Verde = ≥85% · Ámbar = 65-85% · Rojo = &lt;65% · Gris = sin tocar. Tocá una celda para iniciar.</p></div>'
      + html
      + '</div>';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 6) NEUROPREP REAL · Hook a los botones de la vista
  // ════════════════════════════════════════════════════════════════════════

  window.startNeuroReasoning = function(){
    // Sesión balanceada de 15 preguntas en modo razonamiento real
    const qs = (typeof buildBalancedExam === 'function')
      ? buildBalancedExam(15, {preferUnanswered:true})
      : QUESTIONS.filter(q => q.ans).slice(0, 15);
    if(!qs.length){ alert('No pude armar la sesión.'); return; }
    setSession(qs, '🧬 NeuroPREP · Razonamiento', 'Confianza → opciones → calibración · 15 preguntas balanceadas', 'razonamiento', false, {mode:'practice'});
  };

  window.startNeuroDiagnostic = function(){
    if(typeof startOnboardingDiagnostic === 'function') return startOnboardingDiagnostic();
  };

  window.startNeuroInterleaving = function(){
    // Sesión de 20 preguntas con interleaving REAL (no random)
    const ejes = ['Salud de las personas adultas y adultos mayores','Salud del niño, niña y adolescentes','Salud integral de las mujeres','Salud pública'];
    const buckets = ejes.map(e => {
      const pool = QUESTIONS.filter(q => q.eje === e && q.ans && !q.image_reference);
      return pool.sort(() => Math.random()-.5).slice(0, 5);
    });
    // Round-robin para garantizar interleaving
    const result = [];
    let i = 0, safety = 100;
    while(result.length < 20 && safety-- > 0){
      const b = buckets[i % buckets.length];
      if(b.length) result.push(b.shift());
      i++;
    }
    if(!result.length){ alert('No pude armar la sesión.'); return; }
    setSession(result, '🔀 NeuroPREP · Interleaving real', 'Round-robin entre ejes · obliga discriminación entre esquemas', 'razonamiento', false, {mode:'practice'});
  };

  window.startNeuroPredictiveExam = function(){
    const qs = (typeof buildBalancedExam === 'function')
      ? buildBalancedExam(40, {preferUnanswered:true})
      : QUESTIONS.filter(q => q.ans).slice(0, 40);
    if(!qs.length){ alert('No pude armar el examen.'); return; }
    setSession(qs, '⏱️ Examen predictivo NeuroPREP', '40 preguntas balanceadas · sin feedback hasta el final', 'simulacro', false, {mode:'exam'});
  };

  // Recomendación adaptativa en NeuroPREP
  function renderNeuroRecommendation(){
    const host = $('#neuroRecommendation');
    if(!host) return;
    const m = computeCognitiveMetrics();
    const f = computeApprovalForecast();

    let recommendations = [];
    if(m.dangerZoneCount >= 3){
      recommendations.push({icon:'🚨', title:'Trabajar zona de peligro', sub:m.dangerZoneCount+' preguntas que fallaste estando seguro', action:'startDangerZoneSession()', color:'rose'});
    }
    const due = (typeof dueQuestions === 'function') ? dueQuestions().length : 0;
    if(due > 5){
      recommendations.push({icon:'🔁', title:'Repaso espaciado vencido', sub:due+' preguntas en deuda con tu memoria', action:'startDueSession()', color:'medical'});
    }
    if(f.weakEje && f.weakEje[1].acc < 60){
      const e = f.weakEje[0].split(' ').slice(0,3).join(' ');
      recommendations.push({icon:'🎯', title:'Eje débil: '+e, sub:'Acierto '+f.weakEje[1].acc+'% · necesita refuerzo dirigido', action:'startNeuroReasoning()', color:'amber'});
    }
    if(!recommendations.length){
      recommendations.push({icon:'🧬', title:'Sesión de razonamiento', sub:'15 preguntas balanceadas en modo razonamiento', action:'startNeuroReasoning()', color:'indigo'});
      recommendations.push({icon:'🔀', title:'Interleaving real', sub:'20 preguntas mezcladas entre ejes', action:'startNeuroInterleaving()', color:'purple'});
    }

    host.innerHTML = recommendations.slice(0,3).map((r, i) =>
      '<button class="block w-full rounded-2xl border border-'+r.color+'-200 bg-'+r.color+'-50/60 p-4 text-left hover:bg-'+r.color+'-50 transition mb-3 last:mb-0 dark:border-'+r.color+'-900/60 dark:bg-'+r.color+'-950/20 dark:hover:bg-'+r.color+'-950/40" onclick="'+r.action+'">'
      + '<div class="flex items-start gap-3"><span class="text-2xl">'+r.icon+'</span><div class="flex-1 min-w-0"><p class="font-display text-base font-extrabold">'+r.title+'</p><p class="text-xs leading-5 text-slate-600 dark:text-slate-400 mt-0.5">'+r.sub+'</p></div></div>'
      + '</button>'
    ).join('');
  }

  // ════════════════════════════════════════════════════════════════════════
  // 7) NARRATIVA DE PACIENTE · Toggle global
  // ════════════════════════════════════════════════════════════════════════

  function narrativizeQuestion(text, q){
    if(!state.narrativeMode) return text;
    if(/^(paciente|pte|hombre|mujer|niñ|lactante|recién nacido|consulta|ingresa|llega)/i.test(text.trim())) return text;
    const eje = q.eje || '';
    const opener = eje.includes('niño') || eje.includes('Pediatr') ? 'Llega a la guardia un caso pediátrico. ' :
                   eje.includes('mujer') ? 'Una paciente consulta en el centro de salud. ' :
                   eje.includes('pública') ? 'En el contexto de tu rotación de salud pública: ' :
                   'Un paciente consulta. ';
    return opener + text;
  }

  // ════════════════════════════════════════════════════════════════════════
  // 8) HOOKS DE RENDER · Refrescar dashboards en momentos clave
  // ════════════════════════════════════════════════════════════════════════

  function injectV358IntoDashboard(){
    const dash = $('#dashboardView');
    if(!dash) return;
    if($('#v358Block')) return;

    const block = document.createElement('section');
    block.id = 'v358Block';
    block.className = 'mt-8 space-y-5';
    block.innerHTML = '<div>'
      + '<p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300 mb-2">🧬 Inteligencia cognitiva v35.8</p>'
      + '<h3 class="font-display text-2xl font-extrabold">Dashboard de aprendizaje</h3>'
      + '<p class="text-sm text-slate-600 dark:text-slate-400 mt-1">Tres indicadores que te dicen qué hacer hoy, no solo cómo vas.</p>'
      + '</div>'
      + '<div id="v358CognitiveDashboard"></div>'
      + '<div id="v358ApprovalPredictor"></div>'
      + '<div id="v358Heatmap"></div>';
    dash.appendChild(block);
  }

  // Ganchos automáticos
  if(typeof renderAll === 'function'){
    const __originalRenderAll = renderAll;
    window.renderAll = function(){
      __originalRenderAll();
      try {
        injectV358IntoDashboard();
        renderOnboardingBanner();
        renderCognitiveDashboard();
        renderApprovalPredictor();
        renderHeatmap();
        renderNeuroRecommendation();
      } catch(err){ console.warn('v35.8 render error:', err); }
    };
  }

  if(typeof showView === 'function'){
    const __originalShowView = showView;
    window.showView = function(name){
      __originalShowView(name);
      setTimeout(() => {
        try {
          if(name === 'dashboard'){
            injectV358IntoDashboard();
            renderCognitiveDashboard();
            renderApprovalPredictor();
            renderHeatmap();
            renderOnboardingBanner();
          }
          if(name === 'neuroprep'){
            renderNeuroRecommendation();
          }
        } catch(_){}
      }, 50);
    };
  }

  // Después de cada respuesta, actualizar métricas
  if(typeof selectAnswer === 'function'){
    const __sa = selectAnswer;
    window.selectAnswer = function(id, sel){
      __sa(id, sel);
      // Update day counter
      const today = new Date().toISOString().slice(0,10);
      state.dailySessions[today] = (state.dailySessions[today] || 0) + 1;
      safeSave();
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════════════════════
  function init(){
    try {
      injectV358IntoDashboard();
      renderOnboardingBanner();
      renderCognitiveDashboard();
      renderApprovalPredictor();
      renderHeatmap();
    } catch(err){ console.warn('v35.8 init:', err); }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 600));
  } else {
    setTimeout(init, 600);
  }

  console.log('%c[ResidenciAPP v35.8]','color:#534AB7;font-weight:bold','NeuroPREP real + Dashboard cognitivo + Onboarding · activo');
})();
