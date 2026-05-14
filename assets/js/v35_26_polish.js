/* === ResidenciAPP v35.26 · Learn minimal + fullscreen + heatmap priorizado + borrado de subrayados ===
   Parche no destructivo: no modifica métricas ni progreso. Solo UI/UX y anotaciones locales del nodo.
*/
(function(){
  if(window.__RESIDENCIAPP_V3526_POLISH__) return;
  window.__RESIDENCIAPP_V3526_POLISH__ = true;

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (s='') => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const safe = (fn, fb=null) => { try { return fn(); } catch(_) { return fb; } };
  const AXIS_WEIGHTS = {
    'Salud de las personas adultas y adultos mayores': 53,
    'Salud del niño, niña y adolescentes': 21,
    'Salud integral de las mujeres': 19,
    'Salud pública': 7
  };

  function lessonTitle(){
    const hero = $('#learnView aside > div:first-child');
    if(hero){
      hero.classList.add('v3526-hero');
      const orb = hero.querySelector('.absolute');
      if(orb) orb.remove();
      const k = hero.querySelector('p');
      if(k) k.textContent = 'Aprender desde 0';
      const h = hero.querySelector('h3');
      if(h) h.textContent = 'Biblioteca simple y ordenada';
      const d = hero.querySelector('p.mt-2');
      if(d) d.textContent = 'Elegí eje, después tema, y recién entonces vas al nodo. Menos ruido visual, más foco.';
    }
    const filterCard = $('#learnView aside > div:nth-child(2)');
    if(filterCard){
      filterCard.classList.add('v3526-filter-card');
      const title = filterCard.querySelector('h4');
      if(title) title.textContent = 'Ruta de estudio';
      const kicker = filterCard.querySelector('p.text-xs');
      if(kicker) kicker.textContent = 'Paso a paso';
      const search = $('#lessonSearch');
      const eje = $('#lessonEjeFilter');
      const tema = $('#lessonTemaFilter');
      if(eje && tema && search){
        const anchor = filterCard.querySelector('.flex.items-center.justify-between.gap-3');
        if(anchor){
          const helperId = 'lessonFilterHelper3526';
          let helper = $('#'+helperId);
          if(!helper){
            helper = document.createElement('p');
            helper.id = helperId;
            helper.className = 'v3526-filter-helper';
            helper.textContent = '1) Elegí un eje · 2) elegí un tema · 3) si querés, buscá por palabra clave.';
            anchor.insertAdjacentElement('afterend', helper);
          }
        }
        if(search.previousElementSibling !== tema){
          tema.insertAdjacentElement('afterend', search);
        }
        if(search.placeholder) search.placeholder = 'Búsqueda opcional';
      }
    }
    const chips = $('#lessonAxisChips');
    if(chips) chips.style.display = 'none';
    $('#learnView')?.classList.add('v3526-learn-minimal');
  }

  function patchLearnInputs(){
    const eje = $('#lessonEjeFilter');
    const tema = $('#lessonTemaFilter');
    const search = $('#lessonSearch');
    if(eje) eje.setAttribute('aria-label', 'Elegir eje');
    if(tema) tema.setAttribute('aria-label', 'Elegir tema');
    if(search) search.setAttribute('aria-label', 'Búsqueda opcional');
  }

  function ensureFullscreenButton(){
    const group = $('#lessonViewer .flex.flex-wrap.gap-2');
    if(!group || $('#lessonFullPageBtn3526')) return;
    const btn = document.createElement('button');
    btn.id = 'lessonFullPageBtn3526';
    btn.type = 'button';
    btn.className = 'rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800';
    btn.textContent = 'Pantalla completa total';
    btn.addEventListener('click', () => window.toggleLessonFullscreen3526());
    group.appendChild(btn);
  }

  window.toggleLessonFullscreen3526 = function(force){
    const viewer = $('#lessonViewer');
    if(!viewer || viewer.classList.contains('hidden')) return;
    const on = typeof force === 'boolean' ? force : !document.body.classList.contains('lesson-fullscreen-3526');
    document.body.classList.toggle('lesson-fullscreen-3526', on);
    const btn = $('#lessonFullPageBtn3526');
    if(btn) btn.textContent = on ? 'Salir con ESC' : 'Pantalla completa total';
    let hint = $('#lessonFullscreenHint3526');
    if(on){
      if(!hint){
        hint = document.createElement('div');
        hint.id = 'lessonFullscreenHint3526';
        hint.className = 'lesson-fullscreen-hint-3526';
        hint.textContent = 'Pantalla completa activada · presioná ESC para salir';
        document.body.appendChild(hint);
      }
    } else {
      hint?.remove();
    }
  };

  document.addEventListener('keydown', ev => {
    if(ev.key === 'Escape' && document.body.classList.contains('lesson-fullscreen-3526')){
      ev.preventDefault();
      window.toggleLessonFullscreen3526(false);
    }
  }, true);

  function attachIframeEraseEnhancer(){
    const frame = $('#lessonFrame');
    if(!frame) return;
    function inject(){
      const doc = safe(() => frame.contentDocument, null);
      if(!doc || !doc.body || doc.getElementById('v3526-erase-style')) return;
      try {
        const style = doc.createElement('style');
        style.id = 'v3526-erase-style';
        style.textContent = `
          .ra-hl{cursor:pointer;position:relative}
          .ra-hl:hover{outline:2px dashed rgba(15,23,42,.38);outline-offset:2px}
          .ra-hl:hover::after{content:'Quitar';position:absolute;left:50%;top:-1.9rem;transform:translateX(-50%);font:700 11px system-ui;background:#111827;color:#fff;padding:.2rem .45rem;border-radius:.5rem;white-space:nowrap;box-shadow:0 10px 24px rgba(15,23,42,.18)}
        `;
        doc.head.appendChild(style);
        const script = doc.createElement('script');
        script.textContent = `(() => {
          if(window.__RESIDENCIAPP_V3526_IFRAME_ERASE__) return;
          window.__RESIDENCIAPP_V3526_IFRAME_ERASE__ = true;
          const key = 'residenciapp.lessonInlineAnnotations.v35_25:' + encodeURIComponent(${JSON.stringify(frame.dataset.lessonId || '')});
          function load(){ try { return Object.assign({highlights:[], notes:[]}, JSON.parse(localStorage.getItem(key) || '{}')); } catch(_) { return {highlights:[], notes:[]}; } }
          function save(d){ try { localStorage.setItem(key, JSON.stringify(d)); } catch(_){} }
          function unwrap(el){ const p = el.parentNode; if(!p) return; while(el.firstChild) p.insertBefore(el.firstChild, el); p.removeChild(el); p.normalize(); }
          document.addEventListener('click', function(ev){
            const hl = ev.target.closest('.ra-hl');
            if(!hl) return;
            ev.preventDefault(); ev.stopPropagation();
            const id = hl.dataset.hlId;
            if(!id) return;
            const data = load();
            data.highlights = (data.highlights || []).filter(h => String(h.id) !== String(id));
            save(data);
            unwrap(hl);
          }, true);
        })();`;
        doc.body.appendChild(script);
      } catch(err){ console.warn('[v35.26] No pude agregar borrado de subrayados', err); }
    }
    if(frame.dataset.v3526EraseBound !== '1'){
      frame.dataset.v3526EraseBound = '1';
      frame.addEventListener('load', () => setTimeout(inject, 120), {once:false});
    }
    inject();
  }

  function sprintStats(){
    const S = safe(() => Array.isArray(SPRINTS) ? SPRINTS : [], []);
    return S.map(sp => {
      const qs = Array.isArray(sp.questions) ? sp.questions : [];
      const total = qs.length;
      let answered = 0, correct = 0;
      qs.forEach(q => {
        const a = safe(() => state.answers?.[q.id], null);
        if(a){
          answered++;
          if(a.selected === q.ans) correct++;
        }
      });
      const coverage = total ? answered / total : 0;
      const accuracy = answered ? Math.round(correct / answered * 100) : null;
      const weight = AXIS_WEIGHTS[sp.eje] || 0;
      const exposure = total * (weight || 1);
      const urgency = exposure * (1 - coverage) * (accuracy === null ? 1.08 : accuracy < 65 ? 1.18 : accuracy < 85 ? 1 : 0.82);
      return {
        id: sp.id,
        eje: sp.eje || 'Sin eje',
        sprint: sp.sprint || sp.id,
        total,
        answered,
        correct,
        coverage,
        coveragePct: Math.round(coverage * 100),
        accuracy,
        pending: Math.max(total - answered, 0),
        weight,
        exposure,
        urgency,
        score: answered ? Math.round((accuracy || 0) * coverage) : 0
      };
    });
  }

  function heatColor(s){
    if(!s.answered) return '#cbd5e1';
    if((s.accuracy || 0) >= 85) return '#059669';
    if((s.accuracy || 0) >= 65) return '#d97706';
    return '#dc2626';
  }

  function axisSummary(rows){
    const map = {};
    rows.forEach(r => {
      const k = r.eje || 'Sin eje';
      const obj = map[k] ||= { eje:k, total:0, answered:0, correct:0, exposure:0, weight:AXIS_WEIGHTS[k] || 0, sprints:0 };
      obj.total += r.total;
      obj.answered += r.answered;
      obj.correct += r.correct;
      obj.exposure += r.exposure;
      obj.sprints += 1;
    });
    return Object.values(map).map(x => ({
      ...x,
      coverage: x.total ? Math.round(x.answered / x.total * 100) : 0,
      accuracy: x.answered ? Math.round(x.correct / x.answered * 100) : null,
      readiness: x.total ? Math.round(((x.answered / x.total) * ((x.answered ? x.correct / x.answered : 0))) * 100) : 0
    })).sort((a,b) => b.total - a.total || (b.weight - a.weight));
  }

  function renderHeatmap3526(){
    const host = $('#v359HeatmapBlock');
    if(!host) return;
    const rows = sprintStats();
    if(!rows.length){ host.innerHTML = ''; return; }
    const axisRows = axisSummary(rows);
    const weightedCoverage = Math.round(axisRows.reduce((acc, a) => acc + a.coverage * (a.weight || 0), 0) / Math.max(1, axisRows.reduce((acc, a) => acc + (a.weight || 0), 0)));
    const redCount = rows.filter(r => r.answered && (r.accuracy || 0) < 65).length;
    const fragileCount = rows.filter(r => r.answered && (r.accuracy || 0) >= 85 && r.coveragePct < 40).length;
    const untouchedHighImpact = rows.filter(r => !r.answered).sort((a,b) => b.exposure - a.exposure)[0];
    const topUrgent = [...rows].sort((a,b) => b.urgency - a.urgency || b.total - a.total).slice(0, 8);
    const weakestAxis = [...axisRows].sort((a,b) => a.readiness - b.readiness || b.total - a.total)[0];

    const metric = (label, value, sub, tone='slate') => `<div class="v3526-metric-card tone-${tone}"><p class="v3526-metric-label">${esc(label)}</p><div class="v3526-metric-value">${esc(value)}</div><p class="v3526-metric-sub">${esc(sub)}</p></div>`;

    const groups = axisRows.map(axis => {
      const list = rows.filter(r => r.eje === axis.eje).sort((a,b) => b.total - a.total || a.sprint.localeCompare(b.sprint));
      const cells = list.map(r => {
        const opacity = r.answered ? Math.max(.38, r.coverage) : .23;
        const title = `${r.sprint} · ${r.total} preguntas · ${r.answered}/${r.total} respondidas · ${r.accuracy === null ? 'sin acierto medible' : r.accuracy + '% de acierto'}`;
        return `<button type="button" class="v3526-heat-cell" title="${esc(title)}" style="background:${heatColor(r)};opacity:${opacity}" onclick="startSprint('${esc(r.id)}','${esc((safe(() => state.method,'preguntas') || 'preguntas'))}')"><span>${esc(String(r.total))}</span></button>`;
      }).join('');
      return `<section class="v3526-axis-block"><div class="v3526-axis-head"><div><p class="v3526-axis-title">${esc(axis.eje)}</p><p class="v3526-axis-sub">${axis.total} preguntas · ${axis.coverage}% cobertura · ${axis.accuracy === null ? 'sin muestra' : axis.accuracy + '% acierto'}</p></div><div class="v3526-axis-badges"><span>${axis.sprints} sprints</span><span>Peso ${axis.weight}%</span></div></div><div class="v3526-heat-grid">${cells}</div></section>`;
    }).join('');

    const ranking = topUrgent.map((r, idx) => {
      const badge = !r.answered ? 'Sin tocar' : (r.accuracy || 0) < 65 ? 'Zona roja' : r.coveragePct < 40 ? 'Baja cobertura' : 'Consolidar';
      return `<div class="v3526-rank-row"><div class="v3526-rank-left"><span class="v3526-rank-num">${idx+1}</span><div><p class="v3526-rank-title">${esc(r.sprint)}</p><p class="v3526-rank-sub">${esc(r.eje)} · ${r.total} preguntas · ${r.answered}/${r.total} respondidas</p></div></div><div class="v3526-rank-right"><span class="v3526-rank-badge">${esc(badge)}</span><strong>${r.accuracy === null ? '—' : r.accuracy + '%'}</strong></div></div>`;
    }).join('');

    host.innerHTML = `
      <section class="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <p class="text-[10px] font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">🗺️ Mapa de cobertura priorizado</p>
            <h3 class="mt-1 font-display text-xl font-extrabold">Geografía de tu conocimiento</h3>
            <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Ahora está ordenado desde lo más preguntado a lo menos preguntado. Cada celda representa un sprint y el número dentro de la celda indica cuántas preguntas tiene. La prioridad real surge de combinar frecuencia del banco, cobertura y acierto.</p>
          </div>
          <div class="v3526-legend">
            <div><span class="dot" style="background:#059669"></span><b>Verde</b>: buen acierto</div>
            <div><span class="dot" style="background:#d97706"></span><b>Ámbar</b>: acierto intermedio</div>
            <div><span class="dot" style="background:#dc2626"></span><b>Rojo</b>: área débil</div>
            <div><span class="dot" style="background:#cbd5e1"></span><b>Gris</b>: todavía sin tocar</div>
            <div class="lg:col-span-2 text-slate-500">La intensidad (opacidad) indica cobertura: más intensa = más porcentaje de ese sprint ya trabajado.</div>
          </div>
        </div>

        <div class="v3526-metric-grid">
          ${metric('Cobertura útil', weightedCoverage + '%', 'Cobertura ponderada por peso real del examen', 'emerald')}
          ${metric('Zonas rojas', String(redCount), 'Sprints tocados con menos de 65% de acierto', redCount ? 'rose' : 'emerald')}
          ${metric('Dominio frágil', String(fragileCount), 'Buen acierto pero todavía con poca cobertura', fragileCount ? 'amber' : 'emerald')}
          ${metric('Eje a priorizar', weakestAxis ? weakestAxis.eje.replace('Salud ','') : '—', weakestAxis ? weakestAxis.readiness + '% de solidez combinada' : 'Sin datos', 'indigo')}
        </div>

        <div class="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.9fr]">
          <div>
            <div class="mb-3 flex items-center justify-between gap-3"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Mapa ordenado por frecuencia</p><p class="text-[11px] font-bold text-slate-500">Tocá una celda para entrar directo a ese sprint.</p></div>
            ${groups}
          </div>
          <aside class="v3526-side-stack">
            <section class="v3526-side-card">
              <p class="v3526-side-kicker">Prioridad inmediata</p>
              <h4>${untouchedHighImpact ? esc(untouchedHighImpact.sprint) : 'Muy bien'}</h4>
              <p>${untouchedHighImpact ? esc(untouchedHighImpact.eje) + ' · ' + untouchedHighImpact.total + ' preguntas todavía sin tocar.' : 'No tenés sprints de alto impacto completamente vírgenes.'}</p>
            </section>
            <section class="v3526-side-card">
              <p class="v3526-side-kicker">Top oportunidades</p>
              <div class="v3526-rank-list">${ranking}</div>
            </section>
          </aside>
        </div>
      </section>`;
  }

  function hookDashboard(){
    const rerender = () => setTimeout(renderHeatmap3526, 90);
    if(typeof window.renderAll === 'function' && !window.renderAll.__v3526Hooked){
      const prev = window.renderAll;
      const wrapped = function(){ const out = prev.apply(this, arguments); rerender(); lessonTitle(); ensureFullscreenButton(); patchLearnInputs(); attachIframeEraseEnhancer(); return out; };
      wrapped.__v3526Hooked = true;
      window.renderAll = wrapped;
    }
    if(typeof window.showView === 'function' && !window.showView.__v3526Hooked){
      const prevShow = window.showView;
      const wrappedShow = function(){ const out = prevShow.apply(this, arguments); const name = arguments[0]; if(name === 'dashboard' || name === 'learn'){ rerender(); setTimeout(() => { lessonTitle(); ensureFullscreenButton(); patchLearnInputs(); attachIframeEraseEnhancer(); }, 90); } return out; };
      wrappedShow.__v3526Hooked = true;
      window.showView = wrappedShow;
    }
  }

  function patchOpenLesson(){
    if(typeof window.openLesson !== 'function' || window.openLesson.__v3526Wrapped) return;
    const prev = window.openLesson;
    const wrapped = function(){
      const out = prev.apply(this, arguments);
      setTimeout(() => {
        lessonTitle();
        ensureFullscreenButton();
        attachIframeEraseEnhancer();
        const hintTarget = $('#lessonQuickMap p.mt-2.text-[11px], #lessonQuickMap p.mt-2');
        if(hintTarget && !hintTarget.textContent.includes('Tocá un subrayado')){
          hintTarget.textContent = 'Seleccioná texto para subrayar o fijar una nota. Tocá un subrayado para quitarlo si fue accidental.';
        }
      }, 120);
      return out;
    };
    wrapped.__v3526Wrapped = true;
    window.openLesson = wrapped;
  }

  function boot(){
    lessonTitle();
    patchLearnInputs();
    ensureFullscreenButton();
    attachIframeEraseEnhancer();
    patchOpenLesson();
    hookDashboard();
    setTimeout(() => { renderHeatmap3526(); lessonTitle(); ensureFullscreenButton(); attachIframeEraseEnhancer(); }, 500);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
