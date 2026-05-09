/* === ResidenciAPP v35.23 · Notas móviles por nodo en Aprender desde cero ===
   - Guarda notas por nodo en localStorage separado del progreso principal.
   - Agrega miniaturas tipo papel/nota que se abren al hacer click.
   - Cada nota puede moverse, cerrarse como icono, editarse, redimensionarse y eliminarse.
   - No toca banco, IDs de preguntas, métricas, sesiones ni estadísticas.
*/
(function(){
  if(window.__RESIDENCIAPP_V3523_LESSON_NOTES__) return;
  window.__RESIDENCIAPP_V3523_LESSON_NOTES__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cssEsc = (v='') => (window.CSS && typeof CSS.escape === 'function') ? CSS.escape(String(v)) : String(v).replace(/[^a-zA-Z0-9_-]/g, ch => '\\' + ch);
  const BASE_KEY = 'residenciapp.lessonNodeNotes.v35_23';
  let activeLessonId = '';
  let notes = [];
  let zSeed = 30;
  let hydrated = false;
  let saveTimer = null;
  let resizeObserver = null;

  function lessons(){
    try { return (typeof LESSONS !== 'undefined' && Array.isArray(LESSONS)) ? LESSONS : (window.RESIDENCIAPP_LESSONS || []); }
    catch(_) { return window.RESIDENCIAPP_LESSONS || []; }
  }

  function currentLessonId(){
    try { if(typeof state !== 'undefined' && state.currentLessonId) return state.currentLessonId; } catch(_){ }
    const currentCard = $('[data-lesson-open].is-current');
    if(currentCard) return currentCard.getAttribute('data-lesson-open') || '';
    return activeLessonId || '';
  }

  function lessonTitle(id){
    const l = lessons().find(x => x.id === id);
    return l?.title || $('#lessonViewerTitle')?.textContent?.trim() || 'Nodo actual';
  }

  function storageKey(id){ return BASE_KEY + ':' + encodeURIComponent(id || 'sin_nodo'); }

  function loadNotes(id){
    try {
      const raw = localStorage.getItem(storageKey(id));
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.map(normalizeNote).filter(Boolean) : [];
    } catch(err){
      console.warn('[v35.23] No pude leer notas del nodo', err);
      return [];
    }
  }

  function normalizeNote(n){
    if(!n || typeof n !== 'object') return null;
    return {
      id: String(n.id || ('note_' + Date.now() + '_' + Math.random().toString(16).slice(2))),
      text: String(n.text || ''),
      x: Number.isFinite(+n.x) ? +n.x : 24,
      y: Number.isFinite(+n.y) ? +n.y : 24,
      w: Number.isFinite(+n.w) ? Math.max(220, +n.w) : 300,
      h: Number.isFinite(+n.h) ? Math.max(180, +n.h) : 240,
      collapsed: n.collapsed !== false,
      z: Number.isFinite(+n.z) ? +n.z : ++zSeed,
      createdAt: Number.isFinite(+n.createdAt) ? +n.createdAt : Date.now(),
      updatedAt: Number.isFinite(+n.updatedAt) ? +n.updatedAt : Date.now()
    };
  }

  function persistNow(){
    if(!activeLessonId) return;
    const safeNotes = notes.map(n => ({
      id:n.id, text:n.text, x:Math.round(n.x), y:Math.round(n.y), w:Math.round(n.w), h:Math.round(n.h),
      collapsed:!!n.collapsed, z:Math.round(n.z || 1), createdAt:n.createdAt, updatedAt:n.updatedAt
    }));
    try { localStorage.setItem(storageKey(activeLessonId), JSON.stringify(safeNotes)); }
    catch(err){ console.warn('[v35.23] No pude guardar notas del nodo', err); }
    updateCount();
  }

  function persistSoon(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, 160);
  }

  function ensureUi(){
    const viewer = $('#lessonViewer');
    if(!viewer) return false;
    viewer.classList.add('lesson-notes-scope');

    if(!$('#lessonNotesSection')){
      const toolbar = document.createElement('div');
      toolbar.id = 'lessonNotesSection';
      toolbar.className = 'lesson-notes-section border-b border-slate-200 p-4 dark:border-slate-800';
      toolbar.innerHTML = `
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0">
            <p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Notas del nodo</p>
            <h4 class="font-display text-lg font-extrabold">Mini pizarras personales</h4>
            <p id="lessonNotesHint" class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Se guardan solo en este dispositivo y para este nodo. Tocá un papel para abrirlo, arrastralo para moverlo y cerralo para dejarlo como icono.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span id="lessonNotesCount" class="rounded-full bg-slate-100 px-3 py-2 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">0 notas</span>
            <button id="lessonNotesNewBtn" type="button" class="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-amber-600">📝 Nueva nota</button>
            <button id="lessonNotesCollapseAllBtn" type="button" class="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cerrar todas</button>
          </div>
        </div>`;
      const quickMap = $('#lessonQuickMap');
      if(quickMap && quickMap.parentNode) quickMap.insertAdjacentElement('afterend', toolbar);
      else viewer.insertBefore(toolbar, viewer.firstChild);
    }

    if(!$('#lessonNotesLayer')){
      const layer = document.createElement('div');
      layer.id = 'lessonNotesLayer';
      layer.className = 'lesson-notes-layer';
      layer.setAttribute('aria-live','polite');
      viewer.appendChild(layer);
    }

    if(!$('#lessonNotesTopBtn')){
      const btnGroup = $('#lessonViewer .flex.flex-wrap.gap-2');
      if(btnGroup){
        const btn = document.createElement('button');
        btn.id = 'lessonNotesTopBtn';
        btn.type = 'button';
        btn.className = 'rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200';
        btn.textContent = '📝 Notas';
        btnGroup.appendChild(btn);
      }
    }

    bindToolbarOnce();
    return true;
  }

  function bindToolbarOnce(){
    const newBtn = $('#lessonNotesNewBtn');
    if(newBtn && !newBtn.dataset.bound){
      newBtn.dataset.bound = '1';
      newBtn.addEventListener('click', () => createNote());
    }
    const collapseBtn = $('#lessonNotesCollapseAllBtn');
    if(collapseBtn && !collapseBtn.dataset.bound){
      collapseBtn.dataset.bound = '1';
      collapseBtn.addEventListener('click', () => {
        notes.forEach(n => { n.collapsed = true; n.updatedAt = Date.now(); });
        renderNotes(); persistNow();
      });
    }
    const topBtn = $('#lessonNotesTopBtn');
    if(topBtn && !topBtn.dataset.bound){
      topBtn.dataset.bound = '1';
      topBtn.addEventListener('click', () => {
        if(!activeLessonId) activate(currentLessonId());
        const section = $('#lessonNotesSection');
        section?.scrollIntoView({behavior:'smooth', block:'center'});
        if(!notes.length) createNote();
      });
    }
  }

  function clampNote(n){
    const viewer = $('#lessonViewer');
    const layer = $('#lessonNotesLayer');
    const box = (viewer || layer || document.body).getBoundingClientRect();
    const maxX = Math.max(8, box.width - (n.collapsed ? 74 : Math.min(n.w, 340)) - 12);
    const maxY = Math.max(8, box.height - (n.collapsed ? 70 : 120) - 12);
    n.x = Math.max(8, Math.min(n.x, maxX));
    n.y = Math.max(8, Math.min(n.y, maxY));
  }

  function createNote(){
    const id = activeLessonId || currentLessonId();
    if(!id) return alert('Elegí primero un nodo para agregar notas.');
    if(id !== activeLessonId) activate(id);
    const offset = Math.min(120, notes.length * 18);
    const note = normalizeNote({
      id:'ln_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7),
      text:'', x:28 + offset, y:92 + offset, w:310, h:250, collapsed:true, z:++zSeed,
      createdAt:Date.now(), updatedAt:Date.now()
    });
    clampNote(note);
    notes.push(note);
    renderNotes(); persistNow();
  }

  function updateCount(){
    const count = $('#lessonNotesCount');
    if(count) count.textContent = notes.length + (notes.length === 1 ? ' nota' : ' notas');
  }

  function previewText(txt){
    const clean = String(txt || '').trim().replace(/\s+/g,' ');
    return clean ? clean.slice(0,54) + (clean.length > 54 ? '…' : '') : 'Nota vacía';
  }

  function renderNotes(){
    if(!ensureUi()) return;
    const layer = $('#lessonNotesLayer');
    if(!layer) return;
    if(resizeObserver){ try { resizeObserver.disconnect(); } catch(_){} }
    resizeObserver = ('ResizeObserver' in window) ? new ResizeObserver(entries => {
      entries.forEach(entry => {
        const el = entry.target;
        const id = el?.dataset?.noteId;
        const note = notes.find(n => n.id === id);
        if(!note || note.collapsed) return;
        const rect = entry.contentRect;
        note.w = Math.max(220, Math.round(rect.width));
        note.h = Math.max(180, Math.round(rect.height));
        note.updatedAt = Date.now();
        persistSoon();
      });
    }) : null;

    layer.innerHTML = notes.map(n => {
      clampNote(n);
      if(n.collapsed){
        return `<button type="button" class="lesson-note lesson-note-icon" data-note-id="${esc(n.id)}" style="left:${Math.round(n.x)}px;top:${Math.round(n.y)}px;z-index:${Math.round(n.z || 1)}" title="Abrir nota: ${esc(previewText(n.text))}">
          <span class="lesson-note-paper">📝</span><span class="lesson-note-mini-preview">${esc(previewText(n.text))}</span>
        </button>`;
      }
      return `<article class="lesson-note lesson-note-board" data-note-id="${esc(n.id)}" style="left:${Math.round(n.x)}px;top:${Math.round(n.y)}px;width:${Math.round(n.w)}px;height:${Math.round(n.h)}px;z-index:${Math.round(n.z || 1)}">
        <header class="lesson-note-head" data-note-drag-handle="1">
          <div class="min-w-0"><p class="lesson-note-kicker">📝 ${esc(lessonTitle(activeLessonId))}</p><strong>Mini pizarra</strong></div>
          <div class="lesson-note-actions">
            <button type="button" data-note-collapse="${esc(n.id)}" title="Cerrar como icono">–</button>
            <button type="button" data-note-delete="${esc(n.id)}" title="Eliminar nota">×</button>
          </div>
        </header>
        <textarea class="lesson-note-text" data-note-text="${esc(n.id)}" placeholder="Escribí tu nota del nodo…">${esc(n.text)}</textarea>
      </article>`;
    }).join('');

    $$('.lesson-note-board', layer).forEach(el => resizeObserver?.observe(el));
    updateCount();
  }

  function bringToFront(note){
    note.z = ++zSeed;
    note.updatedAt = Date.now();
  }

  function noteFromElement(el){
    const id = el?.closest?.('[data-note-id]')?.getAttribute('data-note-id');
    return notes.find(n => n.id === id);
  }

  function bindLayerEvents(){
    document.addEventListener('click', e => {
      const layer = $('#lessonNotesLayer');
      if(!layer || !layer.contains(e.target)) return;

      const del = e.target.closest('[data-note-delete]');
      if(del){
        e.preventDefault(); e.stopPropagation();
        const id = del.getAttribute('data-note-delete');
        const note = notes.find(n => n.id === id);
        const ok = confirm('¿Eliminar esta nota del nodo?');
        if(!ok) return;
        notes = notes.filter(n => n.id !== id);
        renderNotes(); persistNow();
        return;
      }

      const collapse = e.target.closest('[data-note-collapse]');
      if(collapse){
        e.preventDefault(); e.stopPropagation();
        const note = notes.find(n => n.id === collapse.getAttribute('data-note-collapse'));
        if(note){ note.collapsed = true; bringToFront(note); renderNotes(); persistNow(); }
        return;
      }

      const icon = e.target.closest('.lesson-note-icon');
      if(icon){
        e.preventDefault(); e.stopPropagation();
        if(icon.dataset.dragMoved === '1') return;
        const note = noteFromElement(icon);
        if(note){ note.collapsed = false; bringToFront(note); renderNotes(); persistNow(); setTimeout(() => $('[data-note-text="'+cssEsc(note.id)+'"]')?.focus(), 30); }
      }
    });

    document.addEventListener('input', e => {
      const t = e.target.closest('[data-note-text]');
      if(!t) return;
      const note = notes.find(n => n.id === t.getAttribute('data-note-text'));
      if(!note) return;
      note.text = t.value;
      note.updatedAt = Date.now();
      persistSoon();
    });

    document.addEventListener('pointerdown', e => {
      const noteEl = e.target.closest('.lesson-note');
      const layer = $('#lessonNotesLayer');
      if(!noteEl || !layer || !layer.contains(noteEl)) return;
      const note = noteFromElement(noteEl);
      if(!note) return;
      const isInteractive = e.target.closest('textarea,[data-note-collapse],[data-note-delete]');
      const isHandle = e.target.closest('[data-note-drag-handle]') || noteEl.classList.contains('lesson-note-icon');
      if(!isHandle || isInteractive) return;

      e.preventDefault();
      bringToFront(note);
      noteEl.style.zIndex = note.z;
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = note.x;
      const origY = note.y;
      let moved = false;
      noteEl.setPointerCapture?.(e.pointerId);
      noteEl.classList.add('is-dragging');

      const onMove = ev => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if(Math.abs(dx) + Math.abs(dy) > 3) moved = true;
        note.x = origX + dx;
        note.y = origY + dy;
        clampNote(note);
        noteEl.style.left = Math.round(note.x) + 'px';
        noteEl.style.top = Math.round(note.y) + 'px';
      };
      const onUp = ev => {
        noteEl.releasePointerCapture?.(e.pointerId);
        noteEl.classList.remove('is-dragging');
        document.removeEventListener('pointermove', onMove, true);
        document.removeEventListener('pointerup', onUp, true);
        document.removeEventListener('pointercancel', onUp, true);
        note.updatedAt = Date.now();
        persistNow();
        if(moved) noteEl.dataset.dragMoved = '1';
        setTimeout(() => { delete noteEl.dataset.dragMoved; }, 80);
      };
      document.addEventListener('pointermove', onMove, true);
      document.addEventListener('pointerup', onUp, true);
      document.addEventListener('pointercancel', onUp, true);
    }, true);
  }

  function activate(id){
    id = id || currentLessonId();
    if(!id) return;
    if(!ensureUi()) return;
    if(id !== activeLessonId){
      activeLessonId = id;
      notes = loadNotes(activeLessonId);
      zSeed = Math.max(30, ...notes.map(n => n.z || 1));
    }
    renderNotes();
  }

  function wrapOpenLesson(){
    const prev = window.openLesson;
    if(typeof prev !== 'function' || prev.__notesWrapped) return;
    const wrapped = function(id, silent=false){
      const ret = prev.apply(this, arguments);
      setTimeout(() => activate(id || currentLessonId()), 40);
      return ret;
    };
    wrapped.__notesWrapped = true;
    window.openLesson = wrapped;
  }

  function init(){
    hydrated = true;
    ensureUi();
    bindLayerEvents();
    wrapOpenLesson();
    const id = currentLessonId();
    if(id) activate(id);

    document.addEventListener('click', e => {
      if(e.target.closest('[data-lesson-open]')) setTimeout(() => activate(currentLessonId()), 80);
      if(e.target.closest('[data-nav="learn"]')) setTimeout(() => activate(currentLessonId()), 180);
    });
    window.addEventListener('beforeunload', persistNow);
    window.addEventListener('resize', () => { notes.forEach(clampNote); renderNotes(); persistSoon(); });
    setTimeout(() => { wrapOpenLesson(); if(currentLessonId()) activate(currentLessonId()); }, 600);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
