/* === ResidenciAPP v35.20 · estabilidad de clicks, vacunas y revancha ===
   Capa final no destructiva:
   - No toca banco, IDs, localStorage principal ni métricas históricas.
   - Reinstala el calendario de vacunas con una sola fuente de verdad de interacción.
   - Evita doble toggle por clicks sintéticos o listeners heredados.
   - Asegura que Revancha de errores quite las correctas y conserve las incorrectas.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3520__) return;
  window.__RESIDENCIAPP_V3520__ = true;

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const safe = (fn, fallback=null) => { try { return fn(); } catch(e){ console.warn('[v35.20]', e); return fallback; } };
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function saveAppState(){ safe(() => typeof saveState === 'function' && saveState()); }
  function questionById(id){ return safe(() => (Array.isArray(QUESTIONS) ? QUESTIONS.find(q => String(q.id) === String(id)) : null), null); }
  function isVaccineFinished(cell){
    const board = qs('#vaccineGameBoard');
    if(!board) return false;
    if(cell && (cell.classList.contains('vaccine-ok') || cell.classList.contains('vaccine-bad') || cell.classList.contains('vaccine-missed'))) return true;
    return !!qs('.vaccine-tap:disabled', board);
  }
  function updateVaccineCounterSafe(){ safe(() => typeof updateVaccineGameCounter === 'function' && updateVaccineGameCounter()); }
  function suppressLegacyVaccineClick(ms=360){
    window.__vaccineJustDragged = true;
    window.__v3519VaccineHandled = true;
    window.__v3520VaccineHandled = true;
    clearTimeout(window.__v3520VaccineSuppressTimer);
    window.__v3520VaccineSuppressTimer = setTimeout(() => {
      window.__vaccineJustDragged = false;
      window.__v3519VaccineHandled = false;
      window.__v3520VaccineHandled = false;
    }, ms);
  }
  function setVaccineCell(cell, force){
    if(!cell || isVaccineFinished(cell)) return;
    const on = typeof force === 'boolean' ? force : !cell.classList.contains('is-selected');
    cell.classList.toggle('is-selected', on);
    const btn = qs('.vaccine-tap', cell);
    if(btn){
      btn.type = 'button';
      btn.tabIndex = -1;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>';
    }
    updateVaccineCounterSafe();
  }
  function replaceVaccineBoard(board){
    if(!board || !board.parentNode) return board;
    const fresh = board.cloneNode(true);
    [
      'dragScrollBound', 'v351Enhanced', 'v352DragBound', 'v355Stable', 'v3519Hardened', 'v3520Stable'
    ].forEach(k => { try { delete fresh.dataset[k]; } catch(_){} });
    board.parentNode.replaceChild(fresh, board);
    return fresh;
  }
  function ensureVaccineFullscreenButton(){
    const panel = qs('#vaccineGamePanel');
    const controls = qs('#vaccineGameCounter')?.parentElement;
    if(!panel || !controls) return;
    let btn = qs('#vaccineFullscreenBtn');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'vaccineFullscreenBtn';
      btn.type = 'button';
      btn.className = 'rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800';
      const firstAction = controls.querySelector('button');
      controls.insertBefore(btn, firstAction || null);
    }
    btn.textContent = panel.classList.contains('vaccine-fullscreen-mode') ? '↙ Salir de pantalla completa' : '⛶ Pantalla completa';
    btn.onclick = function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      const active = panel.classList.toggle('vaccine-fullscreen-mode');
      document.body.classList.toggle('vaccine-fullscreen-active', active);
      btn.textContent = active ? '↙ Salir de pantalla completa' : '⛶ Pantalla completa';
      if(active) setTimeout(() => qs('#vaccineGameBoard')?.focus?.(), 30);
    };
  }
  function hardenVaccineBoard(){
    let board = qs('#vaccineGameBoard');
    if(!board || !qs('.vaccine-cell', board)) { ensureVaccineFullscreenButton(); return; }
    if(board.dataset.v3520Stable === '1') { ensureVaccineFullscreenButton(); return; }

    board = replaceVaccineBoard(board);
    board.dataset.v3520Stable = '1';
    // Marcas de compatibilidad para que capas anteriores no vuelvan a enganchar listeners sobre el tablero clonado.
    board.dataset.v3519Hardened = '1';
    board.dataset.v355Stable = '1';
    board.dataset.v352DragBound = '1';
    board.dataset.v351Enhanced = '1';
    board.dataset.dragScrollBound = '1';
    board.classList.add('vaccine-game-board','v3519-vaccine-board','v3520-vaccine-board','v355-vaccine-compact');
    board.setAttribute('tabindex','0');
    board.setAttribute('aria-label','Calendario nacional de vacunación desplazable');
    board.style.touchAction = 'none';

    qsa('.vaccine-cell', board).forEach(cell => {
      const btn = qs('.vaccine-tap', cell);
      if(btn){
        btn.type = 'button';
        btn.tabIndex = -1;
        btn.setAttribute('aria-pressed', cell.classList.contains('is-selected') ? 'true' : 'false');
      }
    });

    let down=false, moved=false, sx=0, sy=0, sl=0, st=0;
    const threshold = 8;
    board.addEventListener('pointerdown', ev => {
      if(isVaccineFinished()) return;
      down = true; moved = false;
      sx = ev.clientX; sy = ev.clientY; sl = board.scrollLeft; st = board.scrollTop;
      board.classList.add('is-dragging-ready');
      safe(() => board.setPointerCapture(ev.pointerId));
    }, {capture:true, passive:true});

    board.addEventListener('pointermove', ev => {
      if(!down || isVaccineFinished()) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if(Math.abs(dx) > threshold || Math.abs(dy) > threshold){
        moved = true;
        board.classList.add('is-dragging');
        board.scrollLeft = sl - dx;
        board.scrollTop = st - dy;
        suppressLegacyVaccineClick();
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }
    }, {capture:true, passive:false});

    function finishPointer(ev){
      if(!down) return;
      const wasMoved = moved;
      down = false; moved = false;
      board.classList.remove('is-dragging','is-dragging-ready');
      suppressLegacyVaccineClick();
      if(!wasMoved && !isVaccineFinished()){
        const cell = ev.target?.closest?.('.vaccine-cell');
        if(cell && board.contains(cell)) setVaccineCell(cell);
      }
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }
    board.addEventListener('pointerup', finishPointer, {capture:true, passive:false});
    board.addEventListener('pointercancel', ev => {
      down = false; moved = false; board.classList.remove('is-dragging','is-dragging-ready'); suppressLegacyVaccineClick();
      ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }, {capture:true, passive:false});

    board.addEventListener('click', ev => {
      // El marcado ya ocurrió en pointerup. Este bloqueo evita doble toggle de listeners heredados.
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }, {capture:true});

    board.addEventListener('wheel', ev => {
      if(Math.abs(ev.deltaY) >= Math.abs(ev.deltaX)){
        board.scrollLeft += ev.deltaY;
        ev.preventDefault();
      }
    }, {passive:false});

    ensureVaccineFullscreenButton();
    updateVaccineCounterSafe();
  }
  function scheduleVaccineHarden(delay=40){ setTimeout(hardenVaccineBoard, delay); }

  function patchVaccineRenderers(){
    if(typeof window.renderVaccineGame === 'function' && !window.__v3520RenderVaccinePatched){
      const base = window.renderVaccineGame;
      window.renderVaccineGame = function(){
        const out = base.apply(this, arguments);
        scheduleVaccineHarden(20);
        scheduleVaccineHarden(160);
        return out;
      };
      window.__v3520RenderVaccinePatched = true;
    }
    if(typeof window.openMemoryGame === 'function' && !window.__v3520OpenGamePatched){
      const baseOpen = window.openMemoryGame;
      window.openMemoryGame = function(name){
        const out = baseOpen.apply(this, arguments);
        if(name === 'vaccine') scheduleVaccineHarden(80);
        return out;
      };
      window.__v3520OpenGamePatched = true;
    }
    if(typeof window.showView === 'function' && !window.__v3520ShowViewPatched){
      const baseShow = window.showView;
      window.showView = function(name){
        const out = baseShow.apply(this, arguments);
        if(name === 'games') scheduleVaccineHarden(100);
        return out;
      };
      window.__v3520ShowViewPatched = true;
    }
  }

  function patchRevengeFinish(){
    if(typeof window.finishSession !== 'function' || window.__v3520FinishPatched) return;
    const baseFinish = window.finishSession;
    window.finishSession = function(reason='manual'){
      const old = window.session || (typeof session !== 'undefined' ? session : null);
      if(old && old.mode === 'revenge'){
        safe(() => {
          state.mistakes ||= {};
          const ids = Array.isArray(old.questions) ? old.questions.slice() : [];
          ids.forEach(id => {
            const q = questionById(id);
            if(!q) return;
            const selected = old.selected?.[q.id] || '';
            if(!selected) return; // Si no respondió, queda como error activo.
            if(selected === q.ans){
              delete state.mistakes[q.id];
              if(state.scheduled) delete state.scheduled[q.id];
              if(state.retention) delete state.retention[q.id];
            } else {
              state.mistakes[q.id] = Object.assign(state.mistakes[q.id] || {}, {
                id: q.id,
                selected,
                correct: q.ans,
                at: Date.now(),
                eje: q.eje,
                tema: q.tema,
                sprint: q.sprint,
                revengeFailedAt: Date.now()
              });
            }
          });
        });
      }
      const out = baseFinish.apply(this, arguments);
      if(old && old.mode === 'revenge'){
        saveAppState();
        safe(() => typeof renderReview === 'function' && renderReview());
        safe(() => typeof renderStats === 'function' && renderStats());
      }
      return out;
    };
    window.__v3520FinishPatched = true;
  }

  function removeLegacyWords(root=document){
    safe(() => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n => {
        const t = n.nodeValue;
        const r = t
          .replace(/falladas/gi, m => m[0] === 'F' ? 'Incorrectas' : 'incorrectas')
          .replace(/fallada/gi, m => m[0] === 'F' ? 'Incorrecta' : 'incorrecta')
          .replace(/fallaste/gi, m => m[0] === 'F' ? 'Te equivocaste' : 'te equivocaste');
        if(r !== t) n.nodeValue = r;
      });
    });
  }
  let cleanupTimer = null;
  function queueLegacyCleanup(root=document, delay=100){
    clearTimeout(cleanupTimer);
    cleanupTimer = setTimeout(() => removeLegacyWords(root), delay);
  }

  function boot(){
    patchVaccineRenderers();
    patchRevengeFinish();
    queueLegacyCleanup(document.body || document, 60);
    scheduleVaccineHarden(120);
    scheduleVaccineHarden(700);
  }

  const mo = new MutationObserver(() => {
    patchVaccineRenderers();
    patchRevengeFinish();
    queueLegacyCleanup(document.body || document, 160);
    const b = qs('#vaccineGameBoard');
    if(b && qs('.vaccine-cell', b) && b.dataset.v3520Stable !== '1') scheduleVaccineHarden(40);
  });

  document.addEventListener('keydown', ev => {
    if(ev.key === 'Escape'){
      const panel = qs('#vaccineGamePanel.vaccine-fullscreen-mode');
      if(panel){
        panel.classList.remove('vaccine-fullscreen-mode');
        document.body.classList.remove('vaccine-fullscreen-active');
        const btn = qs('#vaccineFullscreenBtn');
        if(btn) btn.textContent = '⛶ Pantalla completa';
      }
    }
  }, true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot(); safe(() => mo.observe(document.body, {childList:true, subtree:true})); });
  else { boot(); safe(() => mo.observe(document.body, {childList:true, subtree:true})); }
  setTimeout(boot, 1200);
})();
