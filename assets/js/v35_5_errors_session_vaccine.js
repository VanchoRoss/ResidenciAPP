/* === ResidenciAPP v35.5 · errores, sesiones y calendario estable ===
   Capa no destructiva: no toca banco, IDs ni datos guardados salvo al finalizar revancha.
*/
(function(){
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function qById(id){ try { return QUESTIONS.find(q => q.id === id); } catch(_) { return null; } }
  function mistakeList(){ return Object.keys(state?.mistakes || {}).map(qById).filter(Boolean); }
  function save(){ try { saveState(); } catch(_){} }

  function cleanOldWords(root=document){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const t=n.nodeValue;
      const r=t.replace(/fallada/gi, m => m[0] === 'F' ? 'Incorrecta' : 'incorrecta')
               .replace(/fallaste/gi, m => m[0] === 'F' ? 'Te equivocaste' : 'te equivocaste');
      if(r!==t) n.nodeValue=r;
    });
  }

  // Panel de rendimiento: solo debe verse en el panel principal, no dentro de sesiones.
  try {
    renderPerformancePanel = function(){
      const panel = $('#performancePanel');
      if(panel){ panel.innerHTML=''; panel.classList.add('hidden'); }
    };
  } catch(_) {}

  // Accesos rápidos: quitar simulacro global del panel principal.
  function removeDashboardSimulationButtons(){
    $$('#dashboardView button[onclick*="startGlobalSimulation"]').forEach(b => b.remove());
  }
  try {
    if(typeof renderV34QuickActions === 'function'){
      renderV34QuickActions = function(){
        const box = $('#v34QuickActions'); if(!box) return;
        const due = typeof dueQuestions === 'function' ? dueQuestions().length : 0;
        const mistakes = Object.keys(state?.mistakes || {}).length;
        const actions = [
          ['🧠','Sesión activa','Retomá o empezá un bloque.','resumeOrStart()'],
          ['🔁','Repaso inteligente', due+' vencidas para hoy.','showView(\'review\')'],
          ['🎮','Juegos','Calendario y desafío por link.','showView(\'games\')'],
          ['📄','Reporte PDF','Descargá tus métricas con fecha.','downloadProgressPDF()'],
          ['🧾','Errores activos', mistakes+' para trabajar.','showView(\'review\')']
        ];
        box.innerHTML = actions.map(a=>'<button class="v34-action-btn rounded-[1.35rem] border border-slate-200 p-4 text-left dark:border-slate-800" onclick="'+a[3]+'"><div class="text-2xl">'+a[0]+'</div><h4 class="mt-2 font-display text-lg font-extrabold">'+a[1]+'</h4><p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+a[2]+'</p></button>').join('');
      };
    }
  } catch(_) {}

  // Temario 2026: ejes cerrados por defecto.
  try {
    if(typeof renderTemario === 'function'){
      renderTemario = function(){
        const tree = $('#temarioTree'); if(!tree) return;
        const byEje = groupBy(SPRINTS, s=>s.eje);
        tree.innerHTML = Object.entries(byEje).map(([eje,sps])=>{
          const byTema=groupBy(sps,s=>s.tema);
          return '<details class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><summary class="cursor-pointer font-display text-2xl font-extrabold">'+E(eje)+' <span class="text-sm font-bold text-slate-400">('+sps.reduce((a,s)=>a+s.total,0)+' preguntas)</span></summary><div class="mt-4 grid gap-3">'+Object.entries(byTema).map(([tema,list])=>'<div class="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/60"><h4 class="font-display text-lg font-extrabold">'+E(tema)+' <span class="text-xs font-bold text-slate-400">('+list.reduce((a,s)=>a+s.total,0)+')</span></h4><div class="mt-3 flex flex-wrap gap-2">'+list.map(sp=>'<button class="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm hover:bg-medical-50 dark:bg-slate-900 dark:hover:bg-medical-950/40" onclick="startSprint(\''+sp.id+'\', state.method||\'preguntas\')">'+E(sp.sprint)+' · '+sp.total+'</button>').join('')+'</div></div>').join('')+'</div></details>';
        }).join('');
      };
    }
  } catch(_) {}

  // Revancha: no modifica errores ni muestra corrección hasta terminar.
  try {
    startMistakesRevengeSession = function(){
      const qs = mistakeList();
      if(!qs.length) return alert('No tenés errores activos para revancha.');
      setSession(qs, 'Revancha de errores', 'Sin feedback · corrección final', 'preguntas', true, {mode:'revenge'});
    };
    startMistakesFreeSession = function(){
      const qs = mistakeList();
      if(!qs.length) return alert('No tenés errores activos para repaso libre.');
      setSession(qs, 'Repaso libre de errores', 'Con feedback inmediato · todos los errores activos', 'preguntas', false, {mode:'practice'});
    };
    startSingleMistakeSession = function(id){
      const q = qById(id); if(!q) return alert('No encontré esa pregunta.');
      setSession([q], 'Repaso libre de error', (q.tema||'')+' · '+(q.sprint||''), 'preguntas', false, {mode:'practice'});
    };
    // Mantener compatibilidad con botones viejos.
    startMistakesSession = startMistakesFreeSession;
  } catch(_) {}

  try {
    revengeQuestionTemplate = function(q, selected){
      const year = q.year ? 'Año '+q.year : 'Año no detectado';
      const options = ['a','b','c','d'].map(k => {
        const txt = q.opts?.[k]; if(!txt) return '';
        const isSel = selected===k;
        const cls = isSel ? 'border-medical-500 bg-medical-50 ring-2 ring-medical-200 dark:border-medical-400 dark:bg-medical-950/35' : 'border-slate-200 hover:border-medical-300 dark:border-slate-700 dark:hover:border-medical-700';
        return '<label class="choice block '+(selected?'cursor-default':'cursor-pointer')+'"><input class="sr-only" name="choice" type="radio" value="'+k+'" '+(isSel?'checked':'')+' '+(selected?'disabled':'')+' onchange="selectAnswer(\''+q.id+'\',\''+k+'\')"><div class="rounded-3xl border '+cls+' p-4 transition"><div class="flex gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-black uppercase dark:bg-slate-800">'+k+'</span><p class="text-sm font-semibold leading-6">'+E(txt)+'</p></div></div></label>';
      }).join('');
      return '<div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div class="flex flex-wrap gap-2"><span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Revancha</span><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">'+E(q.eje||'')+'</span><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+E(year)+'</span></div><span class="text-xs font-black uppercase tracking-[.16em] text-rose-500">sin feedback</span></div>'+
        '<h3 class="font-display text-2xl font-extrabold leading-tight sm:text-3xl">'+(typeof highlightTriggerWords === 'function' ? highlightTriggerWords(q.q) : E(q.q))+'</h3>'+
        '<div class="mt-5 grid gap-3">'+options+'</div>'+
        (selected ? '<div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Respuesta registrada. La corrección aparece recién cuando terminás todas las revanchas.</div>' : '<div class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">Respondé sin mirar la corrección. Al finalizar vas a ver cuáles quedaron correctas e incorrectas.</div>')+
        '<div class="mt-6 flex flex-wrap justify-between gap-3"><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" '+(session.idx===0?'disabled':'')+' onclick="prevQuestion()">← Anterior</button><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white hover:bg-medical-700" onclick="nextQuestion()">'+(session.idx===getSessionQuestions().length-1?'Terminar':'Siguiente →')+'</button></div>';
    };
  } catch(_) {}

  try {
    const baseSelectAnswer = selectAnswer;
    selectAnswer = function(id, selected){
      if(session?.mode === 'revenge'){
        const q = qById(id); if(!q || !session) return;
        session.selected ||= {};
        session.selected[id] = selected;
        state.session = session;
        save();
        renderQuestion();
        return;
      }
      return baseSelectAnswer(id, selected);
    };
  } catch(_) {}

  // Corrección final: siempre solo respondidas. En revancha, recién acá se limpian errores acertados.
  try {
    finishSession = function(reason='manual'){
      try{ stopExamTimer?.(); }catch(_){ }
      if(!session){ showView('dashboard'); return; }
      const qs = getSessionQuestions();
      const old = session;
      const pick = q => selectedForScoring(q, old);
      const answeredQs = qs.filter(q => !!pick(q));
      const correctQs = answeredQs.filter(q => pick(q) === q.ans);
      const incorrectQs = answeredQs.filter(q => q.ans && pick(q) !== q.ans);
      const answered = answeredQs.length;
      const correct = correctQs.length;
      const acc = answered ? Math.round(correct / answered * 100) : 0;
      const wasRevenge = old.mode === 'revenge';
      const headline = reason === 'time' ? 'Tiempo finalizado' : wasRevenge ? 'Revancha finalizada' : 'Sesión finalizada';

      if(wasRevenge){
        answeredQs.forEach(q => {
          const s = pick(q);
          if(s === q.ans){
            if(state.mistakes) delete state.mistakes[q.id];
            if(state.scheduled) delete state.scheduled[q.id];
            if(state.retention) delete state.retention[q.id];
          } else {
            state.mistakes[q.id] = Object.assign(state.mistakes[q.id]||{}, {id:q.id, selected:s, correct:q.ans, at:Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint, revengeFailedAt:Date.now()});
          }
        });
      }

      state.session = null;
      session = null;
      save();

      const correction = answeredQs.length
        ? '<div class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Corrección final · solo respondidas</p><div class="mt-4 grid gap-3">'+answeredQs.map(q=>{
            const s = pick(q); const ok = s && s===q.ans;
            const cls = ok ? 'border-emerald-600 bg-emerald-100 ring-2 ring-emerald-300 dark:border-emerald-400 dark:bg-emerald-950/60' : 'border-rose-600 bg-rose-100 ring-2 ring-rose-300 dark:border-rose-400 dark:bg-rose-950/60';
            return '<div class="rounded-2xl border '+cls+' p-4"><div class="mb-2 flex flex-wrap items-center gap-2"><span class="rounded-full '+(ok?'bg-emerald-700':'bg-rose-700')+' px-3 py-1 text-[11px] font-black uppercase tracking-[.12em] text-white">'+(ok?'Correcta':'Incorrecta')+'</span><span class="text-[11px] font-black uppercase tracking-[.12em] text-slate-500">'+E(q.eje||'')+'</span></div><p class="text-sm font-black leading-6">'+E(q.q)+'</p><p class="mt-2 text-xs font-bold">Tu respuesta: '+E(s.toUpperCase()+') '+(q.opts?.[s]||''))+'</p><p class="text-xs font-bold">Correcta: '+(q.ans?E(q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'')):'Sin clave')+'</p></div>';
          }).join('')+'</div></div>'
        : '<div class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No hay preguntas respondidas para corregir.</div>';
      const flashcards = (!wasRevenge && incorrectQs.length && typeof flashcardMini === 'function') ? '<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">'+incorrectQs.slice(0,24).map(q => flashcardMini(q)).join('')+'</div>' : '';
      const msg = wasRevenge ? '<p class="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-300">Las correctas fueron eliminadas de errores activos. Las incorrectas quedan para nueva práctica.</p>' : '';
      $('#resultsContent').innerHTML = '<div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">'+headline+'</p><h3 class="mt-1 font-display text-4xl font-extrabold">'+acc+'% de precisión</h3><p class="mt-2 text-slate-600 dark:text-slate-400">'+correct+' correctas sobre '+answered+' respondidas · '+incorrectQs.length+' incorrectas.</p>'+msg+'<div class="mt-6 flex flex-wrap gap-3"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white" onclick="showView(\'dashboard\')">Volver al panel</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesRevengeSession()">Revancha de errores</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="showView(\'review\')">Ver errores</button></div></div>'+flashcards+correction;
      showView('results');
      try{ renderReview(); renderDueTodayHero?.(); renderV34Dashboard?.(); }catch(_){ }
      setTimeout(()=>cleanOldWords(document.body), 60);
    };
  } catch(_) {}

  // Sesión: pregunta y opciones arriba; lo demás debajo.
  try {
    const baseRenderQuestion = renderQuestion;
    renderQuestion = function(){
      const r = baseRenderQuestion.apply(this, arguments);
      const panel = $('#performancePanel'); if(panel){ panel.innerHTML=''; panel.classList.add('hidden'); }
      cleanOldWords($('#sessionView') || document);
      return r;
    };
  } catch(_) {}

  // Repaso inteligente: dos caminos claros para errores.
  try {
    renderReview = function(){
      const mistakes = mistakeList();
      const due = typeof dueQuestions === 'function' ? dueQuestions() : [];
      const fav = Object.keys(state?.favorites||{}).map(qById).filter(Boolean);
      const mistakeRows = mistakes.length ? mistakes.map(q=>{
        const m = state.mistakes?.[q.id] || {};
        return '<article class="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><p class="text-[11px] font-black uppercase tracking-[.14em] text-rose-600 dark:text-rose-300">'+E(q.eje||'')+' · '+E(q.tema||'')+'</p><p class="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">'+E((q.q||'').slice(0,180))+(q.q&&q.q.length>180?'…':'')+'</p>'+(m.errorLabel?'<p class="mt-1 text-[11px] font-bold text-slate-500">Motivo: '+E(m.errorLabel)+'</p>':'')+'</div><button class="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="startSingleMistakeSession(\''+q.id+'\')">Trabajar esta</button></div></article>';
      }).join('') : '<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200">No hay errores activos.</div>';
      const errorsPanel = '<section class="lg:col-span-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p class="text-2xl">🧾</p><h4 class="mt-1 font-display text-2xl font-extrabold">Errores activos</h4><p class="mt-1 text-sm font-bold text-slate-500">'+mistakes.length+' preguntas para trabajar</p><p class="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">Elegí revancha sin feedback hasta el final o repaso libre con corrección inmediata.</p></div><div class="flex flex-wrap gap-2"><button class="rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black text-white hover:bg-rose-700" onclick="startMistakesRevengeSession()">Revancha de errores</button><button class="rounded-2xl bg-medical-600 px-4 py-3 text-xs font-black text-white hover:bg-medical-700" onclick="startMistakesFreeSession()">Trabajar todos con feedback</button></div></div><div class="mt-5 grid gap-2">'+mistakeRows+'</div></section>';
      const smallPanel = (title, icon, qs, buttons, note='') => '<section class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div><p class="text-2xl">'+icon+'</p><h4 class="mt-1 font-display text-xl font-extrabold">'+title+'</h4><p class="text-sm font-bold text-slate-500">'+qs.length+' preguntas</p>'+(note?'<p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+note+'</p>':'')+'</div><div class="mt-4 flex flex-wrap gap-2">'+buttons+'</div><div class="mt-4 space-y-2">'+qs.slice(0,5).map(q=>'<div class="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 dark:bg-slate-950/60">'+E((q.q||'').slice(0,130))+(q.q&&q.q.length>130?'…':'')+'</div>').join('')+'</div></section>';
      const duePanel = due.length ? smallPanel('Repasos vencidos','🔁',due,'<button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startDueSession()">Iniciar</button>','Correcta: sale del repaso automático. Incorrecta: vuelve mañana.') : '<section class="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft dark:border-emerald-900/60 dark:bg-emerald-950/20"><p class="text-2xl">🔁</p><h4 class="mt-1 font-display text-xl font-extrabold">Repaso espaciado al día</h4><p class="mt-1 text-sm font-semibold leading-6 text-emerald-800 dark:text-emerald-200">No hay preguntas vencidas para hoy.</p></section>';
      $('#reviewPanels').className = 'grid gap-5 lg:grid-cols-3';
      $('#reviewPanels').innerHTML = errorsPanel + duePanel + smallPanel('Favoritas','⭐',fav,'<button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startFavoritesSession()">Iniciar</button>');
      try{ renderAdvancedFlashcards?.(); }catch(_){ }
      cleanOldWords($('#reviewView')||document);
    };
  } catch(_) {}

  // Calendario: marcado/desmarcado confiable con una sola capa de eventos y celdas livianas.
  function toggleVaccineCell(cell, force){
    if(!cell || cell.classList.contains('vaccine-ok') || cell.classList.contains('vaccine-bad') || cell.classList.contains('vaccine-missed')) return;
    const on = typeof force === 'boolean' ? force : !cell.classList.contains('is-selected');
    cell.classList.toggle('is-selected', on);
    const btn = $('.vaccine-tap', cell);
    if(btn){ btn.setAttribute('aria-pressed', on?'true':'false'); btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>'; }
    try{ updateVaccineGameCounter?.(); }catch(_){ }
  }
  function installVaccineStableTouch(){
    const board = $('#vaccineGameBoard'); if(!board || board.dataset.v355Stable === '1') return;
    board.dataset.v355Stable = '1';
    board.style.touchAction = 'none';
    let down=false, moved=false, sx=0, sy=0, sl=0, st=0;
    board.addEventListener('pointerdown', e => {
      down=true; moved=false; sx=e.clientX; sy=e.clientY; sl=board.scrollLeft; st=board.scrollTop;
      try{ board.setPointerCapture(e.pointerId); }catch(_){}
      e.stopImmediatePropagation();
    }, true);
    board.addEventListener('pointermove', e => {
      if(!down) return;
      const dx=e.clientX-sx, dy=e.clientY-sy;
      if(Math.abs(dx)>5 || Math.abs(dy)>5){
        moved=true;
        board.scrollLeft = sl - dx;
        board.scrollTop = st - dy;
        board.classList.add('is-dragging');
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    board.addEventListener('pointerup', e => {
      const cell = e.target.closest && e.target.closest('.vaccine-cell');
      if(cell && !moved) toggleVaccineCell(cell);
      down=false; moved=false; board.classList.remove('is-dragging');
      e.preventDefault(); e.stopImmediatePropagation();
    }, true);
    board.addEventListener('pointercancel', e => { down=false; moved=false; board.classList.remove('is-dragging'); e.stopImmediatePropagation(); }, true);
  }
  try {
    if(typeof VACCINE_ROWS !== 'undefined'){
      for(let i=VACCINE_ROWS.length-1;i>=0;i--){
        const r=VACCINE_ROWS[i];
        if(r?.[0] === '11plus' || /desde los 11/i.test(String(r?.[1]||''))) VACCINE_ROWS.splice(i,1);
      }
    }
    if(typeof renderVaccineGame === 'function'){
      const baseVaccine = renderVaccineGame;
      renderVaccineGame = function(){
        const r = baseVaccine.apply(this, arguments);
        setTimeout(()=>{
          installVaccineStableTouch();
          const board = $('#vaccineGameBoard');
          if(board) board.classList.add('v355-vaccine-compact');
        }, 0);
        return r;
      };
    }
  } catch(_) {}

  // showView final: limpieza de UI y reaplicar patches visuales.
  try {
    const baseShow = showView;
    showView = function(name){
      const r = baseShow.apply(this, arguments);
      if(name === 'dashboard') setTimeout(removeDashboardSimulationButtons, 30);
      if(name === 'temario') setTimeout(()=>{ try{ renderTemario(); }catch(_){} }, 30);
      if(name === 'games') setTimeout(installVaccineStableTouch, 80);
      setTimeout(()=>cleanOldWords(document.body), 80);
      return r;
    };
  } catch(_) {}

  document.addEventListener('DOMContentLoaded', () => {
    removeDashboardSimulationButtons(); cleanOldWords(document.body); setTimeout(installVaccineStableTouch, 400);
  });
  setTimeout(() => { removeDashboardSimulationButtons(); cleanOldWords(document.body); installVaccineStableTouch(); }, 900);
})();
