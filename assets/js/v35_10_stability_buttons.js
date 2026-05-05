/* === ResidenciAPP v35.10 · estabilidad de botones + Exámenes equilibrados robustos ===
   Capa no destructiva: no modifica banco, IDs, progreso histórico ni métricas.
   Objetivo: evitar trabas por re-renderes, normalizar el flujo de Exámenes equilibrados
   y dejar handlers explícitos para modalidad + tamaño + iniciar.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3510__) return;
  window.__RESIDENCIAPP_V3510__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isNumber = n => Number.isFinite(Number(n));

  function saveSafe(){ try{ if(typeof saveState === 'function') saveState(); }catch(_){ } }
  function shuffled(list){
    try{ if(typeof shuffle === 'function') return shuffle(list); }catch(_){ }
    return [...(list||[])].sort(()=>Math.random()-.5);
  }
  function safeQuestions(){
    try{ return (QUESTIONS||[]).filter(q => q && q.id && q.q && q.opts && q.ans); }catch(_){ return []; }
  }
  function balancedSize(){
    const n = Number(localStorage.getItem('residenciapp_balanced_size') || '20');
    return [20,50,100].includes(n) ? n : 20;
  }
  function balancedTime(){
    const v = String(localStorage.getItem('residenciapp_balanced_time_mode') || 'free');
    return ['free','60','90','120'].includes(v) ? v : 'free';
  }
  function timingText(v){
    if(v === 'free') return 'Modo libre · sin tiempo · feedback inmediato';
    const n = Number(v)||90;
    return (n===60?'1:00':n===90?'1:30':n===120?'2:00':n+' s') + ' por pregunta · corrección final';
  }
  function examTitle(n){
    return n===20 ? 'Mini examen equilibrado' : n===50 ? 'Examen medio equilibrado' : 'Simulacro completo equilibrado';
  }
  function buildExam(n){
    try{
      if(typeof buildBalancedExam === 'function'){
        const qs = buildBalancedExam(n, {preferUnanswered:true});
        if(Array.isArray(qs) && qs.length) return qs.slice(0,n);
      }
    }catch(err){ console.warn('[v35.10] buildBalancedExam falló; uso fallback:', err); }
    return shuffled(safeQuestions()).slice(0,n);
  }

  window.setBalancedSize = function(n){
    const v = [20,50,100].includes(Number(n)) ? Number(n) : 20;
    localStorage.setItem('residenciapp_balanced_size', String(v));
    renderBalancedPanelV3510(true);
  };
  window.setBalancedTimeMode = function(v){
    const value = ['free','60','90','120'].includes(String(v)) ? String(v) : 'free';
    localStorage.setItem('residenciapp_balanced_time_mode', value);
    renderBalancedPanelV3510(true);
  };
  window.startSelectedBalancedExam = function(){
    const n = balancedSize();
    const t = balancedTime();
    return window.startBalancedExam(n, t === 'free' ? 'free' : Number(t));
  };

  window.startBalancedExam = function(totalQ=20, secondsPerQuestion='free'){
    const n = [20,50,100].includes(Number(totalQ)) ? Number(totalQ) : Math.max(1, Number(totalQ)||20);
    const free = secondsPerQuestion === 'free' || secondsPerQuestion === undefined || String(secondsPerQuestion) === 'free';
    const seconds = free ? 0 : (Number(secondsPerQuestion)||90);
    const qs = buildExam(n);
    if(!qs.length) return alert('No hay preguntas disponibles para armar el examen equilibrado.');
    if(qs.length < n){
      const ok = confirm('Solo encontré '+qs.length+' preguntas disponibles para este examen. ¿Querés iniciarlo igual?');
      if(!ok) return;
    }
    const title = examTitle(n);
    const meta = qs.length+' preguntas · examen equilibrado · '+(free ? 'modo libre sin tiempo · feedback inmediato' : timingText(String(seconds)));
    try{
      if(free){
        setSession(qs, title, meta, 'preguntas', false, {mode:'practice'});
      }else{
        setSession(qs, title, meta, 'simulacro', false, {mode:'exam', secondsPerQuestion:seconds});
      }
      if(window.session || typeof session !== 'undefined'){
        session.examKind = 'balanced';
        session.examSize = qs.length;
        session.examPlan = typeof previewBalancedExam === 'function' ? previewBalancedExam(qs.length) : [];
        session.balancedTiming = free ? 'free' : String(seconds);
        session.balancedFeedbackMode = free ? 'immediate' : 'final';
        state.session = session;
        saveSafe();
      }
      try{ showView('session'); }catch(_){ }
      try{ renderQuestion(); }catch(_){ }
    }catch(err){
      console.error('[v35.10] No se pudo iniciar examen equilibrado:', err);
      alert('No se pudo iniciar el examen equilibrado. Probá recargar la página. Detalle: '+(err?.message || err));
    }
  };
  window.startBalancedMini = () => window.startBalancedExam(20, balancedTime()==='free' ? 'free' : Number(balancedTime()));
  window.startBalancedMedium = () => window.startBalancedExam(50, balancedTime()==='free' ? 'free' : Number(balancedTime()));
  window.startBalancedFull = () => window.startBalancedExam(100, balancedTime()==='free' ? 'free' : Number(balancedTime()));

  function timeCard(value, title, sub){
    const active = balancedTime() === String(value);
    const cls = active ? 'border-indigo-500 bg-indigo-600 text-white shadow-glow' : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
    const subCls = active ? 'text-indigo-100' : 'text-slate-400';
    return '<button type="button" data-v3510-balanced-time="'+E(value)+'" class="rounded-2xl border '+cls+' p-4 text-left transition hover:-translate-y-0.5">'
      + '<p class="font-display text-2xl font-extrabold">'+E(title)+'</p>'
      + '<p class="mt-1 text-xs font-black uppercase tracking-[.12em] '+subCls+'">'+E(sub)+'</p>'
      + '</button>';
  }
  function sizeCard(n, title, sub){
    const active = balancedSize() === Number(n);
    const cls = active ? 'border-indigo-500 bg-indigo-600 text-white shadow-glow' : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
    const subCls = active ? 'text-indigo-100' : 'text-slate-400';
    return '<button type="button" data-v3510-balanced-size="'+Number(n)+'" class="rounded-2xl border '+cls+' p-4 text-left transition hover:-translate-y-0.5">'
      + '<p class="font-display text-2xl font-extrabold">'+E(title)+'</p>'
      + '<p class="mt-1 text-xs font-black uppercase tracking-[.12em] '+subCls+'">'+E(sub)+'</p>'
      + '</button>';
  }
  function previewHtml(n){
    let preview = [];
    try{ preview = typeof previewBalancedExam === 'function' ? previewBalancedExam(n) : []; }catch(_){ preview = []; }
    if(!preview.length) return '<div class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">La vista previa no está disponible, pero el motor puede iniciar el examen usando el banco local.</div>';
    return '<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">'+preview.map(r=>'<div class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><div class="flex items-center justify-between gap-2"><span class="text-xs font-black uppercase tracking-[.12em] text-slate-400">'+E(r.id || '')+'</span><span class="font-display text-2xl font-extrabold" style="color:'+E(r.color || '#1877d6')+'">'+E(r.n || 0)+'</span></div><h4 class="mt-1 text-sm font-extrabold">'+E(r.label || '')+'</h4><p class="mt-1 text-xs font-semibold text-slate-500">Distribución estimada</p></div>').join('')+'</div>';
  }

  function renderBalancedPanelV3510(force=false){
    const panel = $('#v343BalancedPanel');
    if(!panel) return;
    const n = balancedSize();
    const t = balancedTime();
    const key = n+'|'+t+'|v3510';
    if(!force && panel.dataset.v3510Key === key) return;
    panel.dataset.v3510Key = key;
    panel.innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Exámenes equilibrados</p><h3 class="font-display text-2xl font-extrabold">Elegí modalidad, tipo de examen y después iniciá</h3><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">La app arma automáticamente el examen. En modo libre hay feedback inmediato y colaboración; con tiempo funciona como simulacro ciego hasta la corrección final.</p></div></div>'
      + '<div class="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">1 · Modalidad</p><div class="mt-3 grid gap-3 sm:grid-cols-4">'+timeCard('free','Libre','sin tiempo')+timeCard('60','1:00','por pregunta')+timeCard('90','1:30','por pregunta')+timeCard('120','2:00','por pregunta')+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">2 · Tipo de examen</p><div class="mt-3 grid gap-3 sm:grid-cols-3">'+sizeCard(20,'Mini','20 preguntas')+sizeCard(50,'Medio','50 preguntas')+sizeCard(100,'Completo','100 preguntas')+'</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">3 · Listo para iniciar</p><h4 class="font-display text-xl font-extrabold">'+n+' preguntas · '+E(timingText(t))+'</h4><p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">El examen no comienza hasta tocar Iniciar.</p></div><button type="button" id="balancedStartBtn" data-v3510-balanced-start="1" class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700">Iniciar</button></div></div>'
      + previewHtml(n);
  }
  window.renderBalancedPanelV3510 = renderBalancedPanelV3510;
  window.enhanceBalancedPanel = renderBalancedPanelV3510;

  document.addEventListener('click', function(ev){
    const time = ev.target.closest('[data-v3510-balanced-time]');
    if(time){ ev.preventDefault(); window.setBalancedTimeMode(time.dataset.v3510BalancedTime); return; }
    const size = ev.target.closest('[data-v3510-balanced-size]');
    if(size){ ev.preventDefault(); window.setBalancedSize(Number(size.dataset.v3510BalancedSize)); return; }
    const start = ev.target.closest('[data-v3510-balanced-start]');
    if(start){ ev.preventDefault(); window.startSelectedBalancedExam(); return; }
  }, true);

  function maintenance(){
    try{ renderBalancedPanelV3510(false); }catch(err){ console.warn('[v35.10] mantenimiento parcial:', err); }
  }
  let scheduled = false;
  function scheduleMaintenance(){
    if(scheduled) return;
    scheduled = true;
    setTimeout(()=>{ scheduled = false; maintenance(); }, 60);
  }

  try{
    const oldShowView = window.showView || showView;
    window.showView = showView = function(){
      const r = oldShowView.apply(this, arguments);
      scheduleMaintenance();
      return r;
    };
  }catch(_){ }
  try{
    const oldRenderAll = window.renderAll || renderAll;
    window.renderAll = renderAll = function(){
      const r = oldRenderAll.apply(this, arguments);
      scheduleMaintenance();
      return r;
    };
  }catch(_){ }
  try{
    const oldRenderV34Dashboard = window.renderV34Dashboard || renderV34Dashboard;
    window.renderV34Dashboard = renderV34Dashboard = function(){
      const r = oldRenderV34Dashboard.apply(this, arguments);
      scheduleMaintenance();
      return r;
    };
  }catch(_){ }

  document.addEventListener('DOMContentLoaded', () => setTimeout(maintenance, 350));
  setTimeout(maintenance, 750);
  console.log('%c[ResidenciAPP v35.10]','color:#4f46e5;font-weight:bold','botones y exámenes equilibrados estabilizados');
})();
