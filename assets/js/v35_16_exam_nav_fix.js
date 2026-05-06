/* === ResidenciAPP v35.16 · Examen ciego + navegador único + flechas ===
   Cambios:
   - Exámenes equilibrados con tiempo: sin feedback visual hasta finalizar.
   - El navegador numérico no muestra rojo/verde en modo examen ciego.
   - En modo libre/práctica/favoritas/errores libres sí conserva colores.
   - Flechas ←/→ para moverse entre preguntas en cualquier sesión.
   - Elimina aviso general “Dato actualizable / clave para verificar”.
   - Exámenes equilibrados: elegir tiempo + tamaño + iniciar con timer correcto.
   No modifica banco, IDs, métricas históricas ni progreso guardado.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3516__) return;
  window.__RESIDENCIAPP_V3516__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escHtml = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = (fn, fallback) => { try { return fn(); } catch(e){ console.warn('[v35.16]', e); return fallback; } };
  const save = () => safe(() => saveState(), null);

  function qById(id){ return safe(() => QUESTIONS.find(q => String(q.id) === String(id)), null); }
  function getQS(){ return safe(() => getSessionQuestions(), []); }
  function currentQ(){ return getQS()[Number(session?.idx || 0)] || null; }
  function isExamBlind(s=session){
    if(!s) return false;
    if(s.mode === 'revenge') return true;
    if(s.mode === 'exam') return true;
    if(s.balancedFeedbackMode === 'final') return true;
    if(s.examKind === 'balanced' && String(s.balancedTiming || 'free') !== 'free') return true;
    return false;
  }
  function selectedForNav(q, s=session){
    if(!q || !s) return '';
    if(isExamBlind(s)) return s.selected?.[q.id] || '';
    return s.selected?.[q.id] || state?.answers?.[q.id]?.selected || '';
  }

  // Evitar que el aviso general se vuelva a inyectar.
  try { dataUpdateWarning = function(){ return ''; }; } catch(_){ }
  function removeDataUpdateWarnings(root=document){
    $$('div', root).forEach(el => {
      const txt = (el.textContent || '').trim();
      if(txt.includes('Dato actualizable / clave para verificar') || txt.includes('Esta pregunta puede depender de prevalencias')){
        const block = el.closest('.rounded-3xl') || el;
        block.remove();
      }
    });
  }

  // ────────────────────────────────────────────────
  // Navegador único
  // ────────────────────────────────────────────────
  function clearOldNavigators(){
    [
      '#v357QuestionNavigator', '#v3513QuestionNavigator', '#v3514QuestionNavigator', '#v3516QuestionNavigator',
      '[data-session-number-navigator]', '[data-v3516-session-navigator]'
    ].forEach(sel => $$(sel).forEach(el => el.remove()));
  }
  function renderOneNavigator(){
    clearOldNavigators();
    if(!session) return;
    const ids = Array.isArray(session.questions) ? session.questions.slice() : [];
    if(!ids.length) return;
    const card = $('#questionCard');
    if(!card) return;
    const current = Number(session.idx || 0);
    const blind = isExamBlind(session);
    const answeredCount = ids.filter(id => !!(session.selected?.[id] || (!blind && state?.answers?.[id]?.selected))).length;
    const chips = ids.map((id, i) => {
      const q = qById(id);
      const sel = selectedForNav(q, session);
      let cls = 'is-empty';
      if(i === current) cls = 'is-current';
      else if(blind && sel) cls = 'is-answered-blind';
      else if(!blind && q && sel && sel === q.ans) cls = 'is-correct';
      else if(!blind && q && sel && q.ans && sel !== q.ans) cls = 'is-wrong';
      return '<button type="button" class="v3516-session-chip '+cls+'" data-v3516-jump="'+i+'" title="Ir a pregunta '+(i+1)+'">'+(i+1)+'</button>';
    }).join('');
    const helper = blind
      ? 'Modo ciego: los números no muestran si está correcta o incorrecta. La corrección aparece al finalizar.'
      : 'Tocá cualquier número para moverte. Verde = correcta, rojo = incorrecta, blanco = pendiente.';
    const nav = document.createElement('section');
    nav.id = 'v3516QuestionNavigator';
    nav.setAttribute('data-v3516-session-navigator','true');
    nav.className = 'mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';
    nav.innerHTML = '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Navegador de sesión</p><p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">'+escHtml(helper)+'</p></div><div class="text-xs font-black text-slate-500">'+answeredCount+'/'+ids.length+' respondidas</div></div><div class="mt-3 flex max-h-36 flex-wrap gap-2 overflow-auto pr-1">'+chips+'</div>';
    card.insertAdjacentElement('afterend', nav);
  }

  window.jumpToSessionQuestionV3516 = function(index){
    if(!session) return;
    const ids = Array.isArray(session.questions) ? session.questions : [];
    const idx = Number(index);
    if(!Number.isInteger(idx) || idx < 0 || idx >= ids.length) return;
    session.idx = idx;
    state.session = session;
    save();
    renderQuestion();
  };

  // ────────────────────────────────────────────────
  // Neutralizar feedback visual durante examen ciego
  // ────────────────────────────────────────────────
  function resetChoiceBox(box, kind){
    if(!box) return;
    box.className = 'rounded-3xl border p-4 transition ' + (kind === 'selected'
      ? 'border-slate-400 bg-slate-50 ring-1 ring-slate-200 dark:border-slate-500 dark:bg-slate-900/70 dark:ring-slate-700'
      : 'border-slate-200 hover:border-medical-300 dark:border-slate-700 dark:hover:border-medical-700');
  }
  function neutralizeBlindQuestion(){
    if(!isExamBlind(session)) return;
    const q = currentQ();
    if(!q) return;
    const selected = session?.selected?.[q.id] || '';
    $$('#questionCard label.choice').forEach(label => {
      const input = label.querySelector('input[type="radio"]');
      const box = label.querySelector('div.rounded-3xl');
      if(!input) return;
      const isSelected = selected && input.value === selected;
      if(!selected){
        input.checked = false;
        input.disabled = false;
        resetChoiceBox(box, 'empty');
      } else {
        input.checked = isSelected;
        input.disabled = true;
        resetChoiceBox(box, isSelected ? 'selected' : 'empty');
      }
    });
    // Estado superior: no decir correcta/incorrecta durante el examen.
    const header = $('#questionCard .mb-4');
    const status = header ? Array.from(header.querySelectorAll('span')).pop() : null;
    if(status){
      status.textContent = 'sin feedback hasta el final';
      status.className = 'text-xs font-black uppercase tracking-[.16em] text-slate-400';
    }
    // Si alguna capa vieja metió una explicación, ocultarla en modo ciego.
    $$('#questionCard section, #questionCard .feedback-official-badge').forEach(el => {
      const text = (el.textContent || '').toLowerCase();
      if(text.includes('por qué es correcta') || text.includes('datos clave') || text.includes('análisis de distractores') || text.includes('feedback validado')){
        const sec = el.closest('section') || el;
        sec.remove();
      }
    });
  }

  function refreshAfterQuestion(){
    setTimeout(() => {
      removeDataUpdateWarnings(document);
      neutralizeBlindQuestion();
      renderOneNavigator();
    }, 0);
  }

  // ────────────────────────────────────────────────
  // Exámenes equilibrados: una sola fuente de verdad
  // ────────────────────────────────────────────────
  const MODES = [
    {value:'free', title:'Libre', sub:'sin tiempo', desc:'feedback inmediato'},
    {value:'60', title:'1:00', sub:'por pregunta', desc:'corrección final'},
    {value:'90', title:'1:30', sub:'por pregunta', desc:'corrección final'},
    {value:'120', title:'2:00', sub:'por pregunta', desc:'corrección final'}
  ];
  const SIZES = [
    {value:20, title:'Mini', sub:'20 preguntas'},
    {value:50, title:'Medio', sub:'50 preguntas'},
    {value:100, title:'Completo', sub:'100 preguntas'}
  ];
  function getBMode(){
    const v = String(localStorage.getItem('residenciapp_balanced_time_mode') || 'free');
    return MODES.some(m => m.value === v) ? v : 'free';
  }
  function getBSize(){
    const n = Number(localStorage.getItem('residenciapp_balanced_size') || 20);
    return [20,50,100].includes(n) ? n : 20;
  }
  function setBMode(v){ localStorage.setItem('residenciapp_balanced_time_mode', String(v || 'free')); renderBalancedV3516(); }
  function setBSize(n){ localStorage.setItem('residenciapp_balanced_size', String(n || 20)); renderBalancedV3516(); }
  function modeText(v){
    if(v === 'free') return 'modo libre · sin tiempo · feedback inmediato';
    return (v === '60' ? '1:00' : v === '90' ? '1:30' : '2:00') + ' por pregunta · corrección final';
  }
  function previewPlan(n){ return safe(() => typeof previewBalancedExam === 'function' ? previewBalancedExam(n) : [], []); }
  function buildBalanced(n){
    let qs = safe(() => typeof buildBalancedExam === 'function' ? buildBalancedExam(n, {preferUnanswered:true}) : [], []);
    if(!Array.isArray(qs) || !qs.length){
      qs = Array.isArray(QUESTIONS) ? QUESTIONS.slice() : [];
      for(let i=qs.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [qs[i],qs[j]]=[qs[j],qs[i]]; }
    }
    const seen = new Set();
    return qs.filter(q => q && q.id && !seen.has(q.id) && seen.add(q.id)).slice(0,n);
  }
  function renderBalancedV3516(){
    const panel = $('#v343BalancedPanel');
    if(!panel) return;
    const mode = getBMode();
    const size = getBSize();
    const modeHtml = MODES.map(m => '<button type="button" class="v3516-balanced-card '+(mode===m.value?'is-active':'')+'" data-v3516-balanced-mode="'+m.value+'"><span class="v3516-balanced-title">'+escHtml(m.title)+'</span><span class="v3516-balanced-sub">'+escHtml(m.sub)+'</span><span class="v3516-balanced-desc">'+escHtml(m.desc)+'</span></button>').join('');
    const sizeHtml = SIZES.map(s => '<button type="button" class="v3516-balanced-card '+(size===s.value?'is-active':'')+'" data-v3516-balanced-size="'+s.value+'"><span class="v3516-balanced-title">'+escHtml(s.title)+'</span><span class="v3516-balanced-sub">'+escHtml(s.sub)+'</span></button>').join('');
    const preview = previewPlan(size).map(r => '<div class="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><div class="flex items-center justify-between gap-2"><span class="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">'+escHtml(r.id || '')+'</span><span class="font-display text-2xl font-extrabold" style="color:'+escHtml(r.color || '#4f46e5')+'">'+escHtml(r.n || 0)+'</span></div><h4 class="mt-1 text-sm font-extrabold">'+escHtml(r.label || 'Eje')+'</h4></div>').join('');
    panel.innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Exámenes equilibrados</p><h3 class="font-display text-2xl font-extrabold">Elegí modalidad, tamaño y recién iniciá</h3><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">En modo libre hay feedback inmediato. Con tiempo, las respuestas quedan ocultas hasta la corrección final.</p></div></div>'
      + '<div class="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">1 · Modalidad</p><div class="v3516-balanced-grid mt-3">'+modeHtml+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">2 · Tamaño del examen</p><div class="v3516-balanced-grid v3516-balanced-grid-3 mt-3">'+sizeHtml+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">3 · Listo para iniciar</p><h4 class="font-display text-xl font-extrabold">'+size+' preguntas · '+escHtml(modeText(mode))+'</h4></div><button type="button" class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700 active:scale-[.98]" data-v3516-balanced-start="1">Iniciar</button></div></div>'
      + (preview ? '<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">'+preview+'</div>' : '');
  }
  function startBalancedV3516(){
    const size = getBSize();
    const mode = getBMode();
    const qs = buildBalanced(size);
    if(!qs.length) return alert('No hay preguntas disponibles para armar el examen equilibrado.');
    const title = size === 20 ? 'Mini examen equilibrado' : size === 50 ? 'Examen medio equilibrado' : 'Simulacro completo equilibrado';
    const meta = size+' preguntas · distribución equilibrada · '+modeText(mode);
    if(mode === 'free'){
      setSession(qs, title, meta, state?.method || 'preguntas', false, {mode:'practice', freeTiming:true});
      if(session){ session.mode='practice'; session.balancedFeedbackMode='immediate'; session.examKind='balanced'; session.examSize=size; session.balancedTiming='free'; }
    } else {
      const sec = Number(mode) || 90;
      setSession(qs, title, meta, 'simulacro', false, {mode:'exam', secondsPerQuestion:sec});
      if(session){ session.mode='exam'; session.secondsPerQuestion=sec; session.totalSeconds=qs.length*sec; session.remainingSeconds=qs.length*sec; session.freeTiming=false; session.balancedFeedbackMode='final'; session.examKind='balanced'; session.examSize=size; session.balancedTiming=mode; }
    }
    if(session){
      session.examPlan = previewPlan(size);
      state.session = session;
      save();
      renderQuestion();
    }
  }
  window.setBalancedTimeMode = setBMode;
  window.setBalancedSize = setBSize;
  window.startSelectedBalancedExam = startBalancedV3516;
  window.startBalancedExam = function(totalQ, secondsPerQuestion){
    setBSize(Number(totalQ) || getBSize());
    setBMode(secondsPerQuestion === undefined ? getBMode() : (secondsPerQuestion === 'free' ? 'free' : String(Number(secondsPerQuestion) || 90)));
    startBalancedV3516();
  };

  // ────────────────────────────────────────────────
  // Resultados: mostrar corrección detallada solo de respondidas
  // ────────────────────────────────────────────────
  function answerForResult(q, old){
    if(!q || !old) return '';
    if(isExamBlind(old)) return old.selected?.[q.id] || '';
    return old.selected?.[q.id] || state?.answers?.[q.id]?.selected || '';
  }
  function smallReviewCard(q, s){
    const ok = s && s === q.ans;
    const user = s ? escHtml(s.toUpperCase()+') '+(q.opts?.[s] || '')) : 'Sin responder';
    const corr = q.ans ? escHtml(q.ans.toUpperCase()+') '+(q.opts?.[q.ans] || '')) : 'Sin clave';
    return '<div class="rounded-2xl border '+(ok?'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20':'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20')+' p-4"><p class="text-sm font-black">'+escHtml(q.q)+'</p><p class="mt-2 text-xs font-bold">Tu respuesta: '+user+'</p><p class="text-xs font-bold">Correcta: '+corr+'</p></div>';
  }
  function miniFailed(q){
    if(typeof flashcardMini === 'function') return flashcardMini(q);
    return '<div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">'+escHtml(q.q)+'</div>';
  }
  const previousFinishSession = typeof finishSession === 'function' ? finishSession : null;
  finishSession = function(reason='manual'){
    try { if(typeof stopExamTimer === 'function') stopExamTimer(); } catch(_){ }
    if(!session){ try { showView('dashboard'); } catch(_){} return; }
    const old = session;
    const qs = getQS();
    const answeredQs = qs.filter(q => !!answerForResult(q, old));
    const failed = answeredQs.filter(q => { const s=answerForResult(q, old); return s && q.ans && s !== q.ans; });
    const correct = answeredQs.filter(q => { const s=answerForResult(q, old); return s && s === q.ans; }).length;
    const skipped = qs.length - answeredQs.length;
    const acc = answeredQs.length ? Math.round(correct / answeredQs.length * 100) : 0;
    const wasBlind = isExamBlind(old);
    const wasRevenge = old.mode === 'revenge';
    state.session = null;
    session = null;
    save();
    const headline = reason === 'time' ? 'Tiempo finalizado' : wasRevenge ? 'Revancha finalizada' : 'Sesión finalizada';
    const correction = wasBlind
      ? '<div class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Corrección final · solo respondidas</p><div class="mt-4 grid gap-3">'+(answeredQs.length ? answeredQs.map(q => smallReviewCard(q, answerForResult(q, old))).join('') : '<p class="text-sm font-bold text-slate-500">No hubo preguntas respondidas para revisar.</p>')+'</div></div>'
      : '';
    const html = '<div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">'+headline+'</p><h3 class="mt-1 font-display text-4xl font-extrabold">'+acc+'% de precisión</h3><p class="mt-2 text-slate-600 dark:text-slate-400">'+correct+' correctas sobre '+answeredQs.length+' respondidas · '+failed.length+' incorrectas · '+skipped+' sin responder.</p>'+(wasRevenge?'<p class="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-300">Las preguntas acertadas fueron eliminadas de errores activos.</p>':'')+'<div class="mt-6 flex flex-wrap gap-3"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white" onclick="showView(\'dashboard\')">Volver al panel</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesSession()">Repasar incorrectas</button></div></div>'
      + '<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">'+failed.slice(0,24).map(miniFailed).join('')+'</div>' + correction;
    const results = $('#resultsContent');
    if(results) results.innerHTML = html;
    try { showView('results'); } catch(_){ if(previousFinishSession) previousFinishSession(reason); }
  };

  // ────────────────────────────────────────────────
  // Hooks finales
  // ────────────────────────────────────────────────
  try {
    const baseRenderQuestion = renderQuestion;
    renderQuestion = function(){ const r = baseRenderQuestion.apply(this, arguments); refreshAfterQuestion(); return r; };
  } catch(_){ }
  try {
    const baseRenderAll = renderAll;
    renderAll = function(){ const r = baseRenderAll.apply(this, arguments); setTimeout(() => { renderBalancedV3516(); refreshAfterQuestion(); }, 0); return r; };
  } catch(_){ }
  try {
    const baseShowView = showView;
    showView = function(){ const r = baseShowView.apply(this, arguments); setTimeout(() => { renderBalancedV3516(); refreshAfterQuestion(); }, 80); return r; };
  } catch(_){ }

  document.addEventListener('click', function(ev){
    const mode = ev.target.closest('[data-v3516-balanced-mode]');
    if(mode){ ev.preventDefault(); ev.stopPropagation(); setBMode(mode.getAttribute('data-v3516-balanced-mode')); return; }
    const size = ev.target.closest('[data-v3516-balanced-size]');
    if(size){ ev.preventDefault(); ev.stopPropagation(); setBSize(Number(size.getAttribute('data-v3516-balanced-size'))); return; }
    const start = ev.target.closest('[data-v3516-balanced-start]');
    if(start){ ev.preventDefault(); ev.stopPropagation(); startBalancedV3516(); return; }
    const jump = ev.target.closest('[data-v3516-jump]');
    if(jump){ ev.preventDefault(); ev.stopPropagation(); window.jumpToSessionQuestionV3516(Number(jump.getAttribute('data-v3516-jump'))); return; }
  }, true);

  document.addEventListener('keydown', function(ev){
    if(!session) return;
    if(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    const tag = String(ev.target?.tagName || '').toLowerCase();
    if(['input','textarea','select','button'].includes(tag) || ev.target?.isContentEditable) return;
    if(ev.key === 'ArrowLeft'){
      ev.preventDefault();
      if(typeof prevQuestion === 'function') prevQuestion();
    } else if(ev.key === 'ArrowRight'){
      ev.preventDefault();
      if(typeof nextQuestion === 'function') nextQuestion();
    }
  }, true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { renderBalancedV3516(); refreshAfterQuestion(); }, 500));
  else setTimeout(() => { renderBalancedV3516(); refreshAfterQuestion(); }, 500);

  console.log('%c[ResidenciAPP v35.16]', 'color:#4f46e5;font-weight:bold', 'Blind exams, single navigator, arrow navigation and clean update warning active.');
})();
