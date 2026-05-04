/* === ResidenciAPP v35.1 · ajustes de corrección, revancha y vacunas === */
(function(){
  'use strict';

  function safe(fn){ try{ fn(); }catch(err){ console.warn('[v35.1]', err); } }

  // 1) Corrección final: mostrar solo preguntas respondidas. También aplica a sprints/práctica.
  safe(function(){
    if(typeof finishSession !== 'function' || window.__residenciappV351FinishPatched) return;
    window.__residenciappV351FinishPatched = true;
    finishSession = function(reason='manual'){
      stopExamTimer?.();
      if(!session){ showView('dashboard'); return; }
      const qs = getSessionQuestions();
      const old = session;
      const answeredQs = qs.filter(q => !!selectedForScoring(q, old));
      const correctQs = answeredQs.filter(q => selectedForScoring(q, old) === q.ans);
      const incorrectQs = answeredQs.filter(q => q.ans && selectedForScoring(q, old) !== q.ans);
      const answered = answeredQs.length;
      const correct = correctQs.length;
      const acc = answered ? Math.round(correct / answered * 100) : 0;
      const wasExam = old.mode === 'exam';
      const wasRevenge = old.mode === 'revenge';
      const headline = reason === 'time' ? 'Tiempo finalizado' : wasRevenge ? 'Revancha finalizada' : 'Sesión finalizada';

      state.session = null;
      saveState();
      session = null;

      const cardClass = q => {
        const s = selectedForScoring(q, old);
        const ok = s && s === q.ans;
        return ok
          ? 'border-emerald-500 bg-emerald-100 ring-2 ring-emerald-200 dark:border-emerald-400 dark:bg-emerald-950/55'
          : 'border-rose-500 bg-rose-100 ring-2 ring-rose-200 dark:border-rose-400 dark:bg-rose-950/55';
      };
      const correction = answeredQs.length
        ? '<div class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Corrección final · solo respondidas</p><div class="mt-4 grid gap-3">'+answeredQs.map(q=>{
            const s = selectedForScoring(q, old);
            const ok = s && s === q.ans;
            return '<div class="rounded-2xl border '+cardClass(q)+' p-4"><div class="mb-2 flex flex-wrap items-center gap-2"><span class="rounded-full '+(ok?'bg-emerald-600 text-white':'bg-rose-600 text-white')+' px-3 py-1 text-[11px] font-black uppercase tracking-[.12em]">'+(ok?'Correcta':'Incorrecta')+'</span><span class="text-[11px] font-black uppercase tracking-[.12em] text-slate-500">'+esc(q.eje||'')+'</span></div><p class="text-sm font-black leading-6">'+esc(q.q)+'</p><p class="mt-2 text-xs font-bold">Tu respuesta: '+(s?esc(s.toUpperCase()+') '+(q.opts?.[s]||'')):'Sin responder')+'</p><p class="text-xs font-bold">Correcta: '+(q.ans?esc(q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'')):'Sin clave')+'</p></div>';
          }).join('')+'</div></div>'
        : '<div class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 text-sm font-bold text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">No hay preguntas respondidas para corregir.</div>';

      const flashcards = (!wasRevenge && incorrectQs.length)
        ? '<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">'+incorrectQs.slice(0,24).map(q => flashcardMini(q)).join('')+'</div>'
        : '';

      $('#resultsContent').innerHTML = '<div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">'+headline+'</p><h3 class="mt-1 font-display text-4xl font-extrabold">'+acc+'% de precisión</h3><p class="mt-2 text-slate-600 dark:text-slate-400">'+correct+' correctas sobre '+answered+' respondidas · '+incorrectQs.length+' incorrectas.</p>'+(wasRevenge?'<p class="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-300">Las preguntas acertadas fueron eliminadas de errores activos. Las incorrectas quedan para nuevo repaso.</p>':'')+'<div class="mt-6 flex flex-wrap gap-3"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white" onclick="showView(\'dashboard\')">Volver al panel</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesRevengeSession()">Revancha de errores</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesSession()">Repaso guiado</button></div></div>' + flashcards + correction;
      showView('results');
      if(old?.method === 'repaso'){ renderReview?.(); renderDueTodayHero?.(); renderV34Dashboard?.(); }
    };
  });

  // 2) Revancha: ocultar semáforo y no mostrar palabras de feedback durante la pregunta.
  safe(function(){
    if(typeof renderPerformancePanel === 'function' && !window.__residenciappV351PerfPatched){
      const baseRenderPerformancePanel = renderPerformancePanel;
      renderPerformancePanel = function(){
        const panel = document.querySelector('#performancePanel');
        if(typeof session !== 'undefined' && session?.mode === 'revenge'){
          if(panel){ panel.innerHTML = ''; panel.classList.add('hidden'); }
          return;
        }
        if(panel) panel.classList.remove('hidden');
        return baseRenderPerformancePanel();
      };
      window.__residenciappV351PerfPatched = true;
    }
  });

  // 3) Vacunas: quitar fila desde 11 años y usar marcado/desmarcado robusto con toque.
  safe(function(){
    if(typeof VACCINE_ROWS !== 'undefined'){
      for(let i=VACCINE_ROWS.length-1;i>=0;i--){ if(VACCINE_ROWS[i]?.[0] === '11plus') VACCINE_ROWS.splice(i,1); }
    }
    if(typeof VACCINE_ANSWERS !== 'undefined') delete VACCINE_ANSWERS['11plus|triviral'];
  });

  function enhanceVaccineBoard(){
    const board = document.querySelector('#vaccineGameBoard');
    if(!board || board.dataset.v351Enhanced === '1') return;
    board.dataset.v351Enhanced = '1';
    let sx=0, sy=0, sl=0, st=0, moved=false, down=false;
    board.addEventListener('pointerdown', e => {
      down = true; moved = false; sx=e.clientX; sy=e.clientY; sl=board.scrollLeft; st=board.scrollTop;
    }, {passive:true});
    board.addEventListener('pointermove', e => {
      if(!down) return;
      const dx=e.clientX-sx, dy=e.clientY-sy;
      if(Math.abs(dx)>7 || Math.abs(dy)>7){
        moved = true;
        board.scrollLeft = sl - dx;
        board.scrollTop = st - dy;
        board.classList.add('is-dragging');
        e.preventDefault();
      }
    }, {passive:false});
    const end = e => {
      const target = e.target?.closest?.('.vaccine-cell');
      const disabled = target?.querySelector?.('.vaccine-tap')?.disabled;
      if(target && !moved && !disabled){
        target.classList.toggle('is-selected');
        const on = target.classList.contains('is-selected');
        const btn = target.querySelector('.vaccine-tap');
        if(btn){ btn.setAttribute('aria-pressed', on?'true':'false'); btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>'; }
        if(typeof updateVaccineGameCounter === 'function') updateVaccineGameCounter();
        window.__vaccineJustDragged = true;
        setTimeout(()=>{ window.__vaccineJustDragged=false; }, 160);
      }
      down=false; moved=false; board.classList.remove('is-dragging');
    };
    board.addEventListener('pointerup', end, {passive:false});
    board.addEventListener('pointercancel', () => { down=false; moved=false; board.classList.remove('is-dragging'); });
    board.addEventListener('wheel', e => {
      if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
        board.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, {passive:false});
  }

  safe(function(){
    if(typeof renderVaccineGame === 'function' && !window.__residenciappV351VaccinePatched){
      const baseRenderVaccineGame = renderVaccineGame;
      renderVaccineGame = function(){
        if(typeof VACCINE_ROWS !== 'undefined'){
          for(let i=VACCINE_ROWS.length-1;i>=0;i--){ if(VACCINE_ROWS[i]?.[0] === '11plus') VACCINE_ROWS.splice(i,1); }
        }
        if(typeof VACCINE_ANSWERS !== 'undefined') delete VACCINE_ANSWERS['11plus|triviral'];
        baseRenderVaccineGame();
        setTimeout(enhanceVaccineBoard, 0);
      };
      window.__residenciappV351VaccinePatched = true;
    }
  });

  // 4) Juegos: mover instrucciones fuera de la izquierda y ganar espacio para el cuadro.
  function polishGamesLayout(){
    const panel = document.querySelector('#vaccineGamePanel');
    if(!panel) return;
    panel.classList.remove('xl:grid-cols-[.72fr_1.28fr]');
    panel.classList.add('v351-vaccine-full');
    const aside = panel.querySelector('aside');
    if(aside) aside.classList.add('hidden');
    const board = document.querySelector('#vaccineGameBoard');
    if(board) enhanceVaccineBoard();
  }
  const runPolishSoon = () => setTimeout(polishGamesLayout, 50);
  safe(function(){
    const oldOpenMemoryGame = window.openMemoryGame;
    if(typeof oldOpenMemoryGame === 'function' && !window.__residenciappV351GamesPatched){
      window.openMemoryGame = function(name){ const r = oldOpenMemoryGame(name); runPolishSoon(); return r; };
      const oldShowView = window.showView;
      if(typeof oldShowView === 'function'){
        window.showView = function(name){ const r = oldShowView(name); if(name==='games') runPolishSoon(); return r; };
      }
      window.__residenciappV351GamesPatched = true;
    }
  });

  // 5) Limpieza visual de términos antiguos que hayan quedado en renderizados estáticos.
  document.addEventListener('DOMContentLoaded', () => { runPolishSoon(); });
  setTimeout(runPolishSoon, 400);
})();
