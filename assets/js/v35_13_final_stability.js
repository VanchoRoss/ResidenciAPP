/* === ResidenciAPP v35.13 · estabilidad final de botones, examen equilibrado, error log y feedback con imagen ===
   Capa no destructiva: no modifica banco, IDs, métricas históricas ni localStorage existente.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3513__) return;
  window.__RESIDENCIAPP_V3513__ = true;

  const qs  = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const htmlEscape = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSave = () => { try{ saveState(); }catch(_){ } };
  const safeRender = () => {
    try{ renderStats?.(); }catch(_){ }
    try{ renderReview?.(); }catch(_){ }
    try{ renderLibrary?.(); }catch(_){ }
  };
  function qById(id){ try{ return QUESTIONS.find(q => String(q.id) === String(id)); }catch(_){ return null; } }
  function getCurrentQ(){ try{ return getSessionQuestions()[session?.idx || 0] || null; }catch(_){ return null; } }
  function selectedFor(q){ try{ return session?.selected?.[q.id] || answerFor(q)?.selected || ''; }catch(_){ return ''; } }
  function reasonLabel(value){
    try{
      const v = String(value || '').trim();
      const byId = (ERROR_REASONS || []).find(r => r.id === v);
      if(byId) return byId.label;
      const byLabel = (ERROR_REASONS || []).find(r => String(r.label).toLowerCase() === v.toLowerCase());
      return byLabel ? byLabel.label : v;
    }catch(_){ return String(value || ''); }
  }
  function normalizedReasonValue(value){
    try{
      const v = String(value || '').trim();
      const byId = (ERROR_REASONS || []).find(r => r.id === v);
      if(byId) return byId.id;
      const byLabel = (ERROR_REASONS || []).find(r => String(r.label).toLowerCase() === v.toLowerCase());
      return byLabel ? byLabel.id : v;
    }catch(_){ return String(value || '').trim(); }
  }

  // ─────────────────────────────────────────────────────────────
  // 1) Exámenes equilibrados: selector estable modalidad + tamaño + iniciar.
  // ─────────────────────────────────────────────────────────────
  const BALANCED_MODES = [
    {value:'free', title:'Libre', sub:'sin tiempo', detail:'feedback inmediato'},
    {value:'60', title:'1:00', sub:'por pregunta', detail:'corrección final'},
    {value:'90', title:'1:30', sub:'por pregunta', detail:'corrección final'},
    {value:'120', title:'2:00', sub:'por pregunta', detail:'corrección final'}
  ];
  const BALANCED_SIZES = [
    {value:20, title:'Mini', sub:'20 preguntas'},
    {value:50, title:'Medio', sub:'50 preguntas'},
    {value:100, title:'Completo', sub:'100 preguntas'}
  ];
  function getBalancedMode(){
    const v = String(localStorage.getItem('residenciapp_balanced_time_mode') || 'free');
    return BALANCED_MODES.some(m => m.value === v) ? v : 'free';
  }
  function getBalancedSize(){
    const n = Number(localStorage.getItem('residenciapp_balanced_size') || 20);
    return [20,50,100].includes(n) ? n : 20;
  }
  function modeText(v){
    if(v === 'free') return 'modo libre · sin tiempo · feedback inmediato';
    const n = Number(v)||90;
    return (n===60?'1:00':n===90?'1:30':n===120?'2:00':n+' s')+' por pregunta · corrección final';
  }
  function balancedPreview(size){
    try{ return typeof previewBalancedExam === 'function' ? (previewBalancedExam(size) || []) : []; }catch(_){ return []; }
  }
  function cardClasses(active, color='indigo'){
    return active
      ? 'border-'+color+'-500 bg-'+color+'-600 text-white shadow-glow'
      : 'border-slate-200 bg-white/80 text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-800';
  }
  function renderBalancedPanelFinal(){
    const panel = qs('#v343BalancedPanel');
    if(!panel) return;
    const mode = getBalancedMode();
    const size = getBalancedSize();
    const modeBtns = BALANCED_MODES.map(m => {
      const active = mode === m.value;
      return '<button type="button" data-balanced-mode-final="'+m.value+'" class="rounded-2xl border p-4 text-left transition '+cardClasses(active)+'">'
        + '<p class="font-display text-2xl font-extrabold">'+htmlEscape(m.title)+'</p>'
        + '<p class="mt-1 text-xs font-black uppercase tracking-[.12em] '+(active?'text-indigo-100':'text-slate-500 dark:text-slate-400')+'">'+htmlEscape(m.sub)+'</p>'
        + '<p class="mt-1 text-[11px] font-bold '+(active?'text-indigo-100':'text-slate-400')+'">'+htmlEscape(m.detail)+'</p>'
        + '</button>';
    }).join('');
    const sizeBtns = BALANCED_SIZES.map(s => {
      const active = size === s.value;
      return '<button type="button" data-balanced-size-final="'+s.value+'" class="rounded-2xl border p-4 text-left transition '+cardClasses(active)+'">'
        + '<p class="font-display text-2xl font-extrabold">'+htmlEscape(s.title)+'</p>'
        + '<p class="mt-1 text-xs font-black uppercase tracking-[.12em] '+(active?'text-indigo-100':'text-slate-500 dark:text-slate-400')+'">'+htmlEscape(s.sub)+'</p>'
        + '</button>';
    }).join('');
    const preview = balancedPreview(size).map(r => '<div class="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">'
      + '<div class="flex items-center justify-between gap-2"><span class="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">'+htmlEscape(r.id || '')+'</span><span class="font-display text-2xl font-extrabold" style="color:'+htmlEscape(r.color || '#4f46e5')+'">'+htmlEscape(r.n || 0)+'</span></div>'
      + '<h4 class="mt-1 text-sm font-extrabold">'+htmlEscape(r.label || 'Eje')+'</h4>'
      + '</div>').join('');
    panel.innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Exámenes equilibrados</p><h3 class="font-display text-2xl font-extrabold">Elegí modalidad, tamaño y después iniciá</h3><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">La app arma automáticamente el examen por distribución del banco. En modo libre hay feedback inmediato; con tiempo funciona como simulacro ciego hasta el final.</p></div></div>'
      + '<div class="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">1 · Modalidad</p><div class="mt-3 grid gap-3 sm:grid-cols-4">'+modeBtns+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">2 · Tamaño del examen</p><div class="mt-3 grid gap-3 sm:grid-cols-3">'+sizeBtns+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">3 · Listo para iniciar</p><h4 class="font-display text-xl font-extrabold">'+size+' preguntas · '+htmlEscape(modeText(mode))+'</h4></div><button type="button" data-balanced-start-final="1" class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700 active:scale-[.98]">Iniciar</button></div></div>'
      + (preview ? '<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">'+preview+'</div>' : '');
  }
  function buildBalancedFallback(n){
    const pool = Array.isArray(QUESTIONS) ? QUESTIONS.slice() : [];
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    return pool.slice(0,n);
  }
  function startBalancedExamFinal(totalQ, modeValue){
    const n = [20,50,100].includes(Number(totalQ)) ? Number(totalQ) : 20;
    const mode = modeValue === undefined ? getBalancedMode() : String(modeValue || 'free');
    let questions = [];
    try{ questions = typeof buildBalancedExam === 'function' ? buildBalancedExam(n, {preferUnanswered:true}) : buildBalancedFallback(n); }catch(_){ questions = buildBalancedFallback(n); }
    questions = (questions || []).filter(Boolean).slice(0,n);
    if(!questions.length) return alert('No hay preguntas disponibles para armar el examen equilibrado.');
    const title = n === 20 ? 'Mini examen equilibrado' : n === 50 ? 'Examen medio equilibrado' : 'Simulacro completo equilibrado';
    const isFree = mode === 'free';
    const seconds = Number(mode) || 90;
    const meta = n+' preguntas · distribución equilibrada · '+(isFree ? 'modo libre sin tiempo · feedback inmediato' : modeText(String(seconds)));
    if(isFree){
      setSession(questions, title, meta, 'preguntas', false, {mode:'practice', freeTiming:true});
    } else {
      setSession(questions, title, meta, 'simulacro', false, {mode:'exam', secondsPerQuestion:seconds});
    }
    if(session){
      session.examKind = 'balanced';
      session.examSize = n;
      session.examPlan = balancedPreview(n);
      session.balancedTiming = isFree ? 'free' : String(seconds);
      session.balancedFeedbackMode = isFree ? 'immediate' : 'final';
      state.session = session;
      safeSave();
    }
  }
  window.setBalancedTimeMode = function(value){ localStorage.setItem('residenciapp_balanced_time_mode', String(value || 'free')); renderBalancedPanelFinal(); };
  window.setBalancedSize = function(n){ localStorage.setItem('residenciapp_balanced_size', String(n || 20)); renderBalancedPanelFinal(); };
  window.startSelectedBalancedExam = function(){ startBalancedExamFinal(getBalancedSize(), getBalancedMode()); };
  window.startBalancedExam = function(totalQ, secondsPerQuestion){
    let mode = secondsPerQuestion === undefined ? getBalancedMode() : (secondsPerQuestion === 'free' || Number(secondsPerQuestion) === 0 ? 'free' : String(Number(secondsPerQuestion)||90));
    startBalancedExamFinal(totalQ, mode);
  };
  window.startBalancedMini = () => startBalancedExamFinal(20, getBalancedMode());
  window.startBalancedMedium = () => startBalancedExamFinal(50, getBalancedMode());
  window.startBalancedFull = () => startBalancedExamFinal(100, getBalancedMode());
  window.renderBalancedPanelFinal = renderBalancedPanelFinal;

  // ─────────────────────────────────────────────────────────────
  // 2) Navegador de preguntas: saltar a cualquier pregunta en sesiones activas.
  // ─────────────────────────────────────────────────────────────
  window.jumpToSessionQuestion = function(index){
    if(!session) return;
    const total = (session.questions || []).length;
    const i = Math.max(0, Math.min(Number(index)||0, Math.max(0,total-1)));
    session.idx = i;
    state.session = session;
    safeSave();
    try{ renderQuestion(); }catch(_){ }
    setTimeout(() => qs('#questionCard')?.scrollIntoView({behavior:'smooth', block:'start'}), 20);
  };
  function renderSessionQuestionNavigatorFinal(){
    const host = qs('#sessionContent');
    if(!host || !session || !Array.isArray(session.questions) || !session.questions.length) return;
    qs('#v3513QuestionNavigator')?.remove();
    const current = Number(session.idx || 0);
    const ids = session.questions || [];
    const answeredCount = Object.keys(session.selected || {}).length;
    const chips = ids.map((id, i) => {
      const q = qById(id);
      const s = session.selected?.[id] || '';
      const ok = q && s && s === q.ans;
      const bad = q && s && q.ans && s !== q.ans;
      const cls = i === current ? 'bg-medical-600 text-white border-medical-600 shadow-sm'
        : ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800'
        : bad ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-800'
        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800';
      return '<button type="button" data-session-jump-final="'+i+'" class="rounded-xl border px-2.5 py-2 text-xs font-black '+cls+'" title="Ir a pregunta '+(i+1)+'">'+(i+1)+'</button>';
    }).join('');
    const nav = document.createElement('section');
    nav.id = 'v3513QuestionNavigator';
    nav.className = 'mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';
    nav.innerHTML = '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Navegador de sesión</p><p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Tocá cualquier número para retomar o revisar esa pregunta.</p></div><div class="text-xs font-black text-slate-500">'+answeredCount+'/'+ids.length+' respondidas</div></div><div class="mt-3 flex max-h-40 flex-wrap gap-2 overflow-auto pr-1">'+chips+'</div>';
    const card = qs('#questionCard');
    if(card) card.insertAdjacentElement('afterend', nav); else host.appendChild(nav);
  }
  window.renderSessionQuestionNavigatorFinal = renderSessionQuestionNavigatorFinal;

  // ─────────────────────────────────────────────────────────────
  // 3) Error log: seleccionar motivo autoguarda y desbloquea Siguiente.
  // ─────────────────────────────────────────────────────────────
  function saveErrorLogCore(id, typeValue, noteValue){
    const q = qById(id);
    if(!q || !typeValue) return false;
    const selected = selectedFor(q) || state.mistakes?.[id]?.selected || '';
    const type = normalizedReasonValue(typeValue);
    const label = reasonLabel(typeValue);
    state.mistakes ||= {};
    const prev = state.mistakes[id] || {};
    state.mistakes[id] = Object.assign({}, prev, {
      id, correct:q.ans, selected, at:prev.at || Date.now(), updatedAt:Date.now(),
      eje:q.eje, tema:q.tema, sprint:q.sprint,
      errorType:type, errorLabel:label, note: String(noteValue || prev.note || '').trim(), autoSaved:true
    });
    try{ scheduleQuestion(id, 3, false); }catch(_){ }
    safeSave();
    return true;
  }
  window.saveRequiredErrorLog = function(id){
    const type = qs('#requiredErrorType')?.value || '';
    const note = qs('#requiredErrorNote')?.value || '';
    if(!type) return alert('Elegí una razón del error antes de seguir.');
    if(saveErrorLogCore(id, type, note)){
      paintErrorLogSaved();
      safeRender();
      try{ renderQuestion(); }catch(_){ }
    }
  };
  window.saveErrorLog = function(id){
    const type = qs('#errorType')?.value || '';
    const note = qs('#errorNote')?.value || '';
    if(!type) return alert('Elegí el tipo de error.');
    if(saveErrorLogCore(id, type, note)){
      try{ if(typeof closeMethodModal === 'function') closeMethodModal(); }catch(_){ }
      safeRender();
      try{ renderQuestion(); }catch(_){ }
    }
  };
  window.currentNeedsErrorLog = function(){
    const q = getCurrentQ();
    if(!q || !session || session.mode === 'exam') return false;
    const selected = session.selected?.[q.id] || '';
    if(!selected || !q.ans || selected === q.ans) return false;
    return !state.mistakes?.[q.id]?.errorType;
  };
  function paintErrorLogSaved(){
    const box = qs('#requiredErrorLog');
    if(!box) return;
    let msg = qs('#v3513ErrorSaved', box);
    if(!msg){
      msg = document.createElement('p');
      msg.id = 'v3513ErrorSaved';
      msg.className = 'mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200';
      box.appendChild(msg);
    }
    msg.textContent = '✓ Error log guardado. Ya podés avanzar.';
  }
  function autoSaveVisibleRequiredErrorLog(){
    const q = getCurrentQ();
    const type = qs('#requiredErrorType')?.value || '';
    const note = qs('#requiredErrorNote')?.value || '';
    if(q && type && saveErrorLogCore(q.id, type, note)) paintErrorLogSaved();
  }

  // ─────────────────────────────────────────────────────────────
  // 4) Imagen pegada directamente en feedback colaborativo.
  // ─────────────────────────────────────────────────────────────
  function ensureCollabState(){
    state.collaboration ||= {enabled:false, analyses:{}, inbox:{endpoint:''}, outbox:[]};
    state.collaboration.analyses ||= {};
  }
  function collabQidFromPanel(panel){
    if(!panel) return '';
    const attr = panel.getAttribute('data-qid');
    if(attr) return attr;
    const any = panel.querySelector('[oninput*="saveCollaborativeField"], [onchange*="saveCollaborativeField"], [onclick*="sendContribution"]');
    const code = any?.getAttribute('oninput') || any?.getAttribute('onchange') || any?.getAttribute('onclick') || '';
    const m = code.match(/\('(Q[^']+)'/i) || code.match(/sendContribution\('([^']+)'\)/i);
    return m ? m[1] : '';
  }
  function savePastedCollabImage(qid, file){
    if(!qid || !file) return false;
    if(!file.type || !file.type.startsWith('image/')) return false;
    const maxMb = Number((window.CONTRIBUTION_CONFIG && CONTRIBUTION_CONFIG.maxImageSizeMB) || 3);
    const maxBytes = maxMb * 1024 * 1024;
    if(file.size > maxBytes){ alert('La imagen pesa '+(file.size/1024/1024).toFixed(1)+' MB. Usá una imagen de hasta '+maxMb+' MB.'); return true; }
    const reader = new FileReader();
    reader.onload = function(){
      ensureCollabState();
      const q = qById(qid);
      const prev = state.collaboration.analyses[qid] || {};
      state.collaboration.analyses[qid] = Object.assign({}, prev, {
        id:qid, updatedAt:new Date().toISOString(),
        eje:q?.eje || prev.eje || '', tema:q?.tema || prev.tema || '', sprint:q?.sprint || prev.sprint || '', source:q?.source || prev.source || '',
        image:{ name:file.name || 'imagen-pegada.png', mimeType:file.type, size:file.size, data:String(reader.result || ''), addedAt:new Date().toISOString(), source:'pasted' }
      });
      safeSave();
      try{ renderQuestion(); }catch(_){ }
      setTimeout(enhanceCollabPasteHints, 30);
    };
    reader.readAsDataURL(file);
    return true;
  }
  function enhanceCollabPasteHints(){
    qsa('.collab-panel').forEach(panel => {
      if(!panel.getAttribute('data-qid')){
        const id = collabQidFromPanel(panel);
        if(id) panel.setAttribute('data-qid', id);
      }
      if(!qs('[data-collab-paste-hint]', panel)){
        const hint = document.createElement('div');
        hint.setAttribute('data-collab-paste-hint','1');
        hint.className = 'mt-4 rounded-2xl border border-dashed border-emerald-300 bg-white/70 p-3 text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-slate-950/40 dark:text-emerald-300';
        hint.textContent = '📎 También podés pegar una imagen acá con Ctrl+V / Cmd+V.';
        const imageBlock = panel.querySelector('[class*="Imagen de la pregunta"]') || panel.querySelector('.mt-5');
        if(imageBlock) imageBlock.insertAdjacentElement('afterend', hint); else panel.appendChild(hint);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 5) Eventos delegados estables: evita depender de inline handlers rotos.
  // ─────────────────────────────────────────────────────────────
  document.addEventListener('click', function(ev){
    const modeBtn = ev.target.closest?.('[data-balanced-mode-final]');
    if(modeBtn){ ev.preventDefault(); window.setBalancedTimeMode(modeBtn.getAttribute('data-balanced-mode-final') || 'free'); return; }
    const sizeBtn = ev.target.closest?.('[data-balanced-size-final]');
    if(sizeBtn){ ev.preventDefault(); window.setBalancedSize(sizeBtn.getAttribute('data-balanced-size-final') || '20'); return; }
    const startBtn = ev.target.closest?.('[data-balanced-start-final]');
    if(startBtn){ ev.preventDefault(); window.startSelectedBalancedExam(); return; }
    const jump = ev.target.closest?.('[data-session-jump-final]');
    if(jump){ ev.preventDefault(); window.jumpToSessionQuestion(jump.getAttribute('data-session-jump-final')); return; }
  }, true);

  document.addEventListener('change', function(ev){
    if(ev.target?.id === 'requiredErrorType') autoSaveVisibleRequiredErrorLog();
    if(ev.target?.id === 'errorType'){
      const btn = qs('#modalBody button[onclick*="saveErrorLog"]');
      const m = btn?.getAttribute('onclick')?.match(/saveErrorLog\('([^']+)'\)/);
      const qid = m?.[1] || getCurrentQ()?.id;
      if(qid && ev.target.value) saveErrorLogCore(qid, ev.target.value, qs('#errorNote')?.value || '');
    }
  }, true);
  document.addEventListener('input', function(ev){
    if(ev.target?.id === 'requiredErrorNote') autoSaveVisibleRequiredErrorLog();
    if(ev.target?.id === 'errorNote'){
      const btn = qs('#modalBody button[onclick*="saveErrorLog"]');
      const m = btn?.getAttribute('onclick')?.match(/saveErrorLog\('([^']+)'\)/);
      const qid = m?.[1] || getCurrentQ()?.id;
      const type = qs('#errorType')?.value || '';
      if(qid && type) saveErrorLogCore(qid, type, ev.target.value || '');
    }
  }, true);
  document.addEventListener('paste', function(ev){
    const panel = ev.target?.closest?.('.collab-panel');
    if(!panel) return;
    const items = Array.from(ev.clipboardData?.items || []);
    const item = items.find(it => it.kind === 'file' && it.type && it.type.startsWith('image/'));
    if(!item) return;
    const file = item.getAsFile();
    const qid = collabQidFromPanel(panel) || getCurrentQ()?.id;
    if(savePastedCollabImage(qid, file)) ev.preventDefault();
  }, true);

  // ─────────────────────────────────────────────────────────────
  // 6) Hooks livianos post-render. Sin MutationObserver pesado.
  // ─────────────────────────────────────────────────────────────
  function postRender(){
    try{ renderSessionQuestionNavigatorFinal(); }catch(_){ }
    try{ renderBalancedPanelFinal(); }catch(_){ }
    try{ enhanceCollabPasteHints(); }catch(_){ }
  }
  try{
    const baseRenderQuestion = renderQuestion;
    renderQuestion = function(){ const out = baseRenderQuestion.apply(this, arguments); setTimeout(postRender, 0); return out; };
  }catch(_){ }
  try{
    const baseRenderAll = renderAll;
    renderAll = function(){ const out = baseRenderAll.apply(this, arguments); setTimeout(postRender, 0); return out; };
  }catch(_){ }
  try{
    const baseShowView = showView;
    showView = function(name){ const out = baseShowView.apply(this, arguments); setTimeout(postRender, 60); return out; };
  }catch(_){ }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(postRender, 150));
  else setTimeout(postRender, 150);

  console.log('[ResidenciAPP v35.13] Botones críticos estabilizados.');
})();
