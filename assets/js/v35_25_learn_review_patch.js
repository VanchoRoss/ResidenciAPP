/* === ResidenciAPP v35.25 · Repaso inteligente + biblioteca limpia + anotaciones dentro de nodos ===
   Capa no destructiva: no toca banco, IDs, métricas ni localStorage principal salvo el endpoint ya migrado.
*/
(function(){
  if(window.__RESIDENCIAPP_V3525_LEARN_REVIEW_PATCH__) return;
  window.__RESIDENCIAPP_V3525_LEARN_REVIEW_PATCH__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (s='') => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const safeCall = (fn, fallback) => { try { return fn(); } catch(_) { return fallback; } };

  function qByIdSafe(id){ return safeCall(() => QUESTIONS.find(q => String(q.id) === String(id)), null); }
  function mistakeListSafe(){
    return safeCall(() => Object.keys(state?.mistakes || {}).map(qByIdSafe).filter(Boolean), []);
  }
  function saveSafe(){ try { saveState(); } catch(_){} }

  function startPracticeSession(qs, title, meta){
    if(typeof setSession === 'function'){
      setSession(qs, title, meta, 'preguntas', false, {mode:'practice', freeTiming:true});
      return;
    }
    alert('No pude iniciar la sesión en este navegador. Recargá la app e intentá de nuevo.');
  }

  window.startSingleMistakeSession = function(id){
    const q = qByIdSafe(id);
    if(!q) return alert('No encontré esa pregunta en el banco actual.');
    startPracticeSession([q], 'Repaso libre de error', (q.tema || 'Tema') + ' · ' + (q.sprint || 'Sprint'), 'preguntas');
  };

  window.startMistakesFreeSession = function(){
    const qs = mistakeListSafe();
    if(!qs.length) return alert('No tenés errores activos para repaso libre.');
    startPracticeSession(qs, 'Repaso libre de errores', 'Con feedback inmediato · errores activos', 'preguntas');
  };

  window.startMistakesSession = window.startMistakesFreeSession;

  function escapeOnclickArg(v){ return String(v ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' '); }

  function buildReviewRow(q){
    const m = safeCall(() => state.mistakes?.[q.id] || {}, {});
    const qid = escapeOnclickArg(q.id);
    const txt = String(q.q || '').slice(0, 210) + (String(q.q || '').length > 210 ? '…' : '');
    return '<article class="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/60">'
      + '<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">'
      + '<div class="min-w-0"><p class="text-[11px] font-black uppercase tracking-[.14em] text-rose-600 dark:text-rose-300">'+esc(q.eje||'')+' · '+esc(q.tema||'')+'</p>'
      + '<p class="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">'+esc(txt)+'</p>'
      + (m.errorLabel ? '<p class="mt-1 text-[11px] font-bold text-slate-500">Motivo: '+esc(m.errorLabel)+'</p>' : '')
      + '</div>'
      + '<button type="button" class="shrink-0 rounded-2xl border border-medical-200 bg-white px-3 py-2 text-xs font-black text-medical-700 hover:bg-medical-50 dark:border-medical-900/60 dark:bg-slate-900 dark:text-medical-300 dark:hover:bg-medical-950/25" onclick="window.startSingleMistakeSession(\''+qid+'\')">Trabajar esta</button>'
      + '</div></article>';
  }

  function smallReviewPanel(title, icon, qs, buttonHtml, note){
    return '<section class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">'
      + '<p class="text-2xl">'+icon+'</p><h4 class="mt-1 font-display text-xl font-extrabold">'+esc(title)+'</h4>'
      + '<p class="text-sm font-bold text-slate-500">'+qs.length+' preguntas</p>'
      + (note ? '<p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+esc(note)+'</p>' : '')
      + '<div class="mt-4 flex flex-wrap gap-2">'+buttonHtml+'</div>'
      + '<div class="mt-4 space-y-2">'+qs.slice(0,5).map(q => '<div class="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 dark:bg-slate-950/60">'+esc(String(q.q||'').slice(0,130))+(String(q.q||'').length>130?'…':'')+'</div>').join('')+'</div>'
      + '</section>';
  }

  function installReviewPatch(){
    try {
      renderReview = function(){
        const mistakes = mistakeListSafe();
        const due = safeCall(() => typeof dueQuestions === 'function' ? dueQuestions() : [], []);
        const fav = safeCall(() => Object.keys(state?.favorites || {}).map(qByIdSafe).filter(Boolean), []);
        const rows = mistakes.length ? mistakes.map(buildReviewRow).join('') : '<div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200">No hay errores activos.</div>';
        const errorsPanel = '<section class="lg:col-span-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">'
          + '<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p class="text-2xl">🧾</p><h4 class="mt-1 font-display text-2xl font-extrabold">Errores activos</h4>'
          + '<p class="mt-1 text-sm font-bold text-slate-500">'+mistakes.length+' preguntas para trabajar</p>'
          + '<p class="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">El botón “Trabajar esta” abre esa pregunta sola en repaso libre, con feedback inmediato y sin modo revancha.</p></div>'
          + '<div class="flex flex-wrap gap-2"><button type="button" class="rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black text-white hover:bg-rose-700" onclick="startMistakesRevengeSession()">Revancha de errores</button>'
          + '<button type="button" class="rounded-2xl bg-medical-600 px-4 py-3 text-xs font-black text-white hover:bg-medical-700" onclick="window.startMistakesFreeSession()">Trabajar todos con feedback</button></div></div>'
          + '<div class="mt-5 grid gap-2">'+rows+'</div></section>';
        const duePanel = due.length
          ? smallReviewPanel('Repasos vencidos','🔁',due,'<button type="button" class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startDueSession()">Iniciar</button>','Correcta: sale del repaso automático. Incorrecta: vuelve mañana.')
          : '<section class="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft dark:border-emerald-900/60 dark:bg-emerald-950/20"><p class="text-2xl">🔁</p><h4 class="mt-1 font-display text-xl font-extrabold">Repaso espaciado al día</h4><p class="mt-1 text-sm font-semibold leading-6 text-emerald-800 dark:text-emerald-200">No hay preguntas vencidas para hoy.</p></section>';
        const favPanel = smallReviewPanel('Favoritas','⭐',fav,'<button type="button" class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startFavoritesSession()">Iniciar</button>','Preguntas guardadas manualmente.');
        const box = $('#reviewPanels');
        if(box){ box.className = 'grid gap-5 lg:grid-cols-3'; box.innerHTML = errorsPanel + duePanel + favPanel; }
        try { renderAdvancedFlashcards?.(); } catch(_){}
      };
    } catch(err){ console.warn('[v35.25] No se pudo instalar parche de repaso', err); }
  }

  function lessonsList(){ return safeCall(() => Array.isArray(LESSONS) ? LESSONS : (window.RESIDENCIAPP_LESSONS || []), window.RESIDENCIAPP_LESSONS || []); }
  function lessonByIdSafe(id){ return lessonsList().find(l => String(l.id) === String(id)); }
  function lessonProgressSafe(id){ return safeCall(() => (state.lessonProgress ||= {}, state.lessonProgress[id] || {}), {}); }
  function lessonStatusLabel(lesson){
    const st = lessonProgressSafe(lesson.id).status || '';
    if(st === 'done') return ['Visto','bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'];
    if(st === 'saved') return ['Repasar','bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'];
    return ['Sin ver','bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'];
  }
  function selectOptions(values, allLabel, current){
    return '<option value="">'+esc(allLabel)+'</option>' + values.map(v => '<option value="'+esc(v)+'" '+(v===current?'selected':'')+'>'+esc(v)+'</option>').join('');
  }
  function selectedEje(){ return $('#lessonEjeFilter')?.value || ''; }
  function selectedTema(){ return $('#lessonTemaFilter')?.value || ''; }
  function searchText(){ return $('#lessonSearch')?.value || ''; }
  function lessonMatchesFilters(lesson){
    const eje = selectedEje();
    const tema = selectedTema();
    const q = norm(searchText());
    if(eje && lesson.eje !== eje) return false;
    if(tema && lesson.tema !== tema) return false;
    if(!q) return true;
    const hay = norm([lesson.title, lesson.eje, lesson.tema, lesson.subtitle, lesson.description, (lesson.badges||[]).join(' '), (lesson.sections||[]).join(' '), (lesson.terms||[]).join(' ')].join(' '));
    return q.split(/\s+/).filter(Boolean).every(t => hay.includes(t));
  }
  function themeCounts(list){
    const out = {};
    list.forEach(l => { const t = l.tema || 'Sin tema'; out[t] = (out[t] || 0) + 1; });
    return out;
  }
  function populateLearnFilters(){
    const lessons = lessonsList();
    const ejeSel = selectedEje();
    const temaSel = selectedTema();
    const ejes = [...new Set(lessons.map(l => l.eje).filter(Boolean))].sort();
    const temas = [...new Set(lessons.filter(l => !ejeSel || l.eje === ejeSel).map(l => l.tema).filter(Boolean))].sort();
    const ejeEl = $('#lessonEjeFilter');
    const temaEl = $('#lessonTemaFilter');
    if(ejeEl && ejeEl.dataset.v3525 !== '1'){
      ejeEl.dataset.v3525 = '1';
      ejeEl.addEventListener('change', () => { if(temaEl) temaEl.value=''; safeCall(() => renderLearn(), null); });
    }
    if(temaEl && temaEl.dataset.v3525 !== '1'){
      temaEl.dataset.v3525 = '1';
      temaEl.addEventListener('change', () => safeCall(() => renderLearn(), null));
    }
    if(ejeEl) ejeEl.innerHTML = selectOptions(ejes, '1. Elegí un eje', ejeSel);
    if(temaEl) temaEl.innerHTML = selectOptions(temas, ejeSel ? '2. Elegí un tema' : 'Primero elegí un eje', temas.includes(temaSel) ? temaSel : '');
  }
  function renderLessonStats3525(){
    const box = $('#lessonStats'); if(!box) return;
    const lessons = lessonsList();
    const done = lessons.filter(l => lessonProgressSafe(l.id).status === 'done').length;
    const saved = lessons.filter(l => lessonProgressSafe(l.id).status === 'saved').length;
    box.innerHTML = [
      ['Nodos', lessons.length, 'biblioteca'],
      ['Vistos', done, lessons.length ? Math.round(done/lessons.length*100)+'%' : '0%'],
      ['Repasar', saved, 'guardados']
    ].map(x => '<div class="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950/60"><p class="font-display text-2xl font-extrabold">'+x[1]+'</p><p class="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">'+x[0]+'</p><p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">'+x[2]+'</p></div>').join('');
  }
  function axisStartPanel(lessons){
    const byEje = {};
    lessons.forEach(l => { const k = l.eje || 'Otros'; (byEje[k] ||= []).push(l); });
    return '<div class="learn-start-panel rounded-[2rem] p-5">'
      + '<p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Biblioteca por ruta</p>'
      + '<h3 class="mt-1 font-display text-2xl font-extrabold">Elegí un eje para empezar</h3>'
      + '<p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">Para evitar ruido visual, los nodos aparecen recién cuando seleccionás un eje y un tema. También podés usar la búsqueda.</p>'
      + '<div class="mt-4 grid gap-3">'+Object.entries(byEje).sort().map(([eje, items]) => '<button type="button" class="learn-chip-btn rounded-2xl p-4 text-left" onclick="window.v3525ChooseLessonEje(\''+escapeOnclickArg(eje)+'\')"><div class="flex items-center justify-between gap-3"><strong class="font-display text-lg">'+esc(eje)+'</strong><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">'+items.length+' nodos</span></div><p class="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">'+esc([...new Set(items.map(x=>x.tema))].slice(0,4).join(' · '))+'</p></button>').join('')+'</div></div>';
  }
  function themePanel(lessons, eje){
    const counts = themeCounts(lessons.filter(l => !eje || l.eje === eje));
    return '<div class="learn-start-panel rounded-[2rem] p-5">'
      + '<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">'+esc(eje || 'Todos los ejes')+'</p><h3 class="mt-1 font-display text-2xl font-extrabold">Ahora elegí un tema</h3><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">Después vas a ver solo los nodos de ese tema.</p></div><button type="button" class="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="window.v3525ClearLessonFilters()">Cambiar eje</button></div>'
      + '<div class="mt-4 grid gap-3">'+Object.entries(counts).sort().map(([tema,n]) => '<button type="button" class="learn-chip-btn rounded-2xl p-4 text-left" onclick="window.v3525ChooseLessonTema(\''+escapeOnclickArg(tema)+'\')"><div class="flex items-center justify-between gap-3"><strong>'+esc(tema)+'</strong><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+n+' nodos</span></div></button>').join('')+'</div></div>';
  }
  function lessonCard3525(lesson){
    const st = lessonStatusLabel(lesson);
    const current = safeCall(() => state.currentLessonId === lesson.id, false);
    const sections = (lesson.sections || []).slice(0,4).map(s => '<span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">'+esc(s)+'</span>').join('');
    return '<button type="button" data-lesson-open="'+esc(lesson.id)+'" class="lesson-card-3525 '+(current?'is-current':'')+' w-full rounded-[1.5rem] p-4 text-left" onclick="openLesson(\''+escapeOnclickArg(lesson.id)+'\')">'
      + '<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="text-[11px] font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300">'+esc(lesson.eje)+' · '+esc(lesson.tema)+'</p><h4 class="mt-1 font-display text-lg font-extrabold leading-6">'+esc(lesson.title)+'</h4><p class="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">'+esc(lesson.subtitle)+'</p></div><span class="rounded-full px-2 py-1 text-[10px] font-black '+st[1]+'">'+st[0]+'</span></div>'
      + '<p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">'+esc(lesson.description || '')+'</p>'
      + '<div class="mt-3 flex flex-wrap gap-2">'+sections+'</div>'
      + '</button>';
  }
  window.v3525ChooseLessonEje = function(eje){ const el=$('#lessonEjeFilter'); if(el){ el.value=eje; } const t=$('#lessonTemaFilter'); if(t){ t.value=''; } safeCall(() => renderLearn(), null); };
  window.v3525ChooseLessonTema = function(tema){ const el=$('#lessonTemaFilter'); if(el){ el.value=tema; } safeCall(() => renderLearn(), null); };
  window.v3525ClearLessonFilters = function(){ if($('#lessonEjeFilter')) $('#lessonEjeFilter').value=''; if($('#lessonTemaFilter')) $('#lessonTemaFilter').value=''; if($('#lessonSearch')) $('#lessonSearch').value=''; safeCall(() => renderLearn(), null); };

  function installLearnPatch(){
    try {
      renderLearn = function(){
        if(!$('#learnView')) return;
        populateLearnFilters();
        renderLessonStats3525();
        const lessons = lessonsList();
        const eje = selectedEje();
        const tema = selectedTema();
        const q = searchText();
        let html = '';
        if(!eje && !tema && !q){
          html = axisStartPanel(lessons);
        } else if(eje && !tema && !q){
          html = themePanel(lessons, eje);
        } else {
          const list = lessons.filter(lessonMatchesFilters);
          html = '<div class="rounded-[2rem] border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">'
            + '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Resultado filtrado</p><h3 class="font-display text-xl font-extrabold">'+list.length+' nodos encontrados</h3></div><button type="button" class="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="window.v3525ClearLessonFilters()">Limpiar filtros</button></div>'
            + '<div class="mt-4 grid gap-3">'+(list.map(lessonCard3525).join('') || '<div class="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700">No encontré nodos con esos filtros.</div>')+'</div></div>';
        }
        const grid = $('#lessonGrid'); if(grid) grid.innerHTML = html;
        if(safeCall(() => state.currentLessonId && lessonByIdSafe(state.currentLessonId), false)) openLesson(state.currentLessonId, true);
      };

      const oldReset = window.resetLessonFilter || resetLessonFilter;
      window.resetLessonFilter = resetLessonFilter = function(){ window.v3525ClearLessonFilters(); };

      openLesson = function(id, silent){
        const lesson = lessonByIdSafe(id);
        if(!lesson) return;
        safeCall(() => { state.currentLessonId = id; saveState(); }, null);
        $('#lessonEmpty')?.classList.add('hidden');
        const viewer = $('#lessonViewer');
        if(viewer){ viewer.classList.remove('hidden'); viewer.classList.add('lesson-viewer-3525'); }
        if($('#lessonViewerTitle')) $('#lessonViewerTitle').textContent = lesson.title;
        if($('#lessonViewerMeta')) $('#lessonViewerMeta').textContent = (lesson.tema || '') + ' · ' + (lesson.eje || '');
        if($('#lessonViewerSub')) $('#lessonViewerSub').textContent = lesson.subtitle || '';
        if($('#lessonCompleteBtn')) $('#lessonCompleteBtn').textContent = lessonProgressSafe(id).status === 'done' ? '✓ Vista' : 'Marcar vista';
        const frame = $('#lessonFrame');
        if(frame){
          if(frame.getAttribute('src') !== lesson.file) frame.setAttribute('src', lesson.file);
          frame.dataset.lessonId = lesson.id;
          frame.dataset.lessonTitle = lesson.title || '';
        }
        const sections = (lesson.sections || []).map((s,i) => '<span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+(i+1)+'. '+esc(s)+'</span>').join('');
        const qm = $('#lessonQuickMap');
        if(qm){
          qm.innerHTML = '<div class="lesson-toolbar-3525 -m-4 p-4"><div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div class="min-w-0"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Nodo abierto</p><div class="mt-2 flex flex-wrap gap-2">'+sections+'</div><p class="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">Seleccioná texto dentro del nodo para subrayar con colores o fijar una nota en esa posición.</p></div><div class="flex flex-wrap gap-2"><button type="button" class="lesson-toolbar-btn-3525" onclick="toggleLessonFocus()">⛶ Expandir</button><button type="button" class="lesson-toolbar-btn-3525" onclick="window.v3525ClearNodeAnnotations()">Limpiar marcas del nodo</button></div></div></div>';
        }
        if(!silent) safeCall(() => renderLearn(), null);
        setTimeout(() => installFrameAnnotations(), 350);
      };

      startCurrentLessonPractice = function(){
        const id = safeCall(() => state.currentLessonId, '');
        const lesson = lessonByIdSafe(id);
        if(!lesson) return alert('Elegí primero un nodo.');
        const ids = Array.isArray(lesson.explicitQuestionIds) ? lesson.explicitQuestionIds : [];
        const qs = ids.map(qByIdSafe).filter(Boolean);
        if(!qs.length) return alert('Este nodo todavía no tiene preguntas vinculadas de forma explícita. Podés estudiar el material y usar las marcas/notas dentro del nodo.');
        startPracticeSession(qs, 'Nodo · '+lesson.title, 'Práctica libre · preguntas reales del nodo');
      };
    } catch(err){ console.warn('[v35.25] No se pudo instalar biblioteca nueva', err); }
  }

  window.v3525ClearNodeAnnotations = function(){
    const id = safeCall(() => state.currentLessonId, $('#lessonFrame')?.dataset.lessonId || '');
    if(!id) return;
    if(!confirm('¿Limpiar subrayados y notas fijadas dentro de este nodo?')) return;
    try { localStorage.removeItem('residenciapp.lessonInlineAnnotations.v35_25:' + encodeURIComponent(id)); } catch(_){}
    const frame = $('#lessonFrame');
    if(frame){ const src = frame.getAttribute('src'); frame.setAttribute('src', src); }
  };

  function installFrameAnnotations(){
    const frame = $('#lessonFrame');
    if(!frame) return;
    const lessonId = frame.dataset.lessonId || safeCall(() => state.currentLessonId, '');
    function inject(){
      try {
        const doc = frame.contentDocument;
        if(!doc || doc.__RESIDENCIAPP_INLINE_ANN_V3525__) return;
        doc.__RESIDENCIAPP_INLINE_ANN_V3525__ = true;
        const style = doc.createElement('style');
        style.textContent = `
          .ra-hl{border-radius:.18rem;padding:.02rem .08rem;background:var(--ra-hl,#fde68a);box-shadow:0 0 0 1px rgba(0,0,0,.04) inset}
          .ra-ann-toolbar{position:absolute;z-index:99999;display:flex;gap:6px;align-items:center;padding:7px;border-radius:14px;background:rgba(15,23,42,.92);box-shadow:0 18px 48px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12)}
          .ra-ann-toolbar button{width:26px;height:26px;border-radius:999px;border:2px solid rgba(255,255,255,.9);cursor:pointer;font-size:13px;font-weight:900;display:grid;place-items:center;color:#0f172a;background:#fff}
          .ra-note-icon{position:absolute;z-index:9998;width:42px;height:42px;border-radius:14px;border:1px solid rgba(245,158,11,.55);background:linear-gradient(135deg,#fff7ed,#fef3c7);box-shadow:0 14px 34px rgba(15,23,42,.20);display:grid;place-items:center;cursor:grab;font-size:22px;user-select:none}
          .ra-note-board{position:absolute;z-index:9999;width:280px;min-height:190px;border-radius:18px;background:#fffbeb;border:1px solid rgba(245,158,11,.55);box-shadow:0 20px 50px rgba(15,23,42,.25);overflow:hidden;display:flex;flex-direction:column;resize:both}
          .ra-note-head{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px 10px;background:#fef3c7;border-bottom:1px solid rgba(245,158,11,.32);font:700 12px system-ui;cursor:grab;color:#78350f}
          .ra-note-head button{border:0;border-radius:10px;background:#fff7ed;color:#78350f;font-weight:900;padding:4px 8px;cursor:pointer}
          .ra-note-text{flex:1;border:0;outline:0;background:transparent;padding:10px;font:600 13px/1.45 system-ui;color:#431407;resize:none}
          body{position:relative!important}
        `;
        doc.head.appendChild(style);
        const script = doc.createElement('script');
        script.textContent = '(' + frameAnnotationRuntime.toString() + ')(' + JSON.stringify(lessonId || 'sin_nodo') + ');';
        doc.body.appendChild(script);
      } catch(err){ console.warn('[v35.25] No pude inyectar anotaciones en el nodo', err); }
    }
    frame.addEventListener('load', () => setTimeout(inject, 80), {once:false});
    inject();
  }

  function frameAnnotationRuntime(lessonId){
    const KEY = 'residenciapp.lessonInlineAnnotations.v35_25:' + encodeURIComponent(lessonId || 'sin_nodo');
    const colors = ['#fde68a','#bbf7d0','#bfdbfe','#fecdd3','#ddd6fe'];
    const $ = (s, r=document) => r.querySelector(s);
    const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
    let data = load();
    let lastRange = null;
    let z = 10000;

    function load(){ try { return Object.assign({highlights:[], notes:[]}, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(_) { return {highlights:[], notes:[]}; } }
    function save(){ try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(_){} }
    function uid(p){ return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
    function esc(v){ return String(v || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function textNodes(root){
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {acceptNode(n){
        const p = n.parentElement;
        if(!p || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if(['SCRIPT','STYLE','TEXTAREA','INPUT'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
        if(p.closest('.ra-ann-toolbar,.ra-note-icon,.ra-note-board,.ra-hl')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }});
      const out=[]; while(w.nextNode()) out.push(w.currentNode); return out;
    }
    function wrapRange(range, color, id){
      const span = document.createElement('span');
      span.className = 'ra-hl';
      span.dataset.hlId = id;
      span.style.setProperty('--ra-hl', color);
      try { range.surroundContents(span); }
      catch(e){
        const frag = range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
      }
    }
    function applyStoredHighlights(){
      const stored = [...(data.highlights || [])];
      data.highlights = [];
      stored.forEach(h => {
        if(!h || !h.text) return;
        const id = h.id || uid('hl');
        const color = h.color || colors[0];
        let remaining = Number.isFinite(+h.occurrence) ? +h.occurrence : 0;
        for(const node of textNodes(document.body)){
          const idx = node.nodeValue.indexOf(h.text);
          if(idx < 0) continue;
          if(remaining > 0){ remaining--; continue; }
          const range = document.createRange();
          range.setStart(node, idx); range.setEnd(node, idx + h.text.length);
          wrapRange(range, color, id);
          data.highlights.push({id, text:h.text, color, occurrence:h.occurrence || 0, createdAt:h.createdAt || Date.now()});
          return;
        }
      });
      save();
    }
    function occurrenceOfText(text){
      let count = 0;
      const sel = window.getSelection();
      if(!sel || !sel.rangeCount) return 0;
      const range = sel.getRangeAt(0);
      for(const node of textNodes(document.body)){
        const full = node.nodeValue;
        let idx = full.indexOf(text);
        while(idx >= 0){
          const r = document.createRange(); r.setStart(node, idx); r.setEnd(node, idx + text.length);
          if(r.compareBoundaryPoints(Range.END_TO_START, range) <= 0) count++;
          idx = full.indexOf(text, idx + text.length);
        }
      }
      return Math.max(0, count - 1);
    }
    function showToolbar(range){
      hideToolbar();
      const rect = range.getBoundingClientRect();
      const bar = document.createElement('div');
      bar.className = 'ra-ann-toolbar';
      bar.style.left = Math.max(8, rect.left + scrollX) + 'px';
      bar.style.top = Math.max(8, rect.top + scrollY - 46) + 'px';
      bar.innerHTML = colors.map(c => '<button data-hl="'+c+'" style="background:'+c+'" title="Subrayar"></button>').join('') + '<button data-note="1" title="Fijar nota">📝</button>';
      document.body.appendChild(bar);
    }
    function hideToolbar(){ $$('.ra-ann-toolbar').forEach(x => x.remove()); }
    document.addEventListener('mouseup', () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if(!sel || sel.isCollapsed || !sel.toString().trim()) { hideToolbar(); return; }
        lastRange = sel.getRangeAt(0).cloneRange();
        showToolbar(lastRange);
      }, 20);
    });
    document.addEventListener('click', e => {
      const hl = e.target.closest('[data-hl]');
      if(hl && lastRange){
        e.preventDefault(); e.stopPropagation();
        const sel = window.getSelection();
        const text = lastRange.toString().trim();
        const id = uid('hl');
        const color = hl.getAttribute('data-hl') || colors[0];
        if(text){
          const occurrence = occurrenceOfText(text);
          wrapRange(lastRange, color, id);
          data.highlights.push({id, text, color, occurrence, createdAt:Date.now()}); save();
        }
        hideToolbar(); sel?.removeAllRanges(); return;
      }
      const nt = e.target.closest('[data-note]');
      if(nt && lastRange){ e.preventDefault(); e.stopPropagation(); createNoteAtRange(lastRange); hideToolbar(); window.getSelection()?.removeAllRanges(); return; }
      if(!e.target.closest('.ra-ann-toolbar')) hideToolbar();
    }, true);
    function renderNotes(){
      $$('.ra-note-icon,.ra-note-board').forEach(x => x.remove());
      (data.notes || []).forEach(n => {
        if(n.open){ renderBoard(n); } else { renderIcon(n); }
      });
    }
    function renderIcon(n){
      const el = document.createElement('button'); el.type='button'; el.className='ra-note-icon'; el.textContent='📝'; el.style.left=(n.x||20)+'px'; el.style.top=(n.y||20)+'px'; el.style.zIndex=String(n.z||9998); el.dataset.noteId=n.id; document.body.appendChild(el); makeDraggable(el,n); el.addEventListener('click', ev => { if(el.dataset.moved==='1') return; ev.preventDefault(); n.open=true; n.z=++z; save(); renderNotes(); });
    }
    function renderBoard(n){
      const el = document.createElement('article'); el.className='ra-note-board'; el.style.left=(n.x||20)+'px'; el.style.top=(n.y||20)+'px'; el.style.width=(n.w||280)+'px'; el.style.height=(n.h||190)+'px'; el.style.zIndex=String(n.z||9999); el.dataset.noteId=n.id;
      el.innerHTML='<header class="ra-note-head"><span>📝 Nota fijada</span><span><button data-close="1">–</button><button data-del="1">×</button></span></header><textarea class="ra-note-text" placeholder="Escribí tu nota…">'+esc(n.text||'')+'</textarea>';
      document.body.appendChild(el); makeDraggable(el,n, $('.ra-note-head', el));
      $('[data-close]', el).onclick = () => { n.open=false; n.w=el.offsetWidth; n.h=el.offsetHeight; save(); renderNotes(); };
      $('[data-del]', el).onclick = () => { if(confirm('¿Eliminar esta nota?')){ data.notes = data.notes.filter(x => x.id !== n.id); save(); renderNotes(); } };
      $('.ra-note-text', el).addEventListener('input', ev => { n.text = ev.target.value; n.w=el.offsetWidth; n.h=el.offsetHeight; save(); });
    }
    function createNoteAtRange(range){
      const rect = range.getBoundingClientRect();
      const n = {id:uid('note'), x:Math.max(12, rect.left + scrollX), y:Math.max(12, rect.bottom + scrollY + 8), w:280, h:190, text:'', open:true, z:++z, createdAt:Date.now()};
      data.notes.push(n); save(); renderNotes();
      setTimeout(() => $('.ra-note-board[data-note-id="'+n.id+'"] .ra-note-text')?.focus(), 40);
    }
    function makeDraggable(el, n, handle){
      const h = handle || el; let down=false, moved=false, sx=0, sy=0, ox=0, oy=0;
      h.addEventListener('pointerdown', ev => { if(ev.target.tagName==='TEXTAREA' || ev.target.closest('button')) return; down=true; moved=false; sx=ev.clientX; sy=ev.clientY; ox=n.x||0; oy=n.y||0; n.z=++z; try{ h.setPointerCapture(ev.pointerId); }catch(_){} ev.preventDefault(); });
      h.addEventListener('pointermove', ev => { if(!down) return; const dx=ev.clientX-sx, dy=ev.clientY-sy; if(Math.abs(dx)>3 || Math.abs(dy)>3) moved=true; n.x=Math.max(0, ox+dx); n.y=Math.max(0, oy+dy); el.style.left=n.x+'px'; el.style.top=n.y+'px'; el.style.zIndex=String(n.z); el.dataset.moved=moved?'1':'0'; });
      h.addEventListener('pointerup', () => { if(!down) return; down=false; setTimeout(()=>{ el.dataset.moved='0'; }, 60); save(); });
    }
    applyStoredHighlights(); renderNotes();
  }

  function boot(){
    installReviewPatch();
    installLearnPatch();
    const frame = $('#lessonFrame');
    if(frame){ frame.addEventListener('load', () => setTimeout(installFrameAnnotations, 120)); }
    setTimeout(() => { try { if(typeof renderReview === 'function') renderReview(); } catch(_){} try { if(typeof renderLearn === 'function') renderLearn(); } catch(_){} }, 350);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
