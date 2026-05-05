/* ════════════════════════════════════════════════════════════════════════
   ResidenciAPP v35.9 · Inteligencia cognitiva · REFACTOR FINAL
   ════════════════════════════════════════════════════════════════════════
   Filosofía: NO duplicar el sistema NeuroPREP nativo. Lee de
   state.neuroprep.reasoning (que ya existe) y agrega:
   - Sidebar limpio (sin redundancias).
   - Dashboard cognitivo: 3 indicadores accionables.
   - Predictor de aprobación ponderado por peso real del examen.
   - Heatmap de cobertura por sprint.
   - Onboarding diagnóstico para usuarios nuevos.
   ════════════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';
  if (window.__RESIDENCIAPP_V359__) return;
  window.__RESIDENCIAPP_V359__ = true;

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E  = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSave = () => { try { saveState(); } catch(_){} };

  // Estado adicional · solo onboarding (la calibración usa state.neuroprep.reasoning)
  function ensureV359State(){
    state.onboarding ||= {};
  }
  ensureV359State();

  // ────────────────────────────────────────────────────────────────────
  // LIMPIEZA DEL SIDEBAR
  // ────────────────────────────────────────────────────────────────────
  function cleanSidebar(){
    $('#collabToggleBtn')?.remove();

    const methods = document.querySelector('[data-nav="methods"]');
    if (methods) methods.style.display = 'none';

    const library = document.querySelector('[data-nav="library"]');
    if (library) library.style.display = 'none';

    const nav = document.querySelector('aside nav.space-y-2');
    if (nav) {
      const order = ['dashboard', 'neuroprep', 'session', 'review', 'temario', 'learn', 'games'];
      const buttons = order
        .map(name => nav.querySelector(`[data-nav="${name}"]`))
        .filter(Boolean);
      buttons.forEach(b => nav.appendChild(b));
    }

    const np = document.querySelector('[data-nav="neuroprep"]');
    if (np && !np.classList.contains('v359-styled')) {
      np.classList.add('v359-styled');
      np.classList.remove('hover:bg-indigo-50');
      np.classList.add('bg-indigo-50','text-indigo-700','border','border-indigo-200',
                        'dark:bg-indigo-950/30','dark:text-indigo-300','dark:border-indigo-900/50');
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // MÉTRICAS · Lee de state.neuroprep.reasoning (sistema nativo)
  // ────────────────────────────────────────────────────────────────────
  function computeCognitiveMetrics(){
    const reasoning = state.neuroprep?.reasoning || {};
    const ids = Object.keys(reasoning);

    const evaluated = ids.filter(id => state.answers?.[id]).map(id => {
      const q = QUESTIONS.find(x => x.id === id);
      const ans = state.answers[id];
      return {
        id,
        confidence: reasoning[id].confidence || 'sin_calibrar',
        wasCorrect: q && ans && ans.selected === q.ans,
        q
      };
    });

    const sure  = evaluated.filter(e => e.confidence === 'seguro');
    const guess = evaluated.filter(e => e.confidence === 'adivine');
    const sureFails  = sure.filter(e => !e.wasCorrect);
    const sureRights = sure.filter(e => e.wasCorrect);
    const guessRights = guess.filter(e => e.wasCorrect);

    const surePct = sure.length ? Math.round(sureRights.length / sure.length * 100) : null;

    const errCounts = {};
    Object.values(state.mistakes || {}).forEach(m => {
      if (m.errorType) errCounts[m.errorType] = (errCounts[m.errorType] || 0) + 1;
    });
    const dominant = Object.entries(errCounts).sort((a,b) => b[1] - a[1])[0];
    const errLabels = {
      no_sabia:'No sabía el tema', lei_mal:'Leí mal el enunciado',
      dude_entre_dos:'Dudé entre dos', confundi_diagnosticos:'Confundí diagnósticos',
      dato_clave:'No vi el dato clave', dato_duro:'Olvidé criterio',
      trampa:'Caí en distractor', pregunta_dudosa:'Pregunta dudosa'
    };

    return {
      dangerZoneCount: sureFails.length,
      dangerZoneIds:   sureFails.map(e => e.id),
      sureCount:       sure.length,
      surePct,
      luckyHits:       guessRights.length,
      dominantError:   dominant ? {type:dominant[0], count:dominant[1], label:errLabels[dominant[0]] || dominant[0]} : null,
      totalCalibrated: evaluated.length
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // DASHBOARD COGNITIVO
  // ────────────────────────────────────────────────────────────────────
  function renderCognitiveDashboard(){
    const host = $('#v359CognitiveBlock');
    if (!host) return;
    const m = computeCognitiveMetrics();

    if (m.totalCalibrated < 3) {
      host.innerHTML = `
        <div class="rounded-[1.75rem] border border-dashed border-indigo-300 bg-indigo-50/50 p-6 text-center dark:border-indigo-800 dark:bg-indigo-950/20">
          <div class="text-3xl mb-2">🧬</div>
          <h3 class="font-display text-lg font-extrabold mb-1">Activá el dashboard cognitivo</h3>
          <p class="text-sm leading-6 text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Hacé al menos 3 preguntas en NeuroPREP con calibración de confianza.
            Después verás aquí tu zona de peligro, calibración y patrón de error dominante.
          </p>
          <button class="mt-4 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white shadow-glow hover:bg-indigo-700"
                  onclick="showView('neuroprep')">
            Ir a NeuroPREP →
          </button>
        </div>`;
      return;
    }

    const dangerColor = m.dangerZoneCount === 0 ? 'emerald' : m.dangerZoneCount <= 3 ? 'amber' : 'rose';
    const calibColor  = (m.surePct ?? 100) >= 90 ? 'emerald' : (m.surePct ?? 0) >= 70 ? 'amber' : 'rose';

    host.innerHTML = `
      <div class="grid gap-3 md:grid-cols-3">

        <div class="rounded-[1.5rem] border border-${dangerColor}-200 bg-${dangerColor}-50 p-5 dark:border-${dangerColor}-900/60 dark:bg-${dangerColor}-950/25">
          <p class="text-[10px] font-black uppercase tracking-[.18em] text-${dangerColor}-700 dark:text-${dangerColor}-300">🚨 Zona de peligro</p>
          <p class="mt-2 font-display text-5xl font-extrabold text-${dangerColor}-700 dark:text-${dangerColor}-300">${m.dangerZoneCount}</p>
          <p class="mt-1 text-xs font-bold leading-5 text-slate-600 dark:text-slate-400">
            ${m.dangerZoneCount === 0
              ? 'Sin falsa seguridad detectada. Buen control metacognitivo.'
              : 'Preguntas que fallaste estando seguro. El riesgo más alto del examen.'}
          </p>
          ${m.dangerZoneCount > 0 ? `
            <button class="mt-3 rounded-xl bg-${dangerColor}-600 px-3 py-2 text-xs font-black text-white hover:bg-${dangerColor}-700"
                    onclick="v359StartDangerZone()">Trabajar las ${m.dangerZoneCount} →</button>
          ` : ''}
        </div>

        <div class="rounded-[1.5rem] border border-${calibColor}-200 bg-${calibColor}-50 p-5 dark:border-${calibColor}-900/60 dark:bg-${calibColor}-950/25">
          <p class="text-[10px] font-black uppercase tracking-[.18em] text-${calibColor}-700 dark:text-${calibColor}-300">🎯 Calibración</p>
          <p class="mt-2 font-display text-5xl font-extrabold text-${calibColor}-700 dark:text-${calibColor}-300">${m.surePct !== null ? m.surePct + '%' : '–'}</p>
          <p class="mt-1 text-xs font-bold leading-5 text-slate-600 dark:text-slate-400">
            Aciertos cuando estabas seguro. Ideal: ≥90%.
          </p>
          ${m.luckyHits > 0 ? `
            <p class="mt-2 text-[11px] text-purple-600 dark:text-purple-300 font-semibold">
              🎲 ${m.luckyHits} ${m.luckyHits === 1 ? 'acierto adivinando' : 'aciertos adivinando'} — no contar como dominio
            </p>` : ''}
        </div>

        <div class="rounded-[1.5rem] border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/25">
          <p class="text-[10px] font-black uppercase tracking-[.18em] text-indigo-700 dark:text-indigo-300">🧬 Patrón de error</p>
          <p class="mt-2 font-display text-xl font-extrabold leading-tight text-indigo-700 dark:text-indigo-300">
            ${m.dominantError ? E(m.dominantError.label) : 'Sin datos'}
          </p>
          <p class="mt-1 text-xs font-bold leading-5 text-slate-600 dark:text-slate-400">
            ${m.dominantError
              ? 'Tu error más frecuente: ' + m.dominantError.count + ' veces. Trabajá ese patrón específico.'
              : 'Clasificá tus errores en sesión para detectar patrones.'}
          </p>
          ${m.dominantError ? `
            <button class="mt-3 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-black text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300"
                    onclick="v359ShowStrategy('${m.dominantError.type}')">Ver estrategia →</button>
          ` : ''}
        </div>

      </div>`;
  }

  window.v359StartDangerZone = function(){
    const m = computeCognitiveMetrics();
    if (!m.dangerZoneCount) return;
    const qs = m.dangerZoneIds.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
    if (!qs.length) return;
    setSession(qs, '🚨 Zona de peligro cognitivo',
               m.dangerZoneCount + ' preguntas que fallaste estando seguro · razonamiento',
               'razonamiento', true, {mode:'practice'});
  };

  window.v359ShowStrategy = function(type){
    const labels = {
      no_sabia:'No sabía el tema', lei_mal:'Leí mal el enunciado',
      dude_entre_dos:'Dudé entre dos', confundi_diagnosticos:'Confundí diagnósticos',
      dato_clave:'No vi el dato clave', dato_duro:'Olvidé criterio',
      trampa:'Caí en distractor', pregunta_dudosa:'Pregunta dudosa'
    };
    const strategies = {
      no_sabia:        'Estudiá la lección antes de la pregunta. Buscá el sprint en "Aprender desde cero" y completá el material teórico antes de practicar.',
      lei_mal:         'Antes de mirar las opciones, leé el enunciado dos veces y subrayá mentalmente edad, tiempo de evolución y signo cardinal. Reduce errores 40%.',
      dude_entre_dos:  'Cuando dudes entre dos, escribí qué define una y qué define la otra. La diferencia conceptual es lo que falta consolidar.',
      confundi_diagnosticos: 'Construí flashcards comparativas (A vs B) con datos diferenciales. Es el método más efectivo para discriminar esquemas similares.',
      dato_clave:      'Practicá lectura activa: la app marca trigger words en naranja — entrenate a buscarlos primero.',
      dato_duro:       'Estos errores requieren repaso espaciado puro. Programá la pregunta como flashcard difícil (mañana) y repetí D1/D3/D7.',
      trampa:          'Los distractores explotan asociaciones obvias. Antes de elegir, preguntate: "¿qué hace que esta opción sea correcta y no la otra parecida?"',
      pregunta_dudosa: 'Marcá la pregunta con aporte colaborativo. No invertir tiempo de estudio en preguntas con clave incorrecta.'
    };
    alert('🎯 ' + (labels[type] || type) + '\n\n' + (strategies[type] || 'Trabajá con repaso espaciado y modo razonamiento.'));
  };

  // ────────────────────────────────────────────────────────────────────
  // PREDICTOR DE APROBACIÓN
  // ────────────────────────────────────────────────────────────────────
  const EXAM_DATE = new Date('2026-06-10');
  const APPROVAL_THRESHOLD = 65;

  function computeApprovalForecast(){
    const ejeWeights = {
      'Salud de las personas adultas y adultos mayores': 0.53,
      'Salud del niño, niña y adolescentes': 0.21,
      'Salud integral de las mujeres': 0.19,
      'Salud pública': 0.07
    };

    let weightedAcc = 0;
    let weightedCov = 0;
    const byEje = {};

    Object.entries(ejeWeights).forEach(([eje, w]) => {
      const qs = QUESTIONS.filter(q => q.eje === eje);
      const answered = qs.filter(q => state.answers?.[q.id]).length;
      const correct  = qs.filter(q => {
        const a = state.answers?.[q.id];
        return a && a.selected === q.ans;
      }).length;
      const acc = answered ? correct / answered : 0;
      const cov = qs.length ? answered / qs.length : 0;
      byEje[eje] = {qs:qs.length, answered, correct, acc:Math.round(acc*100), cov:Math.round(cov*100)};
      weightedAcc += acc * w;
      weightedCov += cov * w;
    });

    const daysLeft = Math.max(0, Math.ceil((EXAM_DATE - new Date()) / 86400000));
    const totalAns = Object.keys(state.answers || {}).length;

    const confidence = Math.min(1, weightedCov * 1.5);
    const baseline   = weightedAcc * 100;
    const adjusted   = baseline * confidence + 50 * (1 - confidence);
    const forecast   = Math.max(20, Math.min(95, Math.round(adjusted)));

    const sortedEjes = Object.entries(byEje)
      .filter(([_, d]) => d.answered >= 3)
      .sort((a, b) => a[1].acc - b[1].acc);

    return {
      forecast,
      threshold: APPROVAL_THRESHOLD,
      daysLeft,
      totalAnswered: totalAns,
      coverage: Math.round(weightedCov * 100),
      accuracy: Math.round(weightedAcc * 100),
      byEje,
      weakEje: sortedEjes[0] || null
    };
  }

  function renderApprovalPredictor(){
    const host = $('#v359PredictorBlock');
    if (!host) return;
    const f = computeApprovalForecast();

    if (f.totalAnswered < 10) {
      host.innerHTML = `
        <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/30">
          <div class="flex items-start gap-4">
            <div class="text-2xl">📈</div>
            <div class="flex-1">
              <p class="font-display text-base font-extrabold">Predictor en espera</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-5">
                Respondé al menos 10 preguntas para activar el predictor de aprobación.
                Te quedan <strong>${f.daysLeft} días</strong> hasta el examen.
              </p>
            </div>
          </div>
        </div>`;
      return;
    }

    const color = f.forecast >= 80 ? 'emerald' : f.forecast >= APPROVAL_THRESHOLD ? 'green' : f.forecast >= APPROVAL_THRESHOLD - 10 ? 'amber' : 'rose';
    const verdict = f.forecast >= 80 ? 'Excelente — sostené el ritmo'
                   : f.forecast >= APPROVAL_THRESHOLD ? 'Aprobando — buscá ampliar el margen'
                   : f.forecast >= APPROVAL_THRESHOLD - 10 ? 'Zona crítica — focalizá tu eje débil'
                   : 'Riesgo alto — necesitás cambiar estrategia';

    const ejeBars = Object.entries(f.byEje).map(([eje, d]) => {
      const accColor = d.answered === 0 ? '#cbd5e1' : d.acc >= 75 ? '#1D9E75' : d.acc >= 60 ? '#BA7517' : '#A32D2D';
      const ejeShort = eje.replace('Salud ', '').replace('de las personas ', '').replace('integral de las ', '').slice(0, 28);
      return `
        <div class="mb-2 last:mb-0">
          <div class="flex justify-between items-center text-[11px] mb-1">
            <span class="font-bold">${E(ejeShort)}</span>
            <span class="font-mono text-slate-500">${d.answered}/${d.qs} · ${d.answered > 0 ? d.acc + '%' : '–'}</span>
          </div>
          <div class="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full" style="width:${d.cov}%;background:${accColor}"></div>
          </div>
        </div>`;
    }).join('');

    host.innerHTML = `
      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">📈 Predictor</p>
            <h3 class="font-display text-xl font-extrabold mt-1">Probabilidad 10 de junio</h3>
            <p class="text-xs text-slate-400 mt-0.5">${f.daysLeft} días restantes</p>
          </div>
          <div class="text-right">
            <p class="font-display text-5xl font-extrabold leading-none text-${color}-600">${f.forecast}%</p>
          </div>
        </div>
        <p class="text-sm leading-6 text-slate-700 dark:text-slate-300 mb-3">
          <strong>${verdict}.</strong>
          Cobertura ${f.coverage}% · Precisión ${f.accuracy}%
          ${f.weakEje ? '· Eje débil: ' + E(f.weakEje[0].split(' ').slice(0,3).join(' ')) + ' (' + f.weakEje[1].acc + '%)' : ''}
        </p>
        <div class="rounded-xl bg-slate-50 dark:bg-slate-950/50 p-4">${ejeBars}</div>
        <p class="mt-3 text-[10px] text-slate-400 leading-4">
          Ponderado por peso real del examen (Adultos 53% · Pediatría 21% · Mujeres 19% · Salud Pública 7%).
        </p>
      </div>`;
  }

  // ────────────────────────────────────────────────────────────────────
  // HEATMAP DE COBERTURA
  // ────────────────────────────────────────────────────────────────────
  function renderHeatmap(){
    const host = $('#v359HeatmapBlock');
    if (!host || typeof SPRINTS === 'undefined') return;

    const ejeColors = {
      'Salud de las personas adultas y adultos mayores': '#534AB7',
      'Salud del niño, niña y adolescentes': '#1D9E75',
      'Salud integral de las mujeres': '#D4537E',
      'Salud pública': '#BA7517'
    };

    const byEje = {};
    SPRINTS.forEach(sp => {
      byEje[sp.eje] ||= [];
      byEje[sp.eje].push(sp);
    });

    const blocks = Object.entries(byEje).map(([eje, sps]) => {
      const ejeShort = eje.replace('Salud ', '').replace('de las personas ', '').replace('integral de las ', '').slice(0, 32);
      const cells = sps.map(sp => {
        const total    = sp.questions.length;
        const answered = sp.questions.filter(q => state.answers?.[q.id]).length;
        const correct  = sp.questions.filter(q => {
          const a = state.answers?.[q.id];
          return a && a.selected === q.ans;
        }).length;
        const cov = total ? answered / total : 0;
        const acc = answered ? Math.round(correct / answered * 100) : null;

        let bg;
        if (answered === 0) bg = 'rgba(148,163,184,.18)';
        else if (acc >= 85) bg = '#1D9E75';
        else if (acc >= 65) bg = '#BA7517';
        else bg = '#A32D2D';

        const opacity = answered === 0 ? 1 : Math.max(0.45, cov);
        const tip = sp.sprint + ' · ' + answered + '/' + total + (answered > 0 ? ' · ' + acc + '%' : ' · sin tocar');
        return '<button class="np-heat-cell" title="' + E(tip) + '" style="background:' + bg + ';opacity:' + opacity + '" onclick="startSprint(\'' + sp.id + '\',\'' + (state.method || 'preguntas') + '\')"></button>';
      }).join('');

      return `
        <div class="mb-4 last:mb-0">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-2.5 h-2.5 rounded-full" style="background:${ejeColors[eje] || '#64748b'}"></span>
            <p class="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">${E(ejeShort)}</p>
            <span class="text-[10px] text-slate-400 font-mono">${sps.length} sprints</span>
          </div>
          <div class="np-heat-grid">${cells}</div>
        </div>`;
    }).join('');

    host.innerHTML = `
      <div class="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-4">
          <p class="text-[10px] font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">🗺️ Mapa de cobertura</p>
          <h3 class="font-display text-xl font-extrabold mt-1">Geografía de tu conocimiento</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-5">
            Cada celda es un sprint. <span class="text-emerald-600 font-bold">Verde</span> ≥85% ·
            <span class="text-amber-600 font-bold">Ámbar</span> 65–85% ·
            <span class="text-rose-600 font-bold">Rojo</span> &lt;65% ·
            <span class="text-slate-400 font-bold">Gris</span> sin tocar.
          </p>
        </div>
        ${blocks}
      </div>`;
  }

  // ────────────────────────────────────────────────────────────────────
  // ONBOARDING DIAGNÓSTICO
  // ────────────────────────────────────────────────────────────────────
  function shouldShowOnboarding(){
    if (state.onboarding?.dismissed) return false;
    const ans = Object.keys(state.answers || {}).length;
    if (ans >= 30) return false;
    const last = state.onboarding?.lastDoneAt;
    if (last && Date.now() - last < 7 * 86400000) return false;
    return true;
  }

  function renderOnboardingBanner(){
    if (!shouldShowOnboarding()) {
      $('#v359OnboardingBanner')?.remove();
      return;
    }
    const dash = $('#dashboardView');
    if (!dash || $('#v359OnboardingBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'v359OnboardingBanner';
    banner.className = 'mb-6 rounded-[2rem] border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-6 shadow-glow dark:border-indigo-800 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-950';
    banner.innerHTML = `
      <div class="grid gap-5 md:grid-cols-[1.4fr_1fr] items-center">
        <div>
          <p class="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase tracking-[.18em] text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            🧬 Empezá por acá
          </p>
          <h3 class="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Diagnóstico cognitivo de 5 minutos
          </h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            En vez de elegir qué estudiar, hacé este diagnóstico de 3 preguntas en modo razonamiento.
            La app mide tu calibración cognitiva y te sugiere el siguiente paso.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700"
                    onclick="v359StartOnboarding()">
              Empezar diagnóstico (5 min)
            </button>
            <button class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                    onclick="v359DismissOnboarding()">
              Saltar por ahora
            </button>
          </div>
        </div>
        <div class="rounded-2xl bg-white/90 p-4 dark:bg-slate-900/70 text-xs leading-6 text-slate-600 dark:text-slate-300">
          <p class="font-black mb-2 text-indigo-700 dark:text-indigo-300">Qué pasa después</p>
          <p>· Activamos calibración de confianza en cada pregunta</p>
          <p>· Detectamos tu eje débil y zona de peligro</p>
          <p>· El predictor te dice tu probabilidad de aprobar</p>
          <p>· Empezás con dirección, no al azar</p>
        </div>
      </div>`;
    dash.insertBefore(banner, dash.firstChild);
  }

  window.v359DismissOnboarding = function(){
    state.onboarding.dismissed = true;
    safeSave();
    $('#v359OnboardingBanner')?.remove();
  };

  window.v359StartOnboarding = function(){
    if (typeof startNeuroDiagnostic === 'function') {
      state.onboarding.lastDoneAt = Date.now();
      safeSave();
      startNeuroDiagnostic();
    }
  };

  // ────────────────────────────────────────────────────────────────────
  // INYECCIÓN EN DASHBOARD
  // ────────────────────────────────────────────────────────────────────
  function injectDashboardBlock(){
    const dash = $('#dashboardView');
    if (!dash || $('#v359MainBlock')) return;

    const block = document.createElement('section');
    block.id = 'v359MainBlock';
    block.className = 'mt-8 space-y-5';
    block.innerHTML = `
      <header class="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">
            🧬 Inteligencia cognitiva
          </p>
          <h2 class="font-display text-2xl font-extrabold mt-1">Tu mapa de aprendizaje</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-5">
            Tres indicadores que te dicen qué hacer hoy + predictor del 10 de junio + cobertura por sprint.
          </p>
        </div>
      </header>
      <div id="v359CognitiveBlock"></div>
      <div id="v359PredictorBlock"></div>
      <div id="v359HeatmapBlock"></div>`;
    dash.appendChild(block);
  }

  // ────────────────────────────────────────────────────────────────────
  // RENDER MAESTRO
  // ────────────────────────────────────────────────────────────────────
  function refreshAllV359(){
    try {
      cleanSidebar();
      injectDashboardBlock();
      renderOnboardingBanner();
      renderCognitiveDashboard();
      renderApprovalPredictor();
      renderHeatmap();
    } catch (err) {
      console.warn('[v35.9] refresh error:', err);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // HOOKS
  // ────────────────────────────────────────────────────────────────────
  if (typeof renderAll === 'function') {
    const __originalRenderAll = renderAll;
    window.renderAll = function(){
      __originalRenderAll();
      refreshAllV359();
    };
  }

  if (typeof showView === 'function') {
    const __originalShowView = showView;
    window.showView = function(name){
      __originalShowView(name);
      setTimeout(() => {
        if (name === 'dashboard') refreshAllV359();
      }, 50);
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // INIT
  // ────────────────────────────────────────────────────────────────────
  function init(){
    refreshAllV359();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }

  console.log('%c[ResidenciAPP v35.9]', 'color:#534AB7;font-weight:bold',
              'Refactor cognitivo · sidebar limpio · dashboard accionable · predictor activo');
})();
