/* === ResidenciAPP v35.14 · core stability ===
   Objetivo: eliminar duplicaciones de UI y dejar una sola fuente de verdad para:
   - Exámenes equilibrados: elegir modalidad + tamaño + iniciar.
   - Navegador de sesión: un solo navegador numérico.
   - Error log: autoguardado confiable.
   - Feedback colaborativo: pegar imagen con Ctrl/Cmd+V.
   No modifica banco, IDs, métricas históricas ni progreso existente.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3514__) return;
  window.__RESIDENCIAPP_V3514__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const escHtml = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSave = () => { try { saveState(); } catch(_){} };
  const safeRender = (fn) => { try { if(typeof fn === 'function') fn(); } catch(e){ console.warn('[v35.14] render helper failed', e); } };

  function qById(id){ try { return QUESTIONS.find(q => String(q.id) === String(id)); } catch(_) { return null; } }
  function getQS(){ try { return getSessionQuestions(); } catch(_) { return []; } }
  function curQ(){ try { return getQS()[Number(session?.idx)||0] || null; } catch(_) { return null; } }
  function answeredFor(q){
    try {
      const sel = session?.selected?.[q.id] || answerFor(q)?.selected || '';
      return sel || '';
    } catch(_) { return ''; }
  }

  // ────────────────────────────────────────────────
  // 1) Navegador de sesión único y estable
  // ────────────────────────────────────────────────
  function removeAllNumericNavigators(){
    ['#v357QuestionNavigator','#v3513QuestionNavigator','#v3514QuestionNavigator'].forEach(sel => $$(sel).forEach(el => el.remove()));
    // Si por alguna razón quedó duplicado por versiones viejas, eliminar todos salvo el último generado por v35.14.
    $$('[data-session-number-navigator]').forEach(el => el.remove());
  }

  function renderSessionNavigatorStable(){
    removeAllNumericNavigators();
    if(!session) return;
    const ids = Array.isArray(session.questions) ? session.questions.slice() : [];
    if(!ids.length) return;
    const host = $('#sessionContent');
    const card = $('#questionCard');
    if(!host || !card) return;
    const current = Number(session.idx) || 0;
    const answered = ids.filter(id => !!(session?.selected?.[id] || state?.answers?.[id]?.selected)).length;
    const chips = ids.map((id, i) => {
      const q = qById(id);
      const sel = q ? (session?.selected?.[id] || state?.answers?.[id]?.selected || '') : '';
      const ok = q && sel && sel === q.ans;
      const bad = q && sel && q.ans && sel !== q.ans;
      const stateCls = i === current ? 'is-current' : ok ? 'is-correct' : bad ? 'is-wrong' : 'is-empty';
      return '<button type="button" class="v3514-session-chip '+stateCls+'" data-session-jump-v3514="'+i+'" title="Ir a pregunta '+(i+1)+'">'+(i+1)+'</button>';
    }).join('');
    const nav = document.createElement('section');
    nav.id = 'v3514QuestionNavigator';
    nav.setAttribute('data-session-number-navigator','true');
    nav.className = 'mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';
    nav.innerHTML = '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Navegador de sesión</p><p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Tocá un número para moverte. Verde = correcta, rojo = incorrecta, blanco = pendiente.</p></div><div class="text-xs font-black text-slate-500">'+answered+'/'+ids.length+' respondidas</div></div><div class="mt-3 flex max-h-36 flex-wrap gap-2 overflow-auto pr-1">'+chips+'</div>';
    card.insertAdjacentElement('afterend', nav);
  }

  window.jumpToSessionQuestionV3514 = function(index){
    if(!session) return;
    const ids = Array.isArray(session.questions) ? session.questions : [];
    const idx = Number(index);
    if(!Number.isInteger(idx) || idx < 0 || idx >= ids.length) return;
    session.idx = idx;
    state.session = session;
    safeSave();
    try { renderQuestion(); } catch(e){ console.warn('[v35.14] jump failed', e); }
  };

  // ────────────────────────────────────────────────
  // 2) Exámenes equilibrados: un solo controlador
  // ────────────────────────────────────────────────
  const BALANCED_MODES = [
    {value:'free', title:'Libre', sub:'sin tiempo', desc:'feedback inmediato'},
    {value:'60', title:'1:00', sub:'por pregunta', desc:'corrección final'},
    {value:'90', title:'1:30', sub:'por pregunta', desc:'corrección final'},
    {value:'120', title:'2:00', sub:'por pregunta', desc:'corrección final'}
  ];
  const BALANCED_SIZES = [
    {value:20, title:'Mini', sub:'20 preguntas'},
    {value:50, title:'Medio', sub:'50 preguntas'},
    {value:100, title:'Completo', sub:'100 preguntas'}
  ];
  function getBalancedMode(){
    const v = String(localStorage.getItem('residenciapp_balanced_time_mode') || 'free');
    return BALANCED_MODES.some(x => x.value === v) ? v : 'free';
  }
  function getBalancedSize(){
    const n = Number(localStorage.getItem('residenciapp_balanced_size') || 20);
    return [20,50,100].includes(n) ? n : 20;
  }
  function setBalancedModeStable(v){ localStorage.setItem('residenciapp_balanced_time_mode', String(v || 'free')); renderBalancedPanelStable(); }
  function setBalancedSizeStable(n){ localStorage.setItem('residenciapp_balanced_size', String(n || 20)); renderBalancedPanelStable(); }
  function modeSummary(v){
    if(v === 'free') return 'modo libre sin tiempo · feedback inmediato';
    const n = Number(v) || 90;
    return (n===60?'1:00':n===90?'1:30':n===120?'2:00':n+' s')+' por pregunta · corrección final';
  }
  function balancedPlan(n){
    try { return typeof previewBalancedExam === 'function' ? (previewBalancedExam(n) || []) : []; }
    catch(_) { return []; }
  }
  function fallbackBalanced(n){
    const pool = Array.isArray(QUESTIONS) ? QUESTIONS.slice() : [];
    for(let i=pool.length-1; i>0; i--){ const j = Math.floor(Math.random()*(i+1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0,n);
  }
  function buildBalancedStable(n){
    let qs = [];
    try { if(typeof buildBalancedExam === 'function') qs = buildBalancedExam(n, {preferUnanswered:true}); } catch(e){ console.warn('[v35.14] buildBalancedExam failed', e); }
    if(!Array.isArray(qs) || !qs.length) qs = fallbackBalanced(n);
    return qs.filter(Boolean).slice(0,n);
  }
  function renderBalancedPanelStable(){
    const panel = $('#v343BalancedPanel');
    if(!panel) return;
    const mode = getBalancedMode();
    const size = getBalancedSize();
    const modeHtml = BALANCED_MODES.map(m => {
      const active = mode === m.value;
      return '<button type="button" class="v3514-balanced-card '+(active?'is-active':'')+'" data-v3514-balanced-mode="'+m.value+'"><span class="v3514-balanced-title">'+escHtml(m.title)+'</span><span class="v3514-balanced-sub">'+escHtml(m.sub)+'</span><span class="v3514-balanced-desc">'+escHtml(m.desc)+'</span></button>';
    }).join('');
    const sizeHtml = BALANCED_SIZES.map(s => {
      const active = size === s.value;
      return '<button type="button" class="v3514-balanced-card '+(active?'is-active':'')+'" data-v3514-balanced-size="'+s.value+'"><span class="v3514-balanced-title">'+escHtml(s.title)+'</span><span class="v3514-balanced-sub">'+escHtml(s.sub)+'</span></button>';
    }).join('');
    const preview = balancedPlan(size).map(r => '<div class="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><div class="flex items-center justify-between gap-2"><span class="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">'+escHtml(r.id || '')+'</span><span class="font-display text-2xl font-extrabold" style="color:'+escHtml(r.color || '#4f46e5')+'">'+escHtml(r.n || 0)+'</span></div><h4 class="mt-1 text-sm font-extrabold">'+escHtml(r.label || 'Eje')+'</h4></div>').join('');
    panel.innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Exámenes equilibrados</p><h3 class="font-display text-2xl font-extrabold">Elegí modalidad, tamaño y después iniciá</h3><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Primero seleccioná cómo querés rendir; la app no inicia nada hasta que toques <strong>Iniciar</strong>.</p></div></div>'
      + '<div class="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">1 · Modalidad</p><div class="v3514-balanced-grid mt-3">'+modeHtml+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">2 · Tamaño del examen</p><div class="v3514-balanced-grid mt-3 v3514-balanced-grid-3">'+sizeHtml+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">3 · Listo para iniciar</p><h4 class="font-display text-xl font-extrabold">'+size+' preguntas · '+escHtml(modeSummary(mode))+'</h4></div><button type="button" class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700 active:scale-[.98]" data-v3514-balanced-start="1">Iniciar</button></div></div>'
      + (preview ? '<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">'+preview+'</div>' : '');
  }
  function startBalancedStable(){
    const size = getBalancedSize();
    const mode = getBalancedMode();
    const qs = buildBalancedStable(size);
    if(!qs.length) return alert('No hay preguntas disponibles para armar el examen equilibrado.');
    const title = size === 20 ? 'Mini examen equilibrado' : size === 50 ? 'Examen medio equilibrado' : 'Simulacro completo equilibrado';
    const meta = size+' preguntas · distribución equilibrada · '+modeSummary(mode);
    if(mode === 'free'){
      setSession(qs, title, meta, state?.method || 'preguntas', false);
      if(session){ session.mode = 'practice'; session.balancedFeedbackMode = 'immediate'; }
    } else {
      const seconds = Number(mode) || 90;
      setSession(qs, title, meta, 'simulacro', false);
      if(session){ session.mode = 'exam'; session.secondsPerQuestion = seconds; session.balancedFeedbackMode = 'final'; }
    }
    if(session){
      session.examKind = 'balanced';
      session.examSize = size;
      session.examPlan = balancedPlan(size);
      session.balancedTiming = mode;
      state.session = session;
      safeSave();
      try { renderQuestion(); } catch(_){}
    }
  }
  window.setBalancedTimeMode = setBalancedModeStable;
  window.setBalancedSize = setBalancedSizeStable;
  window.startSelectedBalancedExam = startBalancedStable;
  window.startBalancedExam = function(totalQ, secondsPerQuestion){
    setBalancedSizeStable(Number(totalQ)||20);
    setBalancedModeStable(secondsPerQuestion === undefined ? getBalancedMode() : (secondsPerQuestion === 'free' ? 'free' : String(Number(secondsPerQuestion)||90)));
    startBalancedStable();
  };
  window.startBalancedMini = function(){ setBalancedSizeStable(20); startBalancedStable(); };
  window.startBalancedMedium = function(){ setBalancedSizeStable(50); startBalancedStable(); };
  window.startBalancedFull = function(){ setBalancedSizeStable(100); startBalancedStable(); };

  // ────────────────────────────────────────────────
  // 3) Error log autoguardado confiable
  // ────────────────────────────────────────────────
  function normalizeReason(value){
    const v = String(value || '').trim();
    try {
      const r = (ERROR_REASONS || []).find(x => x.id === v || String(x.label).toLowerCase() === v.toLowerCase());
      return r ? {id:r.id, label:r.label} : {id:v, label:v};
    } catch(_) { return {id:v, label:v}; }
  }
  function autoSaveRequiredErrorLog(){
    const q = curQ();
    if(!q) return;
    const select = $('#requiredErrorType');
    if(!select || !select.value) return;
    const note = $('#requiredErrorNote')?.value?.trim?.() || '';
    const r = normalizeReason(select.value);
    state.mistakes ||= {};
    state.mistakes[q.id] = Object.assign(state.mistakes[q.id] || {
      id:q.id,
      correct:q.ans,
      selected:answeredFor(q),
      at:Date.now(),
      eje:q.eje,
      tema:q.tema,
      sprint:q.sprint
    }, {errorType:r.id, errorLabel:r.label, note, updatedAt:Date.now()});
    try { scheduleQuestion(q.id, 3, false); } catch(_){}
    safeSave();
    const tag = $('#requiredErrorLog .text-xs.font-bold');
    if(tag){ tag.textContent = '✓ Error clasificado y autoguardado.'; tag.className = 'text-xs font-bold text-emerald-600 dark:text-emerald-300'; }
  }

  // ────────────────────────────────────────────────
  // 4) Pegar imagen en feedback colaborativo
  // ────────────────────────────────────────────────
  function fileToInput(file, qid){
    if(!file || !qid || typeof saveCollaborativeImage !== 'function') return;
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.createElement('input');
    input.type = 'file';
    input.files = dt.files;
    saveCollaborativeImage(qid, input);
    setTimeout(() => { try { renderQuestion(); } catch(_){} }, 80);
  }
  function currentQuestionIdFromCollab(el){
    const panel = el?.closest?.('.collab-panel');
    if(panel){
      const h = panel.textContent || '';
      const m = h.match(/Q\d{3,5}/i);
      if(m) return m[0].toUpperCase();
    }
    return curQ()?.id || '';
  }



  // ────────────────────────────────────────────────
  // 4b) Retomar sprints ya iniciados sin crear duplicados
  // ────────────────────────────────────────────────
  function isUnfinishedSession(s){
    const total = Array.isArray(s?.questions) ? s.questions.length : 0;
    const answered = Object.keys(s?.selected || {}).length;
    return total > 0 && answered < total;
  }
  function sameQuestionSet(a=[], b=[]){
    if(!a.length || !b.length || a.length !== b.length) return false;
    const set = new Set(a.map(String));
    return b.every(x => set.has(String(x)));
  }
  function findStartedSprintSession(sp){
    if(!sp || !Array.isArray(sp.questions)) return null;
    const candidates = [];
    try { if(state.session) candidates.push(state.session); } catch(_){}
    try { (state.activeSessions || []).forEach(s => candidates.push(s)); } catch(_){}
    return candidates.find(s => isUnfinishedSession(s) && (String(s.originSprintId || '') === String(sp.id) || sameQuestionSet(s.questions || [], sp.questions || []))) || null;
  }
  function resumeSessionObjectStable(s){
    if(!s) return;
    session = s;
    state.session = s;
    safeSave();
    try { showView('session'); } catch(_){}
    try { renderQuestion(); } catch(_){}
  }
  try {
    const baseStartSprint = startSprint;
    if(typeof baseStartSprint === 'function' && !baseStartSprint.__v3514WrappedLocal){
      startSprint = function(id, method){
        const sp = (SPRINTS || []).find(x => String(x.id) === String(id));
        const found = findStartedSprintSession(sp);
        if(found) return resumeSessionObjectStable(found);
        const r = baseStartSprint.apply(this, arguments);
        if(sp && session){
          session.originSprintId = sp.id;
          session.originKind = method || session.method || 'preguntas';
          state.session = session;
          safeSave();
        }
        return r;
      };
      startSprint.__v3514WrappedLocal = true;
    }
  } catch(_){}

  // ────────────────────────────────────────────────
  // 5) Hooks estables, sin MutationObserver global
  // ────────────────────────────────────────────────

  function polishTopButtons(){
    $$('button').forEach(b => {
      const t = (b.textContent || '').trim().toLowerCase();
      if(t === 'errores' || t.includes('errores activos')){
        b.classList.add('v3514-error-button');
      }
      if(t === 'simulacro' && b.getAttribute('onclick') && b.getAttribute('onclick').includes('startGlobalSimulation')){
        b.remove();
      }
    });
  }

  function refreshStableUI(){
    renderSessionNavigatorStable();
    renderBalancedPanelStable();
    polishTopButtons();
  }
  function wrapOnce(name, after){
    const fn = window[name] || (typeof globalThis !== 'undefined' ? globalThis[name] : null);
    if(typeof fn !== 'function' || fn.__v3514Wrapped) return;
    const wrapped = function(){ const r = fn.apply(this, arguments); setTimeout(after, 0); return r; };
    wrapped.__v3514Wrapped = true;
    try { window[name] = wrapped; } catch(_){}
    try { globalThis[name] = wrapped; } catch(_){}
  }
  try {
    const baseRenderQuestion = renderQuestion;
    if(typeof baseRenderQuestion === 'function' && !baseRenderQuestion.__v3514WrappedLocal){
      renderQuestion = function(){ const r = baseRenderQuestion.apply(this, arguments); setTimeout(refreshStableUI, 0); return r; };
      renderQuestion.__v3514WrappedLocal = true;
    }
  } catch(_){}
  try {
    const baseRenderAll = renderAll;
    if(typeof baseRenderAll === 'function' && !baseRenderAll.__v3514WrappedLocal){
      renderAll = function(){ const r = baseRenderAll.apply(this, arguments); setTimeout(refreshStableUI, 0); return r; };
      renderAll.__v3514WrappedLocal = true;
    }
  } catch(_){}
  try {
    const baseShowView = showView;
    if(typeof baseShowView === 'function' && !baseShowView.__v3514WrappedLocal){
      showView = function(name){ const r = baseShowView.apply(this, arguments); setTimeout(refreshStableUI, 40); return r; };
      showView.__v3514WrappedLocal = true;
    }
  } catch(_){}

  document.addEventListener('click', function(ev){
    const modeBtn = ev.target.closest('[data-v3514-balanced-mode]');
    if(modeBtn){ ev.preventDefault(); ev.stopPropagation(); setBalancedModeStable(modeBtn.dataset.v3514BalancedMode); return; }
    const sizeBtn = ev.target.closest('[data-v3514-balanced-size]');
    if(sizeBtn){ ev.preventDefault(); ev.stopPropagation(); setBalancedSizeStable(Number(sizeBtn.dataset.v3514BalancedSize)); return; }
    const startBtn = ev.target.closest('[data-v3514-balanced-start]');
    if(startBtn){ ev.preventDefault(); ev.stopPropagation(); startBalancedStable(); return; }
    const chip = ev.target.closest('[data-session-jump-v3514]');
    if(chip){ ev.preventDefault(); ev.stopPropagation(); window.jumpToSessionQuestionV3514(Number(chip.dataset.sessionJumpV3514)); return; }
  }, true);

  document.addEventListener('change', function(ev){
    if(ev.target && ev.target.id === 'requiredErrorType') setTimeout(autoSaveRequiredErrorLog, 0);
  }, true);
  document.addEventListener('input', function(ev){
    if(ev.target && ev.target.id === 'requiredErrorNote') setTimeout(autoSaveRequiredErrorLog, 80);
  }, true);
  document.addEventListener('paste', function(ev){
    const target = ev.target;
    if(!target?.closest?.('.collab-panel')) return;
    const items = Array.from(ev.clipboardData?.items || []);
    const imgItem = items.find(it => String(it.type || '').startsWith('image/'));
    if(!imgItem) return;
    const file = imgItem.getAsFile();
    const qid = currentQuestionIdFromCollab(target);
    if(file && qid){
      ev.preventDefault();
      fileToInput(file, qid);
    }
  }, true);

  // Init tardío para permitir que todas las capas previas terminen.
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(refreshStableUI, 450));
  else setTimeout(refreshStableUI, 450);
  console.log('%c[ResidenciAPP v35.14]', 'color:#2563eb;font-weight:bold', 'Core stability active: balanced exams + single session navigator + error log autosave.');
})();
