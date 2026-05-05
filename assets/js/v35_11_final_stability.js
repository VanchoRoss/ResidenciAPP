/* === ResidenciAPP v35.11 · estabilidad final de botones + Exámenes equilibrados ===
   Capa no destructiva: no modifica banco, IDs, progreso histórico ni métricas guardadas.
   Objetivo: dejar el módulo de Exámenes equilibrados con flujo explícito:
   modalidad -> tamaño -> iniciar, y blindar botones críticos contra handlers viejos.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3511__) return;
  window.__RESIDENCIAPP_V3511__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LS_TIME = 'residenciapp_balanced_time_mode';
  const LS_SIZE = 'residenciapp_balanced_size';

  function safeSave(){ try{ if(typeof saveState === 'function') saveState(); }catch(err){ console.warn('[v35.11] saveState parcial:', err); } }
  function safeShow(name){ try{ if(typeof showView === 'function') showView(name); }catch(err){ console.warn('[v35.11] showView parcial:', err); } }
  function safeRenderQuestion(){ try{ if(typeof renderQuestion === 'function') renderQuestion(); }catch(err){ console.warn('[v35.11] renderQuestion parcial:', err); } }
  function safeShuffle(list){
    const arr = Array.from(list || []);
    for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  }
  function allQuestions(){ try{ return Array.from(QUESTIONS || []).filter(q=>q && q.id && q.q && q.opts); }catch(_){ return []; } }
  function answered(q){ try{ return !!(typeof answerFor === 'function' ? answerFor(q) : state?.answers?.[q.id]); }catch(_){ return false; } }

  function getBalancedTime(){
    let v = 'free';
    try{ v = localStorage.getItem(LS_TIME) || 'free'; }catch(_){ }
    v = String(v);
    return ['free','60','90','120'].includes(v) ? v : 'free';
  }
  function getBalancedSize(){
    let n = 20;
    try{ n = Number(localStorage.getItem(LS_SIZE) || 20); }catch(_){ }
    return [20,50,100].includes(n) ? n : 20;
  }
  function setBalancedTime(v){
    const value = ['free','60','90','120'].includes(String(v)) ? String(v) : 'free';
    try{ localStorage.setItem(LS_TIME, value); }catch(_){ }
    renderBalancedExamPanelV3511(true);
  }
  function setBalancedSize(n){
    const value = [20,50,100].includes(Number(n)) ? Number(n) : 20;
    try{ localStorage.setItem(LS_SIZE, String(value)); }catch(_){ }
    renderBalancedExamPanelV3511(true);
  }
  function timeLabel(v=getBalancedTime()){
    if(v === 'free') return 'Libre · sin tiempo · feedback inmediato';
    const n = Number(v)||90;
    return (n===60?'1:00':n===90?'1:30':n===120?'2:00':n+' s') + ' por pregunta · corrección al final';
  }
  function examName(n){ return n===20 ? 'Mini examen equilibrado' : n===50 ? 'Examen medio equilibrado' : 'Simulacro completo equilibrado'; }

  function buildFallbackBalancedExam(total){
    const qs = allQuestions();
    const groups = [
      {key:'salud_publica', match:q=>String(q.source||'').includes('salud_publica') || /salud p[uú]blica/i.test(q.eje||'')},
      {key:'gineco_obstetricia', match:q=>String(q.source||'').includes('gineco') || /mujer|gineco|obst/i.test((q.eje||'')+' '+(q.tema||''))},
      {key:'pediatria', match:q=>String(q.source||'').includes('pediatria') || /niñ|pediatr|adolesc/i.test((q.eje||'')+' '+(q.tema||''))},
      {key:'adultos', match:q=>/adult|cl[ií]nica|cirug/i.test((q.eje||'')+' '+(q.tema||'')+' '+(q.source||''))}
    ];
    const weights = total===20 ? [2,4,4,10] : total===50 ? [4,10,10,26] : [7,19,21,53];
    const used = new Set();
    const out = [];
    groups.forEach((g,idx)=>{
      let pool = qs.filter(q=>g.match(q) && !used.has(q.id));
      const fresh = pool.filter(q=>!answered(q));
      if(fresh.length >= weights[idx]) pool = fresh;
      safeShuffle(pool).slice(0,weights[idx]).forEach(q=>{ if(!used.has(q.id)){ used.add(q.id); out.push(q); } });
    });
    if(out.length < total){
      const rest = safeShuffle(qs.filter(q=>!used.has(q.id))).slice(0,total-out.length);
      rest.forEach(q=>{ used.add(q.id); out.push(q); });
    }
    return safeShuffle(out).slice(0,total);
  }
  function buildBalancedQuestions(total){
    const n = [20,50,100].includes(Number(total)) ? Number(total) : 20;
    try{
      if(typeof buildBalancedExam === 'function'){
        const built = buildBalancedExam(n, {preferUnanswered:true});
        if(Array.isArray(built) && built.length) return built.slice(0,n);
      }
    }catch(err){ console.warn('[v35.11] buildBalancedExam falló; uso fallback:', err); }
    return buildFallbackBalancedExam(n);
  }
  function previewRows(n){
    try{
      if(typeof previewBalancedExam === 'function'){
        const rows = previewBalancedExam(n);
        if(Array.isArray(rows) && rows.length) return rows;
      }
    }catch(_){ }
    if(n===20) return [
      {id:'SP', label:'Salud pública', n:2, color:'#BA7517'},
      {id:'MUJ', label:'Mujer / Gineco-obste', n:4, color:'#D4537E'},
      {id:'NNA', label:'Niñez y adolescencia', n:4, color:'#1D9E75'},
      {id:'ADU', label:'Adultos / Clínica-Cirugía', n:10, color:'#534AB7'}
    ];
    if(n===50) return [
      {id:'SP', label:'Salud pública', n:4, color:'#BA7517'},
      {id:'MUJ', label:'Mujer / Gineco-obste', n:10, color:'#D4537E'},
      {id:'NNA', label:'Niñez y adolescencia', n:10, color:'#1D9E75'},
      {id:'ADU', label:'Adultos / Clínica-Cirugía', n:26, color:'#534AB7'}
    ];
    return [
      {id:'SP', label:'Salud pública', n:7, color:'#BA7517'},
      {id:'MUJ', label:'Mujer / Gineco-obste', n:19, color:'#D4537E'},
      {id:'NNA', label:'Niñez y adolescencia', n:21, color:'#1D9E75'},
      {id:'ADU', label:'Adultos / Clínica-Cirugía', n:53, color:'#534AB7'}
    ];
  }

  function optionCard(kind, value, title, sub){
    const active = kind === 'time' ? getBalancedTime() === String(value) : getBalancedSize() === Number(value);
    const data = kind === 'time' ? 'data-v3511-balanced-time="'+E(value)+'"' : 'data-v3511-balanced-size="'+Number(value)+'"';
    const cls = active
      ? 'border-indigo-500 bg-indigo-600 text-white shadow-glow'
      : 'border-slate-200 bg-white/85 text-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
    const subCls = active ? 'text-indigo-100' : 'text-slate-400';
    return '<button type="button" '+data+' class="rounded-2xl border '+cls+' p-4 text-left transition hover:-translate-y-0.5">'
      + '<p class="font-display text-2xl font-extrabold">'+E(title)+'</p>'
      + '<p class="mt-1 text-xs font-black uppercase tracking-[.12em] '+subCls+'">'+E(sub)+'</p>'
      + '</button>';
  }
  function previewHtml(n){
    return '<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">'+previewRows(n).map(r=>
      '<div class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">'
      + '<div class="flex items-center justify-between gap-2"><span class="text-xs font-black uppercase tracking-[.12em] text-slate-400">'+E(r.id)+'</span><span class="font-display text-2xl font-extrabold" style="color:'+E(r.color||'#1877d6')+'">'+E(r.n)+'</span></div>'
      + '<h4 class="mt-1 text-sm font-extrabold">'+E(r.label)+'</h4><p class="mt-1 text-xs font-semibold text-slate-500">Distribución estimada</p></div>'
    ).join('')+'</div>';
  }
  function renderBalancedExamPanelV3511(force=false){
    const panel = $('#v343BalancedPanel');
    if(!panel) return;
    const size = getBalancedSize();
    const time = getBalancedTime();
    const key = 'v3511|'+size+'|'+time;
    if(!force && panel.dataset.v3511Key === key) return;
    panel.dataset.v3511Key = key;
    panel.innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Exámenes equilibrados</p><h3 class="font-display text-2xl font-extrabold">Elegí modalidad, tipo de examen y después iniciá</h3><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">El examen no comienza hasta tocar <strong>Iniciar</strong>. En modo libre hay feedback inmediato; con tiempo funciona como simulacro ciego hasta la corrección final.</p></div></div>'
      + '<div class="mt-5 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">1 · Modalidad</p><div class="mt-3 grid gap-3 sm:grid-cols-4">'
      + optionCard('time','free','Libre','sin tiempo') + optionCard('time','60','1:00','por pregunta') + optionCard('time','90','1:30','por pregunta') + optionCard('time','120','2:00','por pregunta') + '</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">2 · Tipo de examen</p><div class="mt-3 grid gap-3 sm:grid-cols-3">'
      + optionCard('size',20,'Mini','20 preguntas') + optionCard('size',50,'Medio','50 preguntas') + optionCard('size',100,'Completo','100 preguntas') + '</div></div>'
      + '<div class="mt-4 rounded-[1.7rem] border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/25"><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-indigo-600 dark:text-indigo-300">3 · Listo para iniciar</p><h4 class="font-display text-xl font-extrabold">'+size+' preguntas · '+E(timeLabel(time))+'</h4><p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Selección guardada localmente. Podés cambiarla antes de empezar.</p></div><button type="button" data-v3511-balanced-start="1" class="rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700">Iniciar</button></div></div>'
      + previewHtml(size);
  }

  function startBalancedV3511(totalQ=getBalancedSize(), timeMode=getBalancedTime()){
    const n = [20,50,100].includes(Number(totalQ)) ? Number(totalQ) : 20;
    const t = ['free','60','90','120'].includes(String(timeMode)) ? String(timeMode) : 'free';
    const questions = buildBalancedQuestions(n);
    if(!questions.length){ alert('No hay preguntas disponibles para armar el examen equilibrado.'); return; }
    const free = t === 'free';
    const seconds = free ? 0 : Number(t);
    const title = examName(n);
    const meta = n+' preguntas · examen equilibrado · '+(free ? 'modo libre sin tiempo · feedback inmediato' : timeLabel(t));
    try{
      if(typeof setSession !== 'function') throw new Error('setSession no disponible');
      setSession(questions, title, meta, free ? 'preguntas' : 'simulacro', false, free ? {mode:'practice'} : {mode:'exam', secondsPerQuestion:seconds});
      if(typeof session !== 'undefined' && session){
        session.examKind = 'balanced';
        session.examSize = questions.length;
        session.examPlan = previewRows(n);
        session.balancedTiming = free ? 'free' : String(seconds);
        session.balancedFeedbackMode = free ? 'immediate' : 'final';
        session.mode = free ? 'practice' : 'exam';
        if(!free){
          session.secondsPerQuestion = seconds;
          session.totalSeconds = questions.length * seconds;
          if(!session.remainingSeconds || session.remainingSeconds > session.totalSeconds) session.remainingSeconds = session.totalSeconds;
          session.freeTiming = false;
          session.lastTick = Date.now();
        }
        if(typeof state !== 'undefined') state.session = session;
        safeSave();
      }
      safeShow('session');
      safeRenderQuestion();
    }catch(err){
      console.error('[v35.11] No se pudo iniciar examen equilibrado:', err);
      alert('No se pudo iniciar el examen equilibrado. Recargá la página y probá de nuevo. Detalle: '+(err?.message || err));
    }
  }

  window.setBalancedTimeMode = setBalancedTime;
  window.setBalancedSize = setBalancedSize;
  window.startSelectedBalancedExam = function(){ startBalancedV3511(getBalancedSize(), getBalancedTime()); };
  window.startBalancedExam = function(totalQ=20, secondsPerQuestion='free'){
    const t = secondsPerQuestion === 'free' || secondsPerQuestion === undefined ? 'free' : String(Number(secondsPerQuestion)||90);
    startBalancedV3511(totalQ, t);
  };
  window.startBalancedMini = function(){ startBalancedV3511(20, getBalancedTime()); };
  window.startBalancedMedium = function(){ startBalancedV3511(50, getBalancedTime()); };
  window.startBalancedFull = function(){ startBalancedV3511(100, getBalancedTime()); };
  window.renderBalancedExamPanelV3511 = renderBalancedExamPanelV3511;
  window.renderBalancedPanelV3510 = renderBalancedExamPanelV3511;
  window.enhanceBalancedPanel = renderBalancedExamPanelV3511;

  document.addEventListener('click', function(ev){
    const time = ev.target.closest('[data-v3511-balanced-time]');
    if(time){ ev.preventDefault(); ev.stopPropagation(); setBalancedTime(time.getAttribute('data-v3511-balanced-time')); return; }
    const size = ev.target.closest('[data-v3511-balanced-size]');
    if(size){ ev.preventDefault(); ev.stopPropagation(); setBalancedSize(Number(size.getAttribute('data-v3511-balanced-size'))); return; }
    const start = ev.target.closest('[data-v3511-balanced-start]');
    if(start){ ev.preventDefault(); ev.stopPropagation(); window.startSelectedBalancedExam(); return; }
  }, true);

  function runMaintenance(){
    try{ renderBalancedExamPanelV3511(false); }catch(err){ console.warn('[v35.11] mantenimiento panel:', err); }
  }
  let pending = false;
  function scheduleMaintenance(){
    if(pending) return;
    pending = true;
    setTimeout(()=>{ pending=false; runMaintenance(); }, 90);
  }
  try{
    const oldShowView = window.showView || showView;
    window.showView = showView = function(){ const r = oldShowView.apply(this, arguments); scheduleMaintenance(); return r; };
  }catch(_){ }
  try{
    const oldRenderAll = window.renderAll || renderAll;
    window.renderAll = renderAll = function(){ const r = oldRenderAll.apply(this, arguments); scheduleMaintenance(); return r; };
  }catch(_){ }
  try{
    const oldRenderV34Dashboard = window.renderV34Dashboard || renderV34Dashboard;
    window.renderV34Dashboard = renderV34Dashboard = function(){ const r = oldRenderV34Dashboard.apply(this, arguments); scheduleMaintenance(); return r; };
  }catch(_){ }

  document.addEventListener('DOMContentLoaded', () => setTimeout(runMaintenance, 400));
  setTimeout(runMaintenance, 900);
  console.log('%c[ResidenciAPP v35.11]','color:#16a34a;font-weight:bold','Exámenes equilibrados y botones críticos estabilizados');
})();

/* === v35.11b · reparación final de click/tap en calendario de vacunas === */
(function(){
  if(window.__RESIDENCIAPP_V3511_VACCINE__) return;
  window.__RESIDENCIAPP_V3511_VACCINE__ = true;
  let downInfo = null;
  let recentPointerTap = null;
  const cellFrom = e => e?.target?.closest ? e.target.closest('#vaccineGameBoard .vaccine-cell') : null;
  function isFinished(){ return !!document.querySelector('#vaccineGameBoard .vaccine-tap:disabled'); }
  function toggleCell(cell){
    if(!cell || isFinished()) return;
    if(cell.classList.contains('vaccine-ok') || cell.classList.contains('vaccine-bad') || cell.classList.contains('vaccine-missed')) return;
    const on = !cell.classList.contains('is-selected');
    cell.classList.toggle('is-selected', on);
    const btn = cell.querySelector('.vaccine-tap');
    if(btn){ btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>'; }
    try{ if(typeof updateVaccineGameCounter === 'function') updateVaccineGameCounter(); }catch(_){ }
  }
  document.addEventListener('pointerdown', function(e){
    const cell = cellFrom(e);
    if(!cell) return;
    downInfo = {x:e.clientX, y:e.clientY, t:Date.now(), key:cell.dataset.key || ''};
  }, true);
  document.addEventListener('pointerup', function(e){
    const cell = cellFrom(e);
    if(!cell || !downInfo) return;
    const dx = Math.abs(e.clientX - downInfo.x);
    const dy = Math.abs(e.clientY - downInfo.y);
    if(dx <= 8 && dy <= 8){ recentPointerTap = {key:cell.dataset.key || '', t:Date.now()}; }
    downInfo = null;
  }, true);
  document.addEventListener('click', function(e){
    const cell = cellFrom(e);
    if(!cell) return;
    const key = cell.dataset.key || '';
    const recent = recentPointerTap && recentPointerTap.key === key && (Date.now() - recentPointerTap.t) < 900;
    if(recent){
      // Las capas anteriores pueden alternar dos veces; este tercer toggle deja el estado final correcto.
      toggleCell(cell);
      recentPointerTap = null;
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();

/* === v35.11c · estado final forzado de celda vacuna tras tap === */
(function(){
  if(window.__RESIDENCIAPP_V3511_VACCINE_FINAL__) return;
  window.__RESIDENCIAPP_V3511_VACCINE_FINAL__ = true;
  let start = null;
  function cellFrom(e){ return e?.target?.closest ? e.target.closest('#vaccineGameBoard .vaccine-cell') : null; }
  function finished(){ return !!document.querySelector('#vaccineGameBoard .vaccine-tap:disabled'); }
  function forceCell(cell, on){
    if(!cell || finished()) return;
    if(cell.classList.contains('vaccine-ok') || cell.classList.contains('vaccine-bad') || cell.classList.contains('vaccine-missed')) return;
    cell.classList.toggle('is-selected', !!on);
    const btn = cell.querySelector('.vaccine-tap');
    if(btn){ btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>'; }
    try{ if(typeof updateVaccineGameCounter === 'function') updateVaccineGameCounter(); }catch(_){ }
  }
  document.addEventListener('pointerdown', function(e){
    const cell = cellFrom(e); if(!cell) return;
    start = { key: cell.dataset.key || '', x: e.clientX, y: e.clientY, selected: cell.classList.contains('is-selected') };
  }, true);
  document.addEventListener('pointerup', function(e){
    const cell = cellFrom(e); if(!cell || !start) return;
    const dx = Math.abs(e.clientX - start.x), dy = Math.abs(e.clientY - start.y);
    if((cell.dataset.key || '') === start.key && dx <= 8 && dy <= 8){
      const desired = !start.selected;
      setTimeout(()=>forceCell(cell, desired), 0);
      setTimeout(()=>forceCell(cell, desired), 40);
    }
    start = null;
  }, true);
})();

/* === v35.11d · selección inmediata de vacunas por pointerdown === */
(function(){
  if(window.__RESIDENCIAPP_V3511_VACCINE_DOWN__) return;
  window.__RESIDENCIAPP_V3511_VACCINE_DOWN__ = true;
  function finished(){ return !!document.querySelector('#vaccineGameBoard .vaccine-tap:disabled'); }
  function toggle(cell){
    if(!cell || finished()) return;
    if(cell.classList.contains('vaccine-ok') || cell.classList.contains('vaccine-bad') || cell.classList.contains('vaccine-missed')) return;
    const on = !cell.classList.contains('is-selected');
    cell.classList.toggle('is-selected', on);
    const btn = cell.querySelector('.vaccine-tap');
    if(btn){ btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>'; }
    try{ if(typeof updateVaccineGameCounter === 'function') updateVaccineGameCounter(); }catch(_){ }
  }
  document.addEventListener('pointerdown', function(e){
    const cell = e.target?.closest?.('#vaccineGameBoard .vaccine-cell');
    if(!cell) return;
    toggle(cell);
    e.preventDefault();
    e.stopPropagation();
  }, true);
})();
