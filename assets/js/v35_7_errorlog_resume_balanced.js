/* === ResidenciAPP v35.7 · error log autosave + retomar/manual + selector examen equilibrado ===
   Capa no destructiva: no toca banco, IDs ni progreso histórico. Solo mejora UI/flujo.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V357__) return;
  window.__RESIDENCIAPP_V357__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function save(){ try{ saveState(); }catch(_){ } }
  function qById(id){ try{ return QUESTIONS.find(q => q.id === id); }catch(_){ return null; } }
  function currentQ(){ try{ return getSessionQuestions()[session?.idx || 0] || null; }catch(_){ return null; } }
  function answerSelected(q){ try{ return session?.selected?.[q.id] || answerFor(q)?.selected || ''; }catch(_){ return ''; } }
  function reasonLabel(id){
    try{ return (ERROR_REASONS || []).find(r => r.id === id)?.label || id || ''; }catch(_){ return id || ''; }
  }
  function questionSetEqualsSession(s, sp){
    try{
      const a = (s?.questions || []).slice().sort().join('|');
      const b = (sp?.questions || []).map(q => q.id).slice().sort().join('|');
      return a && a === b;
    }catch(_){ return false; }
  }
  function sessionAnsweredCount(s){ return Object.keys(s?.selected || {}).length; }
  function sessionIsUnfinished(s){ return !!s && Array.isArray(s.questions) && s.questions.length && sessionAnsweredCount(s) < s.questions.length; }
  function ensureActiveList(){
    try{
      state.activeSessions ||= [];
      if(!Array.isArray(state.activeSessions)) state.activeSessions = [];
    }catch(_){ }
  }
  function smartResumeIdx(s){
    try{
      const idx = Number(s.idx || 0);
      if(idx > 0 || !s.questions?.length) return idx;
      const firstUnanswered = s.questions.findIndex(id => !s.selected?.[id]);
      return firstUnanswered >= 0 ? firstUnanswered : Math.max(0, s.questions.length - 1);
    }catch(_){ return Number(s?.idx || 0); }
  }
  function findActiveSprintSession(sp, kind='practice'){
    ensureActiveList();
    const all = [];
    try{ if(state.session && sessionIsUnfinished(state.session)) all.push(state.session); }catch(_){ }
    try{ (state.activeSessions || []).filter(sessionIsUnfinished).forEach(s => all.push(s)); }catch(_){ }
    return all.find(s => {
      const sameOrigin = s.originSprintId === sp.id && (!kind || s.originKind === kind || !s.originKind);
      return sameOrigin || questionSetEqualsSession(s, sp);
    }) || null;
  }
  function resumeSessionObject(s){
    if(!s) return false;
    ensureActiveList();
    try{ state.activeSessions = (state.activeSessions || []).filter(x => x && x.sid !== s.sid); }catch(_){ }
    s.idx = Math.max(0, Math.min(smartResumeIdx(s), (s.questions || []).length - 1));
    session = s;
    state.session = s;
    save();
    try{ showView('session'); renderQuestion(); }catch(_){ }
    setTimeout(() => window.scrollTo({top:0, behavior:'smooth'}), 40);
    return true;
  }

  // 1) Error log: autosave apenas elegís motivo. El botón queda como respaldo, pero ya no es obligatorio apretarlo.
  function autoSaveErrorLogFor(q, type, note=''){
    if(!q || !type) return;
    const selected = answerSelected(q);
    const label = reasonLabel(type);
    state.mistakes ||= {};
    const current = state.mistakes[q.id] || {id:q.id, correct:q.ans, selected:selected, at:Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint};
    state.mistakes[q.id] = Object.assign(current, {
      id:q.id, correct:q.ans, selected:selected || current.selected || '', at: current.at || Date.now(),
      updatedAt: Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint,
      errorType:type, errorLabel:label, note:note || current.note || '', autoSaved:true
    });
    try{ scheduleQuestion(q.id, 3, false); }catch(_){ }
    save();
    const box = $('#requiredErrorLog');
    if(box){
      let ok = $('#v357ErrorAutoSaved', box);
      if(!ok){
        ok = document.createElement('p');
        ok.id = 'v357ErrorAutoSaved';
        ok.className = 'mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200';
        box.appendChild(ok);
      }
      ok.textContent = '✓ Error log autoguardado. Ya podés avanzar.';
    }
  }
  document.addEventListener('change', e => {
    const el = e.target;
    if(!el) return;
    if(el.id === 'requiredErrorType'){
      const q = currentQ();
      const note = $('#requiredErrorNote')?.value?.trim() || '';
      autoSaveErrorLogFor(q, el.value, note);
    }
    if(el.id === 'errorType'){
      let q = currentQ();
      // Si el modal se abrió desde otra pregunta, intentamos leer el qid del botón Guardar.
      const btn = document.querySelector('#modalBody button[onclick*="saveErrorLog"]');
      const m = btn?.getAttribute('onclick')?.match(/saveErrorLog\('([^']+)'\)/);
      if(m?.[1]) q = qById(m[1]) || q;
      const note = $('#errorNote')?.value?.trim() || '';
      autoSaveErrorLogFor(q, el.value, note);
    }
  }, true);
  document.addEventListener('input', e => {
    const el = e.target;
    if(el?.id === 'requiredErrorNote'){
      const type = $('#requiredErrorType')?.value || '';
      if(type) autoSaveErrorLogFor(currentQ(), type, el.value.trim());
    }
    if(el?.id === 'errorNote'){
      const type = $('#errorType')?.value || '';
      if(type){
        let q = currentQ();
        const btn = document.querySelector('#modalBody button[onclick*="saveErrorLog"]');
        const m = btn?.getAttribute('onclick')?.match(/saveErrorLog\('([^']+)'\)/);
        if(m?.[1]) q = qById(m[1]) || q;
        autoSaveErrorLogFor(q, type, el.value.trim());
      }
    }
  }, true);

  // 2) Selector manual de preguntas dentro de cualquier sesión activa.
  window.jumpToSessionQuestion = function(index){
    if(!session) return;
    const total = (session.questions || []).length;
    const i = Math.max(0, Math.min(Number(index)||0, total-1));
    session.idx = i;
    state.session = session;
    save();
    renderQuestion();
    setTimeout(()=>$('#questionCard')?.scrollIntoView({behavior:'smooth', block:'start'}), 30);
  };
  function renderQuestionNavigator(){
    const host = $('#sessionContent');
    if(!host || !session) return;
    let nav = $('#v357QuestionNavigator');
    if(nav) nav.remove();
    const ids = session.questions || [];
    if(!ids.length) return;
    const current = Number(session.idx || 0);
    const chips = ids.map((id, i) => {
      const q = qById(id);
      const s = session.selected?.[id] || (q ? answerSelected(q) : '');
      const ok = q && s && s === q.ans;
      const bad = q && s && q.ans && s !== q.ans;
      const cls = i === current
        ? 'bg-medical-600 text-white border-medical-600 shadow-sm'
        : ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800'
        : bad ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-800'
        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800';
      return '<button class="rounded-xl border px-2.5 py-2 text-xs font-black '+cls+'" onclick="jumpToSessionQuestion('+i+')" title="Pregunta '+(i+1)+'">'+(i+1)+'</button>';
    }).join('');
    nav = document.createElement('section');
    nav.id = 'v357QuestionNavigator';
    nav.className = 'mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900';
    nav.innerHTML = '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Navegador de sesión</p><p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Podés saltar manualmente a cualquier pregunta, volver atrás o avanzar.</p></div><div class="text-xs font-black text-slate-500">'+Object.keys(session.selected||{}).length+'/'+ids.length+' respondidas</div></div><div class="mt-3 flex max-h-40 flex-wrap gap-2 overflow-auto pr-1">'+chips+'</div>';
    const after = $('#questionCard') || host.firstElementChild;
    if(after) after.insertAdjacentElement('afterend', nav);
    else host.prepend(nav);
  }

  // 3) Retomar sprints ya empezados; si no existe sesión previa, crea una nueva y la etiqueta.
  try{
    const basePractice = startSprintPractice;
    startSprintPractice = function(id){
      const sp = SPRINTS.find(s => s.id === id);
      if(sp){
        const found = findActiveSprintSession(sp, 'practice');
        if(found) return resumeSessionObject(found);
      }
      const r = basePractice.apply(this, arguments);
      if(sp && session){ session.originSprintId = sp.id; session.originKind = 'practice'; state.session = session; save(); }
      return r;
    };
  }catch(_){ }
  try{
    const baseExam = startSprintExam;
    startSprintExam = function(id){
      const sp = SPRINTS.find(s => s.id === id);
      if(sp){
        const found = findActiveSprintSession(sp, 'exam');
        if(found) return resumeSessionObject(found);
      }
      const r = baseExam.apply(this, arguments);
      if(sp && session){ session.originSprintId = sp.id; session.originKind = 'exam'; state.session = session; save(); }
      return r;
    };
  }catch(_){ }
  try{
    const baseStartSprint = startSprint;
    startSprint = function(id, method){ return method === 'simulacro' ? startSprintExam(id) : startSprintPractice(id); };
  }catch(_){ }

  // 4) Remover botón de simulacro global del header/esquina superior y colorear errores.
  function polishDashboardButtons(){
    $$('button[onclick*="startGlobalSimulation"]').forEach(b => b.remove());
    $$('#dashboardView button, #v34QuickActions button').forEach(b => {
      const txt = (b.textContent || '').toLowerCase();
      if(txt.includes('errores activos') || txt.includes('error log')){
        b.classList.add('v357-error-action');
      }
    });
  }

  // 5) Exámenes equilibrados: primero seleccionás tamaño; recién se inicia con botón inferior.
  window.setBalancedSize = function(n){
    localStorage.setItem('residenciapp_balanced_size', String(n || 20));
    enhanceBalancedPanel();
  };
  window.startSelectedBalancedExam = function(){
    const n = Number(localStorage.getItem('residenciapp_balanced_size') || 20);
    startBalancedExam(n);
  };
  function selectedTimingValue(){ return String(localStorage.getItem('residenciapp_balanced_time_mode') || 'free'); }
  function timingLabel(v){
    if(v === 'free') return 'modo libre · sin tiempo · feedback inmediato';
    const s = Number(v)||90;
    return (s===60?'1:00':s===90?'1:30':s===120?'2:00':s+' s')+' por pregunta · corrección final';
  }
  function sizeButton(n, label, sub){
    const active = String(localStorage.getItem('residenciapp_balanced_size') || '20') === String(n);
    return '<button type="button" class="v357-balanced-size rounded-2xl border '+(active?'border-indigo-500 bg-indigo-600 text-white shadow-glow':'border-slate-200 bg-white/75 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800')+' p-4 text-left" onclick="setBalancedSize('+n+')"><p class="font-display text-2xl font-extrabold">'+E(label)+'</p><p class="mt-1 text-xs font-black uppercase tracking-[.12em] '+(active?'text-indigo-100':'text-slate-400')+'">'+E(sub)+'</p></button>';
  }
  function enhanceBalancedPanel(){
    const panel = $('#v343BalancedPanel');
    if(!panel) return;
    const size = Number(localStorage.getItem('residenciapp_balanced_size') || 20);
    const timing = selectedTimingValue();
    const preview = (typeof previewBalancedExam === 'function' ? previewBalancedExam(size) : []);
    const timeOptions = [
      ['free','Libre','sin tiempo'], ['60','1:00','por pregunta'], ['90','1:30','por pregunta'], ['120','2:00','por pregunta']
    ].map(opt => {
      const active = timing === opt[0];
      return '<label data-balanced-time-card data-value="'+opt[0]+'" class="cursor-pointer rounded-2xl border '+(active?'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30':'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/60')+' p-3 transition hover:border-indigo-300 dark:hover:border-indigo-700"><input class="sr-only" type="radio" name="balancedTimeMode" value="'+opt[0]+'" '+(active?'checked':'')+' onchange="setBalancedTimeMode(\''+opt[0]+'\'); setTimeout(enhanceBalancedPanel,20)"><p class="font-display text-2xl font-extrabold">'+E(opt[1])+'</p><p class="text-xs font-black uppercase tracking-[.12em] text-slate-500 dark:text-slate-400">'+E(opt[2])+'</p></label>';
    }).join('');
    panel.innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Exámenes equilibrados</p><h3 class="font-display text-2xl font-extrabold">Elegí modalidad, tamaño y recién después iniciá</h3><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">La app arma automáticamente el examen por distribución del banco. En modo libre tenés feedback inmediato; con tiempo funciona como simulacro ciego hasta el final.</p></div></div>'
      + '<div class="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">1 · Modalidad</p><div class="mt-3 grid gap-3 sm:grid-cols-4">'+timeOptions+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">2 · Tamaño del examen</p><div class="mt-3 grid gap-3 sm:grid-cols-3">'+sizeButton(20,'Mini','20 preguntas')+sizeButton(50,'Medio','50 preguntas')+sizeButton(100,'Completo','100 preguntas')+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">3 · Listo para iniciar</p><h4 class="font-display text-xl font-extrabold">'+size+' preguntas · '+E(timingLabel(timing))+'</h4></div><button class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700" onclick="startSelectedBalancedExam()">Iniciar</button></div></div>'
      + '<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">'+preview.map(r=>'<div class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><div class="flex items-center justify-between gap-2"><span class="text-xs font-black uppercase tracking-[.12em] text-slate-400">'+E(r.id)+'</span><span class="font-display text-2xl font-extrabold" style="color:'+r.color+'">'+r.n+'</span></div><h4 class="mt-1 text-sm font-extrabold">'+E(r.label)+'</h4><p class="mt-1 text-xs font-semibold text-slate-500">Distribución estimada</p></div>').join('')+'</div>';
  }
  const oldSetBalancedTimeMode = window.setBalancedTimeMode;
  window.setBalancedTimeMode = function(value){
    if(typeof oldSetBalancedTimeMode === 'function') oldSetBalancedTimeMode(value);
    else localStorage.setItem('residenciapp_balanced_time_mode', String(value || 'free'));
    setTimeout(enhanceBalancedPanel, 20);
  };
  window.enhanceBalancedPanel = enhanceBalancedPanel;

  // Wrap renderers once all previous layers already loaded.
  function afterRender(){
    try{ renderQuestionNavigator(); }catch(_){ }
    try{ polishDashboardButtons(); }catch(_){ }
    try{ enhanceBalancedPanel(); }catch(_){ }
  }
  try{
    const baseRenderQuestion = renderQuestion;
    renderQuestion = function(){ const r = baseRenderQuestion.apply(this, arguments); setTimeout(afterRender, 0); return r; };
  }catch(_){ }
  try{
    const baseRenderAll = renderAll;
    renderAll = function(){ const r = baseRenderAll.apply(this, arguments); setTimeout(afterRender, 0); return r; };
  }catch(_){ }
  try{
    const baseRenderV34Dashboard = renderV34Dashboard;
    renderV34Dashboard = function(){ const r = baseRenderV34Dashboard.apply(this, arguments); setTimeout(afterRender, 0); return r; };
  }catch(_){ }
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(afterRender, 250);
    const mo = new MutationObserver(() => setTimeout(afterRender, 30));
    mo.observe(document.body, {childList:true, subtree:true});
  });
})();
