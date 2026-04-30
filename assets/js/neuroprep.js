// ═══════════════════════════════════════════════════════════════════
// NeuroPREP · Motor de aprendizaje cognitivo
// Se integra con ResidenciAPP: usa QUESTIONS, showView(), esc()
// Versión 1.0 · Para el examen integrado 10 de junio 2026
// ═══════════════════════════════════════════════════════════════════

(function () {

  // ─── NAMESPACE ─────────────────────────────────────────────────
  const NP = window.NeuroPREP = {};

  // Estado de sesión activa
  NP.sess     = null;
  NP.cur      = 0;
  NP.answers  = [];
  NP.streak   = 0;
  NP.maxStreak = 0;
  NP.startTime = 0;
  NP.curConf  = null;
  NP.answered = false;
  NP.cfg      = { mode: 'razonamiento', tema: 'todos', n: 20 };

  // Tipos de error (mismos que el error log original)
  const ERR_TYPES = [
    { id: 'no_sabia',   label: 'No sabía el tema'        },
    { id: 'lei_mal',    label: 'Leí mal el enunciado'    },
    { id: 'dude',       label: 'Dudé entre dos opciones' },
    { id: 'confundi',   label: 'Confundí diagnósticos'   },
    { id: 'dato_clave', label: 'No vi el dato clave'     },
    { id: 'dato_duro',  label: 'Olvidé el criterio'      },
    { id: 'trampa',     label: 'Caí en un distractor'    },
    { id: 'dudosa',     label: 'Pregunta dudosa'         }
  ];

  const TRIGGER_WORDS = [
    'súbito','subito','brusco','brusca','postmenopáusica','postmenopausica',
    'gestante','puérpera','puerpera','lactante','neonato','recién nacido','recien nacido',
    'fiebre','febril','hipotensión','hipotension','taquicardia','bradicardia',
    'disnea','opresivo','irradiado','saturación','saturacion',
    'sangrado','metrorragia','amenorrea','prurito',
    'peritonitis','hematoquecia','melena','ictericia','ascitis',
    'supradesnivel','fibrilación','fibrilacion','taponamiento','tep','tvp',
    'cianosis','exantema','petequias','púrpura','purpura',
    'convulsión','convulsion','oliguria','acidosis'
  ];

  // ─── INIT (se llama una vez al cargar el DOM) ───────────────────
  NP.init = function () {
    // Poblar el select de temas con los datos reales del banco
    const sel = document.getElementById('npTemaSelect');
    if (!sel) return;
    const bank = window.QUESTIONS || [];
    const temas = [...new Set(bank.map(q => q.tema).filter(Boolean))].sort();
    sel.innerHTML =
      '<option value="todos">🔀 Todos los temas (interleaving recomendado)</option>' +
      temas.map(t => `<option value="${t}">${t}</option>`).join('');

    // Mostrar días restantes
    const examDate = new Date('2026-06-10');
    const diff = Math.ceil((examDate - new Date()) / 86400000);
    const el = document.getElementById('npDiasRestantes');
    if (el) el.textContent = diff > 0 ? diff + ' días' : '¡Hoy es el examen!';

    // Mostrar cantidad de preguntas disponibles
    const bankEl = document.getElementById('npBankCount');
    if (bankEl) bankEl.textContent = bank.length;
  };

  // ─── CONFIG SELECTOR ───────────────────────────────────────────
  NP.setCfg = function (key, val, btn) {
    NP.cfg[key] = (key === 'n') ? parseInt(val) : val;
    const group = btn.closest('[data-np-group]');
    if (group) group.querySelectorAll('[data-np-opt],[data-np-qty]').forEach(b => b.classList.remove('np-sel'));
    btn.classList.add('np-sel');
  };

  // ─── START ─────────────────────────────────────────────────────
  NP.start = function () {
    let bank = [...(window.QUESTIONS || [])];

    if (NP.cfg.tema !== 'todos') {
      bank = bank.filter(q => q.tema === NP.cfg.tema || q.sprint === NP.cfg.tema);
    }

    if (NP.cfg.mode === 'errores') {
      const m = npLoadMistakes();
      const ids = Object.keys(m);
      if (!ids.length) {
        alert('Todavía no tenés errores guardados. ¡Hacé una sesión primero!');
        return;
      }
      bank = bank.filter(q => ids.includes(q.id));
    }

    if (!bank.length) {
      alert('No hay preguntas para ese filtro. Elegí otro tema.');
      return;
    }

    bank = npShuffle(bank);
    NP.sess      = bank.slice(0, Math.min(NP.cfg.n, bank.length));
    NP.cur       = 0;
    NP.answers   = [];
    NP.streak    = 0;
    NP.maxStreak = 0;
    NP.startTime = Date.now();
    NP.answered  = false;
    NP.curConf   = null;

    npPanel('game');
    showView('neuroprep');
    NP.renderQ();
  };

  // ─── RENDER PREGUNTA ───────────────────────────────────────────
  NP.renderQ = function () {
    const q = NP.sess[NP.cur];
    if (!q) { NP.showResults(); return; }

    // Meta
    npSet('npQNum',    `${NP.cur + 1} / ${NP.sess.length}`);
    npSet('npQTema',   q.tema || q.eje || '');
    npSet('npQSprint', q.sprint || '');

    // Progreso
    const pct = Math.round(NP.cur / NP.sess.length * 100);
    const fill = document.getElementById('npProgFill');
    if (fill) fill.style.width = pct + '%';

    // Texto con highlights
    const textEl = document.getElementById('npQText');
    if (textEl) textEl.innerHTML = npHighlight(q.q || '');

    // Reset fases
    NP.answered = false;
    NP.curConf  = null;
    npShow('npPhaseConf', true);
    npShow('npPhaseOpts', false);
    npShow('npPhaseRes',  false);
    npShow('npCalWarn',   false);
    npShow('npErrClassify', false);

    const aiBody = document.getElementById('npAIBody');
    if (aiBody) { aiBody.classList.add('hidden'); aiBody.innerHTML = ''; }
    const aiBtn = document.getElementById('npAIBtn');
    if (aiBtn) { aiBtn.disabled = false; aiBtn.innerHTML = '🤖 Explicar con IA · Por qué, distractores, regla de oro y nemotecnia'; }

    // Desmarcar botones de confianza
    document.querySelectorAll('.np-cbtn').forEach(b => {
      b.classList.remove('np-conf-ok', 'np-conf-duda', 'np-conf-adiv');
    });

    // Modo clásico / simulacro: saltar fase de confianza
    if (NP.cfg.mode === 'clasico' || NP.cfg.mode === 'simulacro') {
      npShow('npPhaseConf', false);
      NP.showOpts();
    }

    NP.updateHUD();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── CONFIANZA ─────────────────────────────────────────────────
  NP.selectConf = function (conf, btn) {
    NP.curConf = conf;
    document.querySelectorAll('.np-cbtn').forEach(b => {
      b.classList.remove('np-conf-ok', 'np-conf-duda', 'np-conf-adiv');
    });
    const cls = conf === 'seguro' ? 'np-conf-ok' : conf === 'dudaba' ? 'np-conf-duda' : 'np-conf-adiv';
    btn.classList.add(cls);
    setTimeout(() => NP.showOpts(), 180);
  };

  // ─── MOSTRAR OPCIONES ──────────────────────────────────────────
  NP.showOpts = function () {
    const q = NP.sess[NP.cur];
    const wrap = document.getElementById('npOptsWrap');
    if (!wrap) return;
    wrap.innerHTML = '';

    const keys = Object.keys(q.opts || {}).sort();
    keys.forEach(k => {
      const btn = document.createElement('button');
      btn.className = 'np-opt w-full flex gap-3 items-start p-4 rounded-2xl border border-slate-200 bg-white text-left transition hover:border-medical-300 hover:bg-medical-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-medical-600 dark:hover:bg-medical-950/20 mb-2';
      btn.dataset.key = k;
      btn.innerHTML = `<span class="np-okey flex-shrink-0 w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold flex items-center justify-center mt-0.5">${k}</span><span class="text-sm leading-6">${esc(q.opts[k])}</span>`;
      btn.onclick = () => NP.selectOpt(k);
      wrap.appendChild(btn);
    });

    npShow('npPhaseOpts', true);
  };

  // ─── SELECCIONAR OPCIÓN ────────────────────────────────────────
  NP.selectOpt = function (key) {
    if (NP.answered) return;
    NP.answered = true;

    const q = NP.sess[NP.cur];
    const correct = (q.ans || '').toUpperCase();
    const isOk = key.toUpperCase() === correct;

    // Colorear opciones
    document.querySelectorAll('.np-opt').forEach(o => {
      o.disabled = true;
      o.classList.add('pointer-events-none');
      const k = o.dataset.key.toUpperCase();
      if (k === correct) {
        o.classList.add('!border-emerald-400', '!bg-emerald-50', 'dark:!border-emerald-700', 'dark:!bg-emerald-950/30');
        const keyEl = o.querySelector('.np-okey');
        if (keyEl) keyEl.classList.add('!bg-emerald-500', '!text-white');
      } else if (o.dataset.key === key && !isOk) {
        o.classList.add('!border-rose-400', '!bg-rose-50', 'dark:!border-rose-700', 'dark:!bg-rose-950/30');
        const keyEl = o.querySelector('.np-okey');
        if (keyEl) keyEl.classList.add('!bg-rose-500', '!text-white');
      }
    });

    // Registrar respuesta
    const rec = { id: q.id, sel: key, ans: correct, ok: isOk, conf: NP.curConf, errorType: null };
    NP.answers.push(rec);

    // Streak
    if (isOk) { NP.streak++; if (NP.streak > NP.maxStreak) NP.maxStreak = NP.streak; }
    else { NP.streak = 0; }

    // Persistir mistakes (compatible con el errorlog original)
    const m = npLoadMistakes();
    if (!isOk) { m[q.id] = (m[q.id] || 0) + 1; }
    else if (m[q.id]) { m[q.id] = Math.max(0, m[q.id] - 1); if (!m[q.id]) delete m[q.id]; }
    npSaveMistakes(m);

    // También persistir en el state general de la app si existe
    if (window.state && window.saveState) {
      if (!isOk) {
        window.state.mistakes = window.state.mistakes || {};
        window.state.mistakes[q.id] = window.state.mistakes[q.id] || {};
        window.state.mistakes[q.id].neuroprep = (window.state.mistakes[q.id].neuroprep || 0) + 1;
      }
      window.saveState();
    }

    NP.updateHUD();
    NP.showResult(isOk, q, key, correct, rec);
  };

  // ─── RESULTADO ─────────────────────────────────────────────────
  NP.showResult = function (isOk, q, sel, correct, rec) {
    const banner = document.getElementById('npResBanner');
    const icon   = document.getElementById('npResIcon');
    const title  = document.getElementById('npResTitle');
    const sub    = document.getElementById('npResSub');

    if (banner) banner.className = 'flex items-start gap-3 p-4 rounded-2xl mb-3 ' + (isOk
      ? 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
      : 'bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800');

    if (icon)  { icon.textContent = isOk ? '✓' : '✗'; icon.className = 'text-2xl font-black flex-shrink-0 ' + (isOk ? 'text-emerald-600' : 'text-rose-500'); }
    if (title) { title.textContent = isOk ? '¡Correcto!' : `Incorrecto — Correcta: ${correct}) ${q.opts[correct] || ''}`; title.className = 'text-sm font-black ' + (isOk ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'); }
    if (sub)   { sub.textContent = isOk ? npPositiveFeedback() : ''; sub.className = 'text-xs text-slate-400 mt-0.5'; }

    // Alerta de calibración cognitiva
    const warn = document.getElementById('npCalWarn');
    if (warn) {
      if (!isOk && NP.curConf === 'seguro') {
        warn.textContent = '🚨 Zona de peligro: estabas seguro y fallaste. Estas son las brechas cognitivas más peligrosas para el examen.';
        warn.classList.remove('hidden');
      } else if (isOk && NP.curConf === 'adivine') {
        warn.textContent = '⚠️ Acertaste adivinando. No dependas de la suerte el 10 de junio: reforzá este tema.';
        warn.classList.remove('hidden');
      }
    }

    // Clasificar error solo si falló
    if (!isOk) {
      NP.renderErrBtns(rec);
      npShow('npErrClassify', true);
    }

    npShow('npPhaseRes', true);

    // Label botón siguiente
    const isLast = NP.cur >= NP.sess.length - 1;
    const nextTxt = document.getElementById('npNextTxt');
    if (nextTxt) nextTxt.textContent = isLast ? 'Ver análisis de sesión →' : 'Siguiente pregunta →';
  };

  // ─── BOTONES DE TIPO DE ERROR ───────────────────────────────────
  NP.renderErrBtns = function (rec) {
    const wrap = document.getElementById('npErrBtns');
    if (!wrap) return;
    wrap.innerHTML = '';
    ERR_TYPES.forEach(et => {
      const b = document.createElement('button');
      b.className = 'text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50 transition dark:border-slate-700 dark:bg-slate-900 dark:hover:border-rose-700 dark:hover:bg-rose-950/30 dark:text-slate-300';
      b.textContent = et.label;
      b.onclick = () => {
        wrap.querySelectorAll('button').forEach(x => {
          x.classList.remove('border-rose-400', 'bg-rose-50', 'text-rose-700', 'dark:border-rose-600', 'dark:bg-rose-950/40', 'dark:text-rose-300');
        });
        b.classList.add('border-rose-400', 'bg-rose-50', 'text-rose-700', 'dark:border-rose-600', 'dark:bg-rose-950/40', 'dark:text-rose-300');
        rec.errorType = et.id;
      };
      wrap.appendChild(b);
    });
  };

  // ─── IA EXPLICACIÓN ────────────────────────────────────────────
  NP.loadAI = function () {
    const q   = NP.sess[NP.cur];
    const rec = NP.answers[NP.answers.length - 1];
    const btn = document.getElementById('npAIBtn');
    const body = document.getElementById('npAIBody');
    if (!btn || !body) return;

    btn.disabled = true;
    btn.innerHTML = '⏳ Generando explicación IA…';
    body.classList.remove('hidden');
    body.innerHTML = `<div class="p-4 flex items-center gap-2 text-sm text-slate-400">
      Analizando esta pregunta
      <span class="flex gap-1 ml-1">${[1,2,3].map(()=>'<span class="inline-block w-1.5 h-1.5 rounded-full bg-medical-500 animate-bounce" style="animation-duration:.8s"></span>').join('')}</span>
    </div>`;

    const optsText = Object.entries(q.opts || {}).map(([k,v]) => `${k}) ${v}`).join(' | ');
    const prompt = `Sos tutor de medicina para examen de residencia médica argentina 2026.

Pregunta: ${q.q}
Opciones: ${optsText}
Respuesta correcta: ${q.ans}) ${q.opts[q.ans] || ''}
Respuesta del estudiante: ${rec?.sel || '?'}) ${q.opts[rec?.sel || ''] || ''}
Tema: ${q.tema || ''} · ${q.sprint || ''}

Respondé SOLO en JSON puro, sin markdown, sin backticks, sin ningún texto antes ni después:
{"por_que_correcta":"2-3 oraciones concisas del mecanismo clínico que valida la respuesta correcta","distractores":{"A":"por qué A es incorrecta o correcta según corresponda","B":"por qué B","C":"por qué C","D":"por qué D"},"regla_de_oro":"1-2 líneas estilo examen: Si ves X → pensá Y / hacé Z","nemotecnia":"frase corta absurda o visual para recordar el dato clave"}`;

    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    .then(r => r.json())
    .then(data => {
      const raw = (data.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
      return JSON.parse(raw);
    })
    .then(d => NP.renderAI(d, q))
    .catch(() => {
      body.innerHTML = '<p class="p-4 text-xs text-rose-500 dark:text-rose-400">No se pudo conectar con IA. Revisá el aporte colaborativo de la pregunta o activá colaboración.</p>';
      btn.disabled = false;
      btn.innerHTML = '🤖 Reintentar explicación IA';
    });
  };

  NP.renderAI = function (d, q) {
    const keys = Object.keys(q.opts || {}).sort();
    const distLines = keys.map(k => {
      const isOk = k.toUpperCase() === (q.ans || '').toUpperCase();
      const exp   = d.distractores?.[k] || d.distractores?.[k.toUpperCase()] || '–';
      return `<div class="flex gap-2 mb-2 text-sm">
        <span class="font-mono text-xs font-bold flex-shrink-0 mt-0.5 ${isOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">${k})</span>
        <span class="leading-6">${esc(exp)}</span>
      </div>`;
    }).join('');

    document.getElementById('npAIBody').innerHTML = `
      <div class="p-4 space-y-4 border-t border-slate-200 dark:border-slate-700">
        <div>
          <p class="text-xs font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300 mb-2">Por qué es correcta</p>
          <p class="text-sm leading-6">${esc(d.por_que_correcta || '')}</p>
        </div>
        <div>
          <p class="text-xs font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300 mb-2">Análisis de distractores</p>
          ${distLines}
        </div>
        <div class="rounded-2xl bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-800/50">
          <p class="text-xs font-black uppercase tracking-[.16em] text-amber-700 dark:text-amber-300 mb-1">Regla de oro · Examen</p>
          <p class="text-sm font-bold leading-6">${esc(d.regla_de_oro || '')}</p>
        </div>
        <div class="rounded-2xl bg-medical-50 border border-medical-200 p-3 dark:bg-medical-950/30 dark:border-medical-800/50">
          <p class="text-xs font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300 mb-1">Nemotecnia</p>
          <p class="text-sm italic leading-6">${esc(d.nemotecnia || '')}</p>
        </div>
      </div>`;

    const btn = document.getElementById('npAIBtn');
    if (btn) btn.innerHTML = '✓ Explicación IA lista';
  };

  // ─── SIGUIENTE ─────────────────────────────────────────────────
  NP.next = function () {
    NP.cur++;
    NP.answered = false;
    NP.curConf  = null;
    if (NP.cur >= NP.sess.length) { NP.showResults(); return; }
    NP.renderQ();
  };

  // ─── RESULTADOS ────────────────────────────────────────────────
  NP.showResults = function () {
    npPanel('results');

    const total = NP.answers.length;
    const ok    = NP.answers.filter(a => a.ok).length;
    const pct   = total ? Math.round(ok / total * 100) : 0;
    const mins  = Math.round((Date.now() - NP.startTime) / 60000);

    // Score
    const scoreEl = document.getElementById('npFinalPct');
    if (scoreEl) {
      scoreEl.textContent = pct + '%';
      scoreEl.className = 'font-display text-7xl font-extrabold tracking-tight ' +
        (pct >= 85 ? 'text-emerald-600' : pct >= 65 ? 'text-amber-500' : 'text-rose-500');
    }
    npSet('npFinalLbl', `${ok} de ${total} correctas · ${mins} minuto${mins !== 1 ? 's' : ''} · Racha máx. ${NP.maxStreak}`);

    const msgs = pct >= 85
      ? ['Rendimiento de élite. Así se aprueba el 10 de junio.', 'El cerebro está consolidando bien.', 'Seguí así. El examen ya te espera.']
      : pct >= 65
        ? ['Buen trabajo. Los errores de abajo son el mapa exacto.', 'Por encima del promedio. Focaliza en los patrones.', 'Sólido. Seguís construyendo dominio.']
        : ['Esta sesión es la más valiosa: ves exactamente qué reforzar.', 'El cerebro aprende más de los errores que de los aciertos.', 'Es información útil, no fracaso. Actuá sobre ella.'];
    npSet('npFinalMsg', msgs[Math.floor(Math.random() * 3)]);

    // Grid de métricas
    npSet('npR-ok',     ok);
    npSet('npR-total',  total);
    npSet('npR-min',    mins);
    npSet('npR-streak', NP.maxStreak);

    // Calibración cognitiva
    ['seguro', 'dudaba', 'adivine'].forEach(c => {
      const sub   = NP.answers.filter(a => a.conf === c);
      const subOk = sub.filter(a => a.ok).length;
      const subPct = sub.length ? Math.round(subOk / sub.length * 100) : 0;
      const bar  = document.getElementById(`npCal-${c}-bar`);
      const stat = document.getElementById(`npCal-${c}-stat`);
      if (bar)  bar.style.width = subPct + '%';
      if (stat) stat.textContent = sub.length ? `${subOk}/${sub.length} · ${subPct}%` : '–';
    });

    // Análisis calibración
    const segFail  = NP.answers.filter(a => a.conf === 'seguro' && !a.ok).length;
    const adivOk   = NP.answers.filter(a => a.conf === 'adivine' && a.ok).length;
    const calMsgs  = [];
    if (segFail > 1) calMsgs.push(`⚠️ Fallaste ${segFail} preguntas donde estabas seguro — son falsas certezas, el riesgo más alto en el examen.`);
    if (adivOk  > 2) calMsgs.push(`🎲 Acertaste ${adivOk} preguntas adivinando — no te confíes de eso el día del examen.`);
    if (!calMsgs.length && pct >= 80) calMsgs.push('Tu calibración es buena: cuando sabés, acertás. El objetivo es ampliar ese círculo.');
    npSet('npCalAnalysis', calMsgs.join(' ') || '');

    // Patrones de error
    const errCounts = {};
    NP.answers.filter(a => !a.ok && a.errorType).forEach(a => {
      errCounts[a.errorType] = (errCounts[a.errorType] || 0) + 1;
    });
    const errSorted = Object.entries(errCounts).sort((a, b) => b[1] - a[1]);
    const maxErr = errSorted[0]?.[1] || 1;
    const errRows = document.getElementById('npErrRows');
    if (errRows) {
      errRows.innerHTML = errSorted.length
        ? errSorted.map(([type, cnt]) => {
            const label = ERR_TYPES.find(e => e.id === type)?.label || type;
            const w = Math.round(cnt / maxErr * 100);
            return `<div class="flex items-center gap-3 py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <span class="flex-1 text-sm text-slate-500 dark:text-slate-400">${label}</span>
              <div class="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-rose-400 rounded-full" style="width:${w}%"></div>
              </div>
              <span class="font-mono text-base font-black text-rose-500 w-5 text-right">${cnt}</span>
            </div>`;
          }).join('')
        : '<p class="text-sm text-slate-400">No clasificaste errores esta sesión — intentá hacerlo en la próxima para obtener el análisis.</p>';
    }

    // Plan de acción 48hs
    const plans = [];
    if (pct < 70)      plans.push('Repetí esta sesión mañana en modo Razonamiento — el cerebro necesita recuperación activa.');
    if (segFail > 1)   plans.push(`Revisá hoy los ${segFail} temas donde estabas seguro y fallaste.`);
    if (errCounts.no_sabia  > 0) plans.push('Usá el Tutor de ResidenciAPP para los temas que no conocías.');
    if (errCounts.trampa    > 0) plans.push('Sesión de distractores: leé cada enunciado dos veces, buscá el trigger word clave.');
    if (errCounts.lei_mal   > 0) plans.push('Practicá leer en voz baja — reduce los errores por mala lectura un 40%.');
    if (!plans.length)    plans.push('Hacé repaso espaciado de esta sesión en 2 días para consolidar.');
    plans.push('Meta 10 de junio: mantener ≥85% en 5 sesiones consecutivas.');
    const planEl = document.getElementById('npPlanItems');
    if (planEl) planEl.innerHTML = plans.map(p =>
      `<div class="flex gap-2 text-sm leading-6 py-0.5">
        <span class="text-medical-500 font-black flex-shrink-0">→</span>
        <span class="text-slate-600 dark:text-slate-400">${p}</span>
      </div>`
    ).join('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── HUD ───────────────────────────────────────────────────────
  NP.updateHUD = function () {
    const done = NP.answers.length;
    const ok   = NP.answers.filter(a => a.ok).length;
    const pct  = done ? Math.round(ok / done * 100) : 0;
    npSet('npHUDStreak', NP.streak + '🔥');
    npSet('npHUDPct', done ? pct + '%' : '–');
  };

  // ─── VOLVER AL HOME ────────────────────────────────────────────
  NP.goHome = function () {
    NP.sess = null;
    npPanel('home');
  };

  // ─── HELPERS ───────────────────────────────────────────────────
  function npPanel (name) {
    ['home','game','results'].forEach(p => {
      const el = document.getElementById('npPanel-' + p);
      if (el) el.classList.toggle('hidden', p !== name);
    });
  }

  function npSet (id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function npShow (id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    visible ? el.classList.remove('hidden') : el.classList.add('hidden');
  }

  function npHighlight (text) {
    let t = String(text || '');
    TRIGGER_WORDS.forEach(w => {
      t = t.replace(new RegExp(w, 'gi'), m =>
        `<mark class="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded px-0.5 not-italic">${m}</mark>`
      );
    });
    return t;
  }

  function npPositiveFeedback () {
    const m = ['Excelente. Ese es el patrón.', 'Correcto. Seguís construyendo.', 'Bien. Un punto más para el examen.', 'Acertaste. Consolidalo en 2 días.', 'Perfecto. El cerebro lo registró.'];
    return m[Math.floor(Math.random() * m.length)];
  }

  function npShuffle (a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function npLoadMistakes () { try { return JSON.parse(localStorage.getItem('np_mistakes') || '{}'); } catch { return {}; } }
  function npSaveMistakes (m) { localStorage.setItem('np_mistakes', JSON.stringify(m)); }

  // ─── BOOTSTRAP ─────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', NP.init);
  } else {
    NP.init();
  }

})();
