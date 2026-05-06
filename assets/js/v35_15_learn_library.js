/* === ResidenciAPP v35.15 · Biblioteca visual de Aprender desde cero ===
   - Agrega filtros por eje y tema.
   - Renderiza nodos como biblioteca visual limpia.
   - Registra nuevos nodos HTML sin tocar banco, IDs, métricas ni progreso.
*/
(function(){
  if(window.__RESIDENCIAPP_V3515_LEARN__) return;
  window.__RESIDENCIAPP_V3515_LEARN__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const LES = (typeof LESSONS !== 'undefined' ? LESSONS : (window.RESIDENCIAPP_LESSONS || []));
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (s='') => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const unique = arr => Array.from(new Set(arr.filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b),'es'));
  const accentMap = {rose:'#e11d48', purple:'#7c3aed', blue:'#1877d6', indigo:'#4f46e5', teal:'#0f9f85', amber:'#d97706', emerald:'#059669', medical:'#1877d6', orange:'#ea580c', cyan:'#0891b2'};
  const ejeIcon = eje => /mujer|gine/i.test(eje) ? '♀️' : /cl[ií]nica/i.test(eje) ? '🩺' : /pediatr/i.test(eje) ? '🧸' : /salud/i.test(eje) ? '🏥' : /cirug/i.test(eje) ? '🔪' : '📚';

  function progressOf(id){
    try { return (state.lessonProgress || {})[id] || {}; } catch(_) { return {}; }
  }
  function isDone(id){ return progressOf(id).status === 'done'; }
  function isSaved(id){ return progressOf(id).status === 'saved'; }
  function relatedCount(lesson){
    try { return typeof lessonRelatedQuestions === 'function' ? lessonRelatedQuestions(lesson).length : 0; } catch(_) { return 0; }
  }
  function currentLessonId(){ try { return state.currentLessonId || ''; } catch(_) { return ''; } }

  function syncFilters(){
    const ejeSel = $('#lessonEjeFilter');
    const temaSel = $('#lessonTemaFilter');
    if(!ejeSel) return;
    const prevEje = ejeSel.value || '';
    const ejes = unique(LES.map(l => l.eje || 'Sin eje'));
    ejeSel.innerHTML = '<option value="">Todos los ejes</option>' + ejes.map(e => '<option value="'+esc(e)+'">'+ejeIcon(e)+' '+esc(e)+'</option>').join('');
    if(ejes.includes(prevEje)) ejeSel.value = prevEje;

    const selectedEje = ejeSel.value || '';
    if(temaSel){
      const prevTema = temaSel.value || '';
      const temas = unique(LES.filter(l => !selectedEje || l.eje === selectedEje).map(l => l.tema || 'Sin tema'));
      temaSel.innerHTML = '<option value="">Todos los temas</option>' + temas.map(t => '<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');
      if(temas.includes(prevTema)) temaSel.value = prevTema;
    }

    const chipHost = $('#lessonAxisChips');
    if(chipHost){
      chipHost.innerHTML = [''].concat(ejes).map(e => {
        const active = (ejeSel.value || '') === e;
        const label = e ? ejeIcon(e)+' '+e : 'Todos';
        return '<button type="button" class="learn-chip '+(active?'active':'')+' rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800" data-lesson-eje-chip="'+esc(e)+'">'+esc(label)+'</button>';
      }).join('');
    }
  }

  function lessonMatchesV3515(lesson){
    const q = ($('#lessonSearch')?.value || '').trim();
    const eje = $('#lessonEjeFilter')?.value || '';
    const tema = $('#lessonTemaFilter')?.value || '';
    if(eje && lesson.eje !== eje) return false;
    if(tema && lesson.tema !== tema) return false;
    if(!q) return true;
    const hay = norm([lesson.title, lesson.eje, lesson.tema, lesson.subtitle, lesson.description, (lesson.badges||[]).join(' '), (lesson.sections||[]).join(' '), (lesson.terms||[]).join(' ')].join(' '));
    return q.split(/\s+/).every(tok => hay.includes(norm(tok)));
  }

  function statusBadge(lesson){
    if(isDone(lesson.id)) return '<span class="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Vista</span>';
    if(isSaved(lesson.id)) return '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Repasar</span>';
    return '<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">Sin ver</span>';
  }

  function card(lesson){
    const accent = accentMap[lesson.accent] || accentMap.medical;
    const current = currentLessonId() === lesson.id;
    const related = relatedCount(lesson);
    const sections = (lesson.sections || []).slice(0,4).map(s => '<span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">'+esc(s)+'</span>').join('');
    const badges = (lesson.badges || []).slice(0,3).map(b => '<span class="rounded-full border border-slate-200 bg-white/70 px-2 py-1 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">'+esc(b)+'</span>').join('');
    return '<button type="button" class="learn-card '+(current?'is-current border-medical-300 bg-medical-50/70 dark:border-medical-700 dark:bg-medical-950/20':'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/45')+' w-full rounded-[1.6rem] border p-4 text-left shadow-sm transition" style="--learn-accent:'+accent+'" data-lesson-open="'+esc(lesson.id)+'">'
      + '<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">'+esc(lesson.eje || 'Sin eje')+'</p><h4 class="learn-card-title mt-1 font-display text-lg font-extrabold leading-6">'+esc(lesson.title)+'</h4><p class="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">'+esc(lesson.tema || 'Sin tema')+'</p></div>'+statusBadge(lesson)+'</div>'
      + '<p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">'+esc(lesson.description || lesson.subtitle || '')+'</p>'
      + '<div class="mt-3 flex flex-wrap gap-1.5">'+(badges || sections)+'</div>'
      + '<div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-black text-slate-400 dark:border-slate-800"><span>'+((lesson.sections||[]).length || 0)+' secciones</span><span>'+related+' preguntas vinculadas</span></div>'
      + '</button>';
  }

  function renderStatsV3515(){
    const host = $('#lessonStats');
    if(!host) return;
    const total = LES.length;
    const done = LES.filter(l => isDone(l.id)).length;
    const saved = LES.filter(l => isSaved(l.id)).length;
    const ejes = unique(LES.map(l => l.eje)).length;
    const pct = total ? Math.round(done/total*100) : 0;
    host.innerHTML = [
      ['Nodos', total, 'disponibles'],
      ['Vistos', done, pct+'% avance'],
      ['Repasar', saved, 'guardados']
    ].map(x => '<div class="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950/60"><p class="font-display text-2xl font-extrabold">'+x[1]+'</p><p class="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">'+x[0]+'</p><p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">'+x[2]+'</p></div>').join('')
    + '<div class="col-span-3 rounded-2xl border border-medical-100 bg-medical-50/70 px-4 py-3 text-xs font-bold text-medical-700 dark:border-medical-900/60 dark:bg-medical-950/30 dark:text-medical-200">📚 Biblioteca visual · '+ejes+' ejes · filtros por tema</div>';
  }

  window.renderLearn = function(){
    if(!$('#learnView')) return;
    syncFilters();
    renderStatsV3515();
    const list = LES.filter(lessonMatchesV3515);
    const grid = $('#lessonGrid');
    if(grid){
      grid.classList.add('lesson-library-grid');
      if(!list.length){
        grid.innerHTML = '<div class="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700">No encontré nodos con esos filtros. Probá limpiar búsqueda o elegir otro eje.</div>';
      } else {
        const grouped = list.reduce((acc,l)=>{ const k = l.eje || 'Sin eje'; (acc[k] ||= []).push(l); return acc; }, {});
        grid.innerHTML = Object.entries(grouped).map(([eje, items]) =>
          '<section class="space-y-3"><div class="library-section-title rounded-2xl border border-slate-200 bg-white/85 px-3 py-2 text-xs font-black uppercase tracking-[.18em] text-medical-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/85 dark:text-medical-300">'+esc(ejeIcon(eje)+' '+eje)+' · '+items.length+' nodos</div><div class="grid gap-3">'+items.map(card).join('')+'</div></section>'
        ).join('');
      }
    }
    const current = currentLessonId();
    if(current && LES.some(l => l.id === current) && typeof openLesson === 'function') openLesson(current, true);
  };

  window.resetLessonFilter = function(){
    if($('#lessonSearch')) $('#lessonSearch').value = '';
    if($('#lessonEjeFilter')) $('#lessonEjeFilter').value = '';
    if($('#lessonTemaFilter')) $('#lessonTemaFilter').value = '';
    window.renderLearn();
  };

  const prevOpen = window.openLesson;
  window.openLesson = function(id, silent=false){
    const lesson = LES.find(l => l.id === id);
    if(!lesson) return;
    try { if(typeof state !== 'undefined'){ state.currentLessonId = id; if(typeof saveState === 'function') saveState(); } } catch(_){}
    if($('#lessonEmpty')) $('#lessonEmpty').classList.add('hidden');
    if($('#lessonViewer')) $('#lessonViewer').classList.remove('hidden');
    if($('#lessonViewerTitle')) $('#lessonViewerTitle').textContent = lesson.title;
    if($('#lessonViewerMeta')) $('#lessonViewerMeta').textContent = (lesson.tema || 'Tema')+' · '+(lesson.eje || 'Eje');
    if($('#lessonViewerSub')) $('#lessonViewerSub').textContent = lesson.subtitle || '';
    const frame = $('#lessonFrame');
    if(frame && frame.getAttribute('src') !== lesson.file) frame.setAttribute('src', lesson.file);
    const done = isDone(id);
    if($('#lessonCompleteBtn')) $('#lessonCompleteBtn').textContent = done ? '✓ Vista' : 'Marcar vista';
    const related = relatedCount(lesson);
    const sec = (lesson.sections||[]).map((s,i)=>'<span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+(i+1)+'. '+esc(s)+'</span>').join('');
    if($('#lessonQuickMap')) $('#lessonQuickMap').innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Mapa rápido del nodo</p><div class="mt-2 flex flex-wrap gap-2">'+sec+'</div><p class="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">Lectura limpia dentro de la biblioteca. Si el nodo trae práctica propia, queda integrada dentro del material.</p></div><div class="shrink-0 rounded-2xl border border-slate-200 px-4 py-3 text-center dark:border-slate-700"><p class="font-display text-2xl font-extrabold">'+related+'</p><p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">preguntas vinculadas</p></div></div>';
    renderStatsV3515();
    if(!silent) window.renderLearn();
  };

  document.addEventListener('input', e => {
    if(e.target && e.target.id === 'lessonSearch') window.renderLearn();
  });
  document.addEventListener('change', e => {
    if(e.target && e.target.id === 'lessonEjeFilter'){
      if($('#lessonTemaFilter')) $('#lessonTemaFilter').value = '';
      window.renderLearn();
    }
    if(e.target && e.target.id === 'lessonTemaFilter') window.renderLearn();
  });
  document.addEventListener('click', e => {
    const chip = e.target.closest('[data-lesson-eje-chip]');
    if(chip){
      const val = chip.getAttribute('data-lesson-eje-chip') || '';
      if($('#lessonEjeFilter')) $('#lessonEjeFilter').value = val;
      if($('#lessonTemaFilter')) $('#lessonTemaFilter').value = '';
      window.renderLearn();
      return;
    }
    const btn = e.target.closest('[data-lesson-open]');
    if(btn){
      e.preventDefault();
      window.openLesson(btn.getAttribute('data-lesson-open'));
    }
  });

  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { try { window.renderLearn(); } catch(e){ console.warn('[v35.15] learn render failed', e); } }, 250));
})();
