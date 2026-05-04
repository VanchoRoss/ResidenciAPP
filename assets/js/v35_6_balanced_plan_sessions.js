/* === ResidenciAPP v35.6 · exámenes libres con feedback + plan inteligente + gestor de sesiones ===
   Capa no destructiva: no toca banco, IDs ni progreso histórico. Solo amplía UI y estado de sesiones activas.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V356__) return;
  window.__RESIDENCIAPP_V356__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowId = () => 'SES-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,7).toUpperCase();

  function ensureStateShape(){
    try{
      state.activeSessions ||= [];
      if(!Array.isArray(state.activeSessions)) state.activeSessions = [];
    }catch(_){ }
  }
  function save(){ try{ saveState(); }catch(_){ } }
  function qById(id){ try{ return QUESTIONS.find(q => q.id === id); }catch(_){ return null; } }
  function sessionQuestionsOf(s){ return (s?.questions || []).map(qById).filter(Boolean); }
  function selectedCountOf(s){ return Object.keys(s?.selected || {}).length; }
  function isSessionUnfinished(s){
    const total = (s?.questions || []).length;
    if(!total) return false;
    return selectedCountOf(s) < total;
  }
  function sessionKindLabel(s){
    const hay = String([s?.title, s?.meta, s?.method, s?.mode, s?.examKind].join(' ')).toLowerCase();
    if(hay.includes('balanced') || hay.includes('equilibrado')) return 'Examen equilibrado';
    if(hay.includes('revenge') || hay.includes('revancha')) return 'Revancha';
    if(hay.includes('simulacro') || s?.mode === 'exam') return 'Simulacro';
    if(hay.includes('repaso')) return 'Repaso';
    if(hay.includes('neuroprep')) return 'NeuroPREP';
    return 'Práctica';
  }
  function ensureSessionId(s){
    if(!s) return '';
    if(!s.sid) s.sid = nowId();
    return s.sid;
  }
  function currentSessionObject(){
    try{
      const s = state.session || session;
      if(s && isSessionUnfinished(s)){
        ensureSessionId(s);
        state.session = s;
        return s;
      }
    }catch(_){ }
    return null;
  }
  function archivedSessions(){
    ensureStateShape();
    const map = new Map();
    (state.activeSessions || []).filter(isSessionUnfinished).forEach(s => {
      ensureSessionId(s);
      map.set(s.sid, s);
    });
    state.activeSessions = Array.from(map.values()).slice(0,12);
    return state.activeSessions;
  }
  function allActiveSessions(){
    const current = currentSessionObject();
    const archived = archivedSessions().filter(s => !current || s.sid !== current.sid);
    return current ? [{...current, __current:true}, ...archived] : archived;
  }
  function archiveCurrentSession(reason='auto'){
    ensureStateShape();
    const s = currentSessionObject();
    if(!s || !isSessionUnfinished(s)) return;
    ensureSessionId(s);
    s.archivedAt = Date.now();
    s.archiveReason = reason;
    const others = (state.activeSessions || []).filter(x => x && x.sid !== s.sid);
    state.activeSessions = [JSON.parse(JSON.stringify(s)), ...others].slice(0,12);
    save();
  }
  function sessionProgressHtml(s){
    const total = (s?.questions || []).length || 0;
    const idx = Math.min((Number(s?.idx)||0)+1, total || 1);
    const answered = selectedCountOf(s);
    const pct = total ? Math.round(answered / total * 100) : 0;
    return '<div class="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60">'
      + '<div class="flex items-center justify-between text-[11px] font-black uppercase tracking-[.12em] text-slate-500"><span>Pregunta '+idx+' de '+total+'</span><span>'+answered+'/'+total+' respondidas</span></div>'
      + '<div class="mt-2 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800"><div class="h-full rounded-full bg-medical-600" style="width:'+pct+'%"></div></div>'
      + '</div>';
  }
  function sessionCard(s){
    const id = E(s.sid);
    const label = sessionKindLabel(s);
    return '<article class="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">'
      + '<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><p class="text-[11px] font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300">'+E(label)+(s.__current?' · sesión actual':' · guardada')+'</p>'
      + '<h4 class="mt-1 font-display text-xl font-extrabold leading-tight">'+E(s.title || 'Sesión activa')+'</h4>'
      + '<p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+E(s.meta || 'Entrenamiento en curso')+'</p></div>'
      + '<div class="flex shrink-0 flex-wrap gap-2"><button class="rounded-2xl bg-medical-600 px-4 py-2 text-xs font-black text-white hover:bg-medical-700" onclick="resumeSavedSession(\''+id+'\')">Retomar</button>'
      + '<button class="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="discardSavedSession(\''+id+'\')">Quitar</button></div></div>'
      + sessionProgressHtml(s) + '</article>';
  }

  window.resumeSavedSession = function(sid){
    ensureStateShape();
    const current = currentSessionObject();
    if(current && current.sid === sid){
      session = state.session = current;
      save(); showView('session'); renderQuestion(); return;
    }
    const found = (state.activeSessions || []).find(s => s.sid === sid);
    if(!found) return alert('No encontré esa sesión activa.');
    state.activeSessions = (state.activeSessions || []).filter(s => s.sid !== sid);
    session = found;
    state.session = found;
    save();
    showView('session');
    renderQuestion();
    setTimeout(()=>window.scrollTo({top:0, behavior:'smooth'}), 60);
  };

  window.discardSavedSession = function(sid){
    ensureStateShape();
    const current = currentSessionObject();
    if(current && current.sid === sid){
      state.session = null; session = null;
    }
    state.activeSessions = (state.activeSessions || []).filter(s => s.sid !== sid);
    save();
    showActiveSessionsManager();
    renderV356DashboardEnhancements();
  };

  window.showActiveSessionsManager = function(){
    ensureStateShape();
    showView('session');
    const list = allActiveSessions();
    const empty = $('#emptySession');
    const content = $('#sessionContent');
    if(content) content.classList.add('hidden');
    if(!empty) return;
    empty.classList.remove('hidden');
    if(!list.length){
      empty.innerHTML = '<h3 class="font-display text-3xl font-extrabold">No hay sesión activa</h3><p class="mt-2 text-slate-500 dark:text-slate-400">Elegí un sprint, un repaso o un examen para empezar.</p><button class="mt-5 rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white" onclick="showView(\'dashboard\')">Ir al panel</button>';
      return;
    }
    empty.innerHTML = '<div class="mx-auto max-w-5xl text-left"><div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Sesión activa</p><h3 class="font-display text-3xl font-extrabold">Retomar entrenamientos iniciados</h3><p class="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">Acá aparecen los modos que empezaste y todavía no terminaste. Podés retomar cualquiera desde donde quedó.</p></div><button class="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="showView(\'dashboard\')">Volver al panel</button></div><div class="grid gap-3">'+list.map(sessionCard).join('')+'</div></div>';
  };

  // Sesión activa: abrir gestor en lugar de saltar directo, para que el usuario vea todos los modos abiertos.
  try{
    resumeOrStart = function(){ showActiveSessionsManager(); };
  }catch(_){ }

  // Archivar sesión incompleta antes de iniciar otra. No borra progreso ni respuestas.
  try{
    const baseSetSession = setSession;
    setSession = function(list, title, meta, method, shuffle, options={}){
      try{ archiveCurrentSession('new_session_started'); }catch(_){ }
      const result = baseSetSession.apply(this, arguments);
      try{
        if(session){
          session.sid = nowId();
          session.startedAt ||= Date.now();
          session.updatedAt = Date.now();
          state.session = session;
          save();
        }
      }catch(_){ }
      return result;
    };
  }catch(_){ }

  // Asegurar que al navegar/responder quede persistida la sesión actual con ID.
  function persistCurrentSession(){
    try{
      if(session && isSessionUnfinished(session)){
        ensureSessionId(session);
        session.updatedAt = Date.now();
        state.session = session;
        save();
      }
    }catch(_){ }
  }

  try{
    const baseSelectAnswer = selectAnswer;
    selectAnswer = function(id, selected){
      const r = baseSelectAnswer.apply(this, arguments);
      persistCurrentSession();
      setTimeout(enhanceBalancedFreeFeedback, 20);
      setTimeout(renderV356DashboardEnhancements, 30);
      return r;
    };
  }catch(_){ }

  try{
    const baseNextQuestion = nextQuestion;
    nextQuestion = function(){
      const r = baseNextQuestion.apply(this, arguments);
      persistCurrentSession();
      setTimeout(renderV356DashboardEnhancements, 30);
      return r;
    };
  }catch(_){ }
  try{
    const basePrevQuestion = prevQuestion;
    prevQuestion = function(){
      const r = basePrevQuestion.apply(this, arguments);
      persistCurrentSession();
      return r;
    };
  }catch(_){ }

  // Exámenes equilibrados: libre = práctica con feedback inmediato, explicación y aporte colaborativo.
  function selectedBalancedTiming(){
    const value = String((document.querySelector('input[name="balancedTimeMode"]:checked')?.value) || localStorage.getItem('residenciapp_balanced_time_mode') || 'free');
    localStorage.setItem('residenciapp_balanced_time_mode', value);
    if(value === 'free') return {free:true, seconds:0, label:'modo libre sin tiempo'};
    const seconds = Number(value) || 90;
    return {free:false, seconds, label: seconds===60?'1:00 por pregunta':seconds===90?'1:30 por pregunta':seconds===120?'2:00 por pregunta':seconds+' segundos por pregunta'};
  }
  try{
    window.startBalancedExam = function(totalQ=20, secondsPerQuestion){
      const n = Math.max(1, Number(totalQ)||20);
      const timing = secondsPerQuestion === undefined ? selectedBalancedTiming() : (secondsPerQuestion === 'free' ? {free:true, seconds:0, label:'modo libre sin tiempo'} : {free:false, seconds:Number(secondsPerQuestion)||90, label:(Number(secondsPerQuestion)||90)+' segundos por pregunta'});
      const qs = buildBalancedExam(n, {preferUnanswered:true});
      if(!qs.length) return alert('No hay preguntas disponibles para armar el examen equilibrado.');
      const title = n===20 ? 'Mini examen equilibrado' : n===50 ? 'Examen medio equilibrado' : 'Simulacro completo equilibrado';
      const meta = n+' preguntas · distribución histórica por eje · '+(timing.free ? 'libre, sin tiempo, con feedback inmediato' : timing.label+' · feedback al final');
      if(timing.free){
        setSession(qs, title, meta, 'preguntas', false, {mode:'practice'});
      } else {
        setSession(qs, title, meta, 'simulacro', false, {mode:'exam', secondsPerQuestion:timing.seconds});
      }
      if(session){
        session.examKind = 'balanced';
        session.examSize = n;
        session.examPlan = typeof previewBalancedExam === 'function' ? previewBalancedExam(n) : [];
        session.balancedTiming = timing.free ? 'free' : String(timing.seconds);
        session.balancedFeedbackMode = timing.free ? 'immediate' : 'final';
        state.session = session;
        save();
        renderQuestion?.();
      }
    };
    window.startBalancedMini = () => startBalancedExam(20);
    window.startBalancedMedium = () => startBalancedExam(50);
    window.startBalancedFull = () => startBalancedExam(100);
  }catch(_){ }

  function currentSessionQuestion(){
    try{
      const arr = getSessionQuestions();
      return arr?.[session?.idx || 0] || null;
    }catch(_){ return null; }
  }
  function selectedForCurrent(q){
    try{ return session?.selected?.[q.id] || answerFor(q)?.selected || ''; }catch(_){ return ''; }
  }
  function enhanceBalancedFreeFeedback(){
    const q = currentSessionQuestion();
    if(!q || !session || session.examKind !== 'balanced' || session.mode === 'exam') return;
    const selected = selectedForCurrent(q);
    if(!selected) return;
    const card = $('#questionCard');
    if(!card || $('#v356BalancedFeedbackPanel', card)) return;
    const ok = selected === q.ans;
    const cls = ok ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100' : 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100';
    card.insertAdjacentHTML('beforeend', '<section id="v356BalancedFeedbackPanel" class="mt-5 rounded-[1.6rem] border '+cls+' p-4"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em]">Examen equilibrado · modo libre</p><h4 class="mt-1 font-display text-xl font-extrabold">'+(ok?'Correcta':'Incorrecta')+'</h4><p class="mt-1 text-sm font-semibold leading-6 opacity-85">En esta modalidad tenés explicación inmediata y podés dejar aportes como en el entrenamiento normal.</p></div><div class="flex flex-wrap gap-2"><button class="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" onclick="toggleCollaborationMode()">🤝 Aportar / colaborar</button><button class="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800" onclick="openGoogleForCurrent()">🔎 Consultar IA</button></div></div></section>');
  }
  try{
    const baseRenderQuestion = renderQuestion;
    renderQuestion = function(){
      const r = baseRenderQuestion.apply(this, arguments);
      persistCurrentSession();
      enhanceBalancedFreeFeedback();
      return r;
    };
  }catch(_){ }

  // Plan de hoy: prioriza tema más flojo; si no hay datos suficientes, menos tocado.
  function sprintStatsLocal(sp){
    const qs = sp?.questions || [];
    const answered = qs.filter(q => { try{return !!answerFor(q);}catch(_){return false;} }).length;
    const correct = qs.filter(q => { try{return !!answerFor(q) && answerFor(q).selected === q.ans;}catch(_){return false;} }).length;
    const incorrect = Math.max(answered - correct, 0);
    const acc = answered ? Math.round(correct / answered * 100) : 0;
    const coverage = qs.length ? answered / qs.length : 0;
    return {answered, correct, incorrect, acc, coverage, total:qs.length, pct:Math.round(coverage*100)};
  }
  function recommendedSprint(){
    const rows = (SPRINTS || []).map(sp => ({sp, st:sprintStatsLocal(sp)})).filter(x => x.st.answered < x.st.total);
    const weak = rows.filter(x => x.st.answered >= 3 && x.st.acc < 70);
    if(weak.length){
      weak.sort((a,b)=> a.st.acc-b.st.acc || b.st.incorrect-a.st.incorrect || a.st.coverage-b.st.coverage || b.st.total-a.st.total);
      const x = weak[0];
      return {sp:x.sp, st:x.st, reason:'más flojo', detail:'Prioridad por rendimiento bajo: '+x.st.acc+'% de acierto con '+x.st.answered+'/'+x.st.total+' respondidas.'};
    }
    rows.sort((a,b)=> a.st.coverage-b.st.coverage || a.st.answered-b.st.answered || b.st.total-a.st.total);
    const x = rows[0];
    if(!x) return null;
    const untouched = x.st.answered === 0;
    return {sp:x.sp, st:x.st, reason: untouched ? 'menos tocado' : 'baja cobertura', detail: untouched ? 'Todavía no registrás respuestas en este sprint.' : 'Tiene baja cobertura: '+x.st.answered+'/'+x.st.total+' respondidas.'};
  }
  function globalCoverage(){
    try{
      const answered = QUESTIONS.filter(q => !!answerFor(q)).length;
      return {answered, total:QUESTIONS.length, pct:QUESTIONS.length ? Math.round(answered/QUESTIONS.length*100) : 0};
    }catch(_){ return {answered:0,total:0,pct:0}; }
  }
  function renderPlanCard(){
    const box = $('#v34ContinueCard'); if(!box) return;
    const rec = recommendedSprint();
    const cov = globalCoverage();
    if(!rec){
      box.innerHTML = '<div class="relative z-[1]"><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Plan de hoy</p><h3 class="mt-1 font-display text-2xl font-extrabold">Banco completo</h3><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">No quedan sprints pendientes según el progreso local.</p></div>';
      return;
    }
    const sp = rec.sp, st = rec.st;
    const badge = rec.reason === 'más flojo' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-200';
    box.innerHTML = '<div class="relative z-[1]"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Plan de hoy</p><h3 class="mt-1 font-display text-2xl font-extrabold">Sprint recomendado por datos</h3><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">Cobertura global: <strong>'+cov.answered+'/'+cov.total+'</strong> preguntas respondidas ('+cov.pct+'%).</p></div><span class="rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[.14em] '+badge+'">'+E(rec.reason)+'</span></div>'
      + '<div class="mt-5 rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/60"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">'+E(sp.eje||'')+'</p><h4 class="mt-1 font-display text-xl font-extrabold">'+E(sp.sprint||'')+'</h4><p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">'+E(sp.tema||'')+' · '+st.answered+'/'+st.total+' respondidas · '+(st.answered?st.acc+'% acierto':'sin datos')+'</p><p class="mt-2 text-xs font-bold leading-5 text-medical-700 dark:text-medical-300">'+E(rec.detail)+'</p><div class="mt-3 h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-800"><div class="h-full rounded-full bg-medical-600" style="width:'+st.pct+'%"></div></div></div>'
      + '<div class="mt-5 flex flex-wrap gap-2"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-medical-700" onclick="startSprint(\''+E(sp.id)+'\', state.method||\'preguntas\')">Empezar recomendado</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="showActiveSessionsManager()">Ver sesiones activas</button></div></div>';
  }
  function renderActiveSessionsDashboardModule(){
    const overview = $('#v34Overview');
    if(!overview) return;
    let el = $('#v356ActiveSessionsDashboard');
    const list = allActiveSessions();
    if(!list.length){ if(el) el.remove(); return; }
    if(!el){
      el = document.createElement('section');
      el.id = 'v356ActiveSessionsDashboard';
      el.className = 'v34-clean-card mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900';
      overview.insertAdjacentElement('afterend', el);
    }
    el.innerHTML = '<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Sesión activa</p><h3 class="font-display text-2xl font-extrabold">Módulos empezados y no terminados</h3><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Retomá sprints, simulacros, repasos o juegos de entrenamiento desde donde quedaron.</p></div><button class="rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-black text-white hover:bg-indigo-700" onclick="showActiveSessionsManager()">Ver todo</button></div><div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">'+list.slice(0,3).map(sessionCard).join('')+'</div>';
  }
  window.renderV356DashboardEnhancements = function(){
    try{ renderPlanCard(); renderActiveSessionsDashboardModule(); }catch(e){ console.warn('v35.6 dashboard enhancement failed', e); }
  };

  try{
    const baseRenderV34Dashboard = renderV34Dashboard;
    renderV34Dashboard = function(){
      const r = baseRenderV34Dashboard.apply(this, arguments);
      renderV356DashboardEnhancements();
      return r;
    };
  }catch(_){ }
  try{
    const baseRenderAll = renderAll;
    renderAll = function(){
      const r = baseRenderAll.apply(this, arguments);
      renderV356DashboardEnhancements();
      return r;
    };
  }catch(_){ }

  document.addEventListener('DOMContentLoaded', () => {
    ensureStateShape();
    setTimeout(() => { renderV356DashboardEnhancements(); }, 300);
  });
})();
