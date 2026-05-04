/* === ResidenciAPP v35.2 · calendario pantalla completa + marcado rápido ===
   Capa no destructiva: no toca banco, progreso, estadísticas ni MedQuiz.
*/
(function(){
  'use strict';

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  let lastActiveEl = null;
  let clickCaptureBound = false;
  let dragBound = false;
  let wasDragging = false;

  function isGameFinished(){
    return !!qs('#vaccineGameBoard .vaccine-tap:disabled');
  }

  function setCellSelected(cell, force){
    if(!cell || isGameFinished()) return;
    const selected = typeof force === 'boolean' ? force : !cell.classList.contains('is-selected');
    cell.classList.toggle('is-selected', selected);
    const btn = qs('.vaccine-tap', cell);
    if(btn){
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      btn.innerHTML = selected ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>';
    }
    try{ if(typeof updateVaccineGameCounter === 'function') updateVaccineGameCounter(); }catch(_){ }
  }

  function bindFastCellToggle(){
    if(clickCaptureBound) return;
    clickCaptureBound = true;
    document.addEventListener('click', function(e){
      const board = qs('#vaccineGameBoard');
      if(!board || !board.contains(e.target)) return;
      const cell = e.target.closest && e.target.closest('.vaccine-cell');
      if(!cell) return;
      if(wasDragging || window.__vaccineJustDragged){
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setCellSelected(cell);
    }, true);
  }

  function bindSmoothScroll(){
    const board = qs('#vaccineGameBoard');
    if(!board || board.dataset.v352DragBound === '1') return;
    board.dataset.v352DragBound = '1';
    dragBound = true;
    let down=false, sx=0, sy=0, sl=0, st=0;

    board.addEventListener('pointerdown', e => {
      if(e.target.closest && e.target.closest('button:not(.vaccine-tap)')) return;
      down = true; wasDragging = false;
      sx = e.clientX; sy = e.clientY; sl = board.scrollLeft; st = board.scrollTop;
      board.classList.add('is-dragging');
      try{ board.setPointerCapture(e.pointerId); }catch(_){ }
    }, {passive:true});

    board.addEventListener('pointermove', e => {
      if(!down) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if(Math.abs(dx) > 5 || Math.abs(dy) > 5){
        wasDragging = true;
        board.scrollLeft = sl - dx;
        board.scrollTop = st - dy;
        window.__vaccineJustDragged = true;
        e.preventDefault();
      }
    }, {passive:false});

    function endDrag(){
      down = false;
      board.classList.remove('is-dragging');
      if(wasDragging){
        window.__vaccineJustDragged = true;
        setTimeout(() => { window.__vaccineJustDragged = false; wasDragging = false; }, 180);
      } else {
        setTimeout(() => { wasDragging = false; }, 30);
      }
    }
    board.addEventListener('pointerup', endDrag, {passive:true});
    board.addEventListener('pointercancel', endDrag, {passive:true});
    board.addEventListener('mouseleave', () => { if(down) endDrag(); }, {passive:true});

    board.addEventListener('wheel', e => {
      if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){
        board.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, {passive:false});
  }

  function ensureFullscreenButton(){
    const panel = qs('#vaccineGamePanel');
    if(!panel) return;
    if(qs('#vaccineFullscreenBtn')) return;

    const controls = qs('#vaccineGameCounter')?.parentElement;
    if(!controls) return;
    const btn = document.createElement('button');
    btn.id = 'vaccineFullscreenBtn';
    btn.type = 'button';
    btn.className = 'rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800';
    btn.textContent = '⛶ Pantalla completa';
    btn.addEventListener('click', toggleVaccineFullscreen);
    controls.insertBefore(btn, controls.querySelector('button'));
  }

  function toggleVaccineFullscreen(){
    const panel = qs('#vaccineGamePanel');
    if(!panel) return;
    const active = panel.classList.toggle('vaccine-fullscreen-mode');
    document.body.classList.toggle('vaccine-fullscreen-active', active);
    const btn = qs('#vaccineFullscreenBtn');
    if(btn) btn.textContent = active ? '↙ Salir de pantalla completa' : '⛶ Pantalla completa';
    if(active){
      lastActiveEl = document.activeElement;
      setTimeout(() => qs('#vaccineGameBoard')?.focus?.(), 50);
    } else if(lastActiveEl && lastActiveEl.focus){
      try{ lastActiveEl.focus(); }catch(_){ }
    }
  }

  function bindEscapeKey(){
    if(window.__residenciappV352EscBound) return;
    window.__residenciappV352EscBound = true;
    document.addEventListener('keydown', e => {
      if(e.key !== 'Escape') return;
      const panel = qs('#vaccineGamePanel.vaccine-fullscreen-mode');
      if(panel) toggleVaccineFullscreen();
    });
  }

  function simplifyBoard(){
    const board = qs('#vaccineGameBoard');
    if(!board) return;
    board.setAttribute('tabindex','0');
    board.setAttribute('aria-label','Calendario de vacunación desplazable');
    qsa('.vaccine-tap', board).forEach(btn => {
      btn.type = 'button';
      btn.setAttribute('tabindex','-1');
    });
  }

  function enhance(){
    ensureFullscreenButton();
    bindFastCellToggle();
    bindSmoothScroll();
    bindEscapeKey();
    simplifyBoard();
  }

  // Reaplicar cada vez que se renderiza el juego o se vuelve a la sección Juegos.
  function patchRenderers(){
    if(typeof window.renderVaccineGame === 'function' && !window.__residenciappV352RenderPatch){
      const base = window.renderVaccineGame;
      window.renderVaccineGame = function(){
        const result = base.apply(this, arguments);
        setTimeout(enhance, 0);
        return result;
      };
      window.__residenciappV352RenderPatch = true;
    }
    if(typeof window.openMemoryGame === 'function' && !window.__residenciappV352OpenGamePatch){
      const baseOpen = window.openMemoryGame;
      window.openMemoryGame = function(name){
        const result = baseOpen.apply(this, arguments);
        if(name === 'vaccine') setTimeout(enhance, 30);
        return result;
      };
      window.__residenciappV352OpenGamePatch = true;
    }
    if(typeof window.showView === 'function' && !window.__residenciappV352ShowViewPatch){
      const baseShow = window.showView;
      window.showView = function(name){
        const result = baseShow.apply(this, arguments);
        if(name === 'games') setTimeout(enhance, 80);
        return result;
      };
      window.__residenciappV352ShowViewPatch = true;
    }
  }

  document.addEventListener('DOMContentLoaded', () => { patchRenderers(); setTimeout(enhance, 300); });
  setTimeout(() => { patchRenderers(); enhance(); }, 700);
  window.toggleVaccineFullscreen = toggleVaccineFullscreen;
})();
