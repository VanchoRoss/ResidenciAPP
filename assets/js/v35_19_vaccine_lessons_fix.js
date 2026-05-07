/* === ResidenciAPP v35.19 · Nodos nuevos + fix definitivo calendario vacunas ===
   - No toca banco, IDs, métricas ni progreso.
   - Reinstala el tablero de vacunas con una sola capa de interacción: tap = marcar/desmarcar, arrastre = scroll.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3519__) return;
  window.__RESIDENCIAPP_V3519__ = true;

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function isFinished(cell){
    const board = qs('#vaccineGameBoard');
    if(!board) return false;
    if(cell && (cell.classList.contains('vaccine-ok') || cell.classList.contains('vaccine-bad') || cell.classList.contains('vaccine-missed'))) return true;
    return !!qs('.vaccine-tap:disabled', board);
  }

  function setSelected(cell, force){
    if(!cell || isFinished(cell)) return;
    const on = typeof force === 'boolean' ? force : !cell.classList.contains('is-selected');
    cell.classList.toggle('is-selected', on);
    const btn = qs('.vaccine-tap', cell);
    if(btn){
      btn.type = 'button';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>';
    }
    try{ if(typeof updateVaccineGameCounter === 'function') updateVaccineGameCounter(); }catch(_){}
  }

  function replaceBoardElement(board){
    if(!board || !board.parentNode) return board;
    // Clonar remueve los event listeners viejos que venían de capas previas.
    const fresh = board.cloneNode(true);
    fresh.removeAttribute('data-drag-scroll-bound');
    fresh.removeAttribute('data-v352-drag-bound');
    fresh.removeAttribute('data-v355-stable');
    fresh.removeAttribute('data-v3519-hardened');
    board.parentNode.replaceChild(fresh, board);
    return fresh;
  }

  function hardenVaccineBoard(){
    let board = qs('#vaccineGameBoard');
    if(!board || !qs('.vaccine-cell', board)) return;
    if(board.dataset.v3519Hardened === '1') return;
    board = replaceBoardElement(board);
    board.dataset.v3519Hardened = '1';
    board.classList.add('v3519-vaccine-board','v355-vaccine-compact','vaccine-game-board');
    board.setAttribute('tabindex','0');
    board.setAttribute('aria-label','Calendario de vacunación desplazable');
    board.style.touchAction = 'none';

    qsa('.vaccine-cell', board).forEach(cell => {
      const btn = qs('.vaccine-tap', cell);
      if(btn){
        btn.type = 'button';
        btn.tabIndex = -1;
        btn.setAttribute('aria-pressed', cell.classList.contains('is-selected') ? 'true' : 'false');
        if(cell.classList.contains('is-selected')) btn.innerHTML = '<span class="vaccine-mark">✓</span>';
      }
    });

    let down=false, moved=false, sx=0, sy=0, sl=0, st=0;
    const markClickSuppressed = () => {
      window.__vaccineJustDragged = true;
      window.__v3519VaccineHandled = true;
      setTimeout(()=>{ window.__vaccineJustDragged = false; window.__v3519VaccineHandled = false; }, 280);
    };

    board.addEventListener('pointerdown', e => {
      if(isFinished()) return;
      down = true; moved = false; sx = e.clientX; sy = e.clientY; sl = board.scrollLeft; st = board.scrollTop;
      board.classList.add('is-dragging-ready');
      try{ board.setPointerCapture(e.pointerId); }catch(_){}
    }, {passive:true});

    board.addEventListener('pointermove', e => {
      if(!down || isFinished()) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if(Math.abs(dx) > 7 || Math.abs(dy) > 7){
        moved = true;
        board.classList.add('is-dragging');
        board.scrollLeft = sl - dx;
        board.scrollTop = st - dy;
        e.preventDefault();
      }
    }, {passive:false});

    function finishPointer(e){
      if(!down) return;
      const wasMoved = moved;
      down = false; moved = false; board.classList.remove('is-dragging','is-dragging-ready');
      markClickSuppressed();
      if(!wasMoved && !isFinished()){
        const cell = e.target && e.target.closest ? e.target.closest('.vaccine-cell') : null;
        if(cell && board.contains(cell)) setSelected(cell);
      }
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    board.addEventListener('pointerup', finishPointer, {capture:true, passive:false});
    board.addEventListener('pointercancel', e => { down=false; moved=false; board.classList.remove('is-dragging','is-dragging-ready'); markClickSuppressed(); }, {capture:true});

    // Bloquea el click sintético posterior al pointerup para que los listeners viejos del documento no hagan doble toggle.
    board.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    }, {capture:true});

    board.addEventListener('wheel', e => {
      if(Math.abs(e.deltaY) >= Math.abs(e.deltaX)){
        board.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, {passive:false});

    try{ if(typeof updateVaccineGameCounter === 'function') updateVaccineGameCounter(); }catch(_){}
  }

  function afterRender(){ setTimeout(hardenVaccineBoard, 90); }

  function patchRenderers(){
    if(typeof window.renderVaccineGame === 'function' && !window.__v3519RenderVaccinePatched){
      const base = window.renderVaccineGame;
      window.renderVaccineGame = function(){
        const out = base.apply(this, arguments);
        afterRender();
        return out;
      };
      window.__v3519RenderVaccinePatched = true;
    }
    if(typeof window.openMemoryGame === 'function' && !window.__v3519OpenGamePatched){
      const baseOpen = window.openMemoryGame;
      window.openMemoryGame = function(name){
        const out = baseOpen.apply(this, arguments);
        if(name === 'vaccine') afterRender();
        return out;
      };
      window.__v3519OpenGamePatched = true;
    }
    if(typeof window.showView === 'function' && !window.__v3519ShowViewPatched){
      const baseShow = window.showView;
      window.showView = function(name){
        const out = baseShow.apply(this, arguments);
        if(name === 'games') afterRender();
        return out;
      };
      window.__v3519ShowViewPatched = true;
    }
  }

  // Reaplica si otra capa re-renderiza el juego.
  const mo = new MutationObserver(() => {
    const b = qs('#vaccineGameBoard');
    if(b && qs('.vaccine-cell', b) && b.dataset.v3519Hardened !== '1') afterRender();
  });
  document.addEventListener('DOMContentLoaded', () => {
    patchRenderers();
    try{ mo.observe(document.body, {childList:true, subtree:true}); }catch(_){}
    afterRender();
  });
  setTimeout(()=>{ patchRenderers(); afterRender(); }, 600);
  setTimeout(()=>{ patchRenderers(); afterRender(); }, 1400);
})();
