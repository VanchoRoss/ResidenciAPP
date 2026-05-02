/* === ResidenciAPP v34.3 · Capa inteligente: universos, exámenes equilibrados y NeuroPREP operativo === */
(function(){
  if(window.__RESIDENCIAPP_V343__) return;
  window.__RESIDENCIAPP_V343__ = true;

  const V343_EJE_SPECS = [
    {id:'EJE1', label:'Salud pública', weight:0.07, color:'#BA7517', match:'Salud pública'},
    {id:'EJE2', label:'Salud integral de las mujeres', weight:0.19, color:'#D4537E', match:'Salud integral de las mujeres'},
    {id:'EJE3', label:'Salud del niño, niña y adolescentes', weight:0.21, color:'#1D9E75', match:'Salud del niño, niña y adolescentes'},
    {id:'EJE4', label:'Adultos y adultos mayores', weight:0.53, color:'#534AB7', match:'Salud de las personas adultas y adultos mayores'}
  ];

  function v343Norm(s){
    try { return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
    catch { return String(s||'').toLowerCase(); }
  }
  function v343Esc(v){ return typeof esc === 'function' ? esc(v) : String(v ?? '').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function v343Today(){ return typeof todayKey === 'function' ? todayKey() : new Date().toISOString().slice(0,10); }
  function v343Shuffle(arr){ return [...(arr||[])].sort(()=>Math.random()-.5); }
  function v343GroupBy(arr, fn){ return (arr||[]).reduce((acc,x)=>{ const k=fn(x); (acc[k] ||= []).push(x); return acc; },{}); }
  function v343Answered(q){ return typeof answerFor === 'function' ? !!answerFor(q) : !!state?.answers?.[q.id]; }
  function v343SelectedFor(q){ return typeof answerFor === 'function' ? (answerFor(q)?.selected || '') : (state?.answers?.[q.id]?.selected || ''); }
  function v343Correct(q){ const s=v343SelectedFor(q); return !!s && !!q.ans && s===q.ans; }
  function v343EjeSpecForQuestion(q){ const nq=v343Norm(q?.eje); return V343_EJE_SPECS.find(e=>nq.includes(v343Norm(e.match))) || V343_EJE_SPECS[3]; }
  function v343AreaColorForEje(eje){ return (V343_EJE_SPECS.find(e=>v343Norm(eje).includes(v343Norm(e.match))) || {}).color || '#1877d6'; }

  function v343Allocate(total, items, weightFn){
    const rows = (items||[]).filter(Boolean).map((item,idx)=>({item, idx, weight:Math.max(0, Number(weightFn(item)||0))}));
    const wsum = rows.reduce((a,r)=>a+r.weight,0) || rows.length || 1;
    rows.forEach(r=>{ r.raw = total * r.weight / wsum; r.n = Math.floor(r.raw); r.frac = r.raw - r.n; });
    let left = total - rows.reduce((a,r)=>a+r.n,0);
    rows.sort((a,b)=>b.frac-a.frac || b.weight-a.weight);
    for(let i=0; i<rows.length && left>0; i=(i+1)%rows.length){ rows[i].n++; left--; }
    return rows.sort((a,b)=>a.idx-b.idx).map(r=>({item:r.item, n:r.n, raw:r.raw}));
  }

  function v343QuestionPoolForSprint(sprintKey){
    return QUESTIONS.filter(q => String(q.sprint||'') === sprintKey);
  }

  window.previewBalancedExam = function(totalQ=20){
    const ejeAlloc = v343Allocate(totalQ, V343_EJE_SPECS, e=>e.weight);
    return ejeAlloc.map(x=>{
      const qs = QUESTIONS.filter(q=>v343EjeSpecForQuestion(q).id === x.item.id);
      const bySprint = v343GroupBy(qs, q=>q.sprint || q.tema || 'Sin sprint');
      const sprintRows = Object.entries(bySprint).map(([name,list])=>({name, total:list.length}));
      const spAlloc = v343Allocate(x.n, sprintRows, s=>s.total).filter(a=>a.n>0);
      return {id:x.item.id, label:x.item.label, color:x.item.color, weight:x.item.weight, n:x.n, sprints:spAlloc.map(a=>({name:a.item.name, n:a.n, total:a.item.total}))};
    });
  };

  window.buildBalancedExam = function(totalQ=20, opts={}){
    const total = Math.max(1, Number(totalQ)||20);
    const preferUnanswered = opts.preferUnanswered !== false;
    const used = new Set(opts.excludeIds || []);
    const out = [];
    const plan = previewBalancedExam(total);

    plan.forEach(ejePlan=>{
      ejePlan.sprints.forEach(sp=>{
        let pool = v343QuestionPoolForSprint(sp.name).filter(q=>!used.has(q.id));
        if(preferUnanswered){
          const fresh = pool.filter(q=>!v343Answered(q));
          if(fresh.length >= sp.n) pool = fresh;
          else pool = [...fresh, ...pool.filter(q=>v343Answered(q))];
        }
        v343Shuffle(pool).slice(0,sp.n).forEach(q=>{ if(!used.has(q.id)){ used.add(q.id); out.push(q); } });
      });
    });

    if(out.length < total){
      let filler = QUESTIONS.filter(q=>!used.has(q.id));
      if(preferUnanswered){
        const fresh = filler.filter(q=>!v343Answered(q));
        if(fresh.length) filler = [...fresh, ...filler.filter(q=>v343Answered(q))];
      }
      v343Shuffle(filler).slice(0,total-out.length).forEach(q=>{ used.add(q.id); out.push(q); });
    }
    return v343Shuffle(out).slice(0,total);
  };

  window.startBalancedExam = function(totalQ=20, secondsPerQuestion){
    const n = Math.max(1, Number(totalQ)||20);
    const seconds = Number(secondsPerQuestion || (typeof selectedSimSeconds === 'function' ? selectedSimSeconds() : 90) || 90);
    const qs = buildBalancedExam(n, {preferUnanswered:true});
    if(!qs.length) return alert('No hay preguntas disponibles para armar el examen equilibrado.');
    const title = n===20 ? 'Mini examen equilibrado' : n===50 ? 'Examen medio equilibrado' : 'Simulacro completo equilibrado';
    const meta = n+' preguntas · distribución histórica por eje · '+seconds+' segundos por pregunta';
    setSession(qs, title, meta, 'simulacro', false, {mode:'exam', secondsPerQuestion:seconds});
    if(session){ session.examKind='balanced'; session.examSize=n; session.examPlan=previewBalancedExam(n); state.session=session; saveState(); }
  };
  window.startBalancedMini = () => startBalancedExam(20);
  window.startBalancedMedium = () => startBalancedExam(50);
  window.startBalancedFull = () => startBalancedExam(100);

  function v343SprintStats(sp){
    const qs = sp.questions || [];
    const answered = qs.filter(v343Answered).length;
    const correct = qs.filter(v343Correct).length;
    const wrong = answered - correct;
    const acc = answered ? Math.round(correct/answered*100) : 0;
    const errorRate = answered ? Math.round(wrong/answered*100) : 0;
    return {answered, correct, wrong, acc, errorRate, total:qs.length};
  }
  function v343WeakSprints(limit=3){
    return (SPRINTS||[]).map(sp=>Object.assign({sp}, v343SprintStats(sp)))
      .filter(x=>x.answered>=3 && x.errorRate>=40)
      .sort((a,b)=>b.errorRate-a.errorRate || b.wrong-a.wrong)
      .slice(0,limit);
  }
  function v343UncoveredSprints(limit=3){
    return (SPRINTS||[]).map(sp=>Object.assign({sp}, v343SprintStats(sp)))
      .filter(x=>x.answered===0)
      .sort((a,b)=>b.total-a.total)
      .slice(0,limit);
  }
  function v343DueList(){
    if(typeof dueReviewItems === 'function') return dueReviewItems().map(x=>x.q || x.question || x).filter(Boolean);
    if(typeof dueQuestions === 'function') return dueQuestions();
    return [];
  }
  function v343Plan(){
    const weak = v343WeakSprints(3);
    const due = v343DueList();
    const uncovered = v343UncoveredSprints(3);
    const mistakes = Object.keys(state.mistakes||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
    const areas = typeof getPerformanceAreas === 'function' ? getPerformanceAreas() : [];
    return {weak,due,uncovered,mistakes,areas};
  }
  function v343PickMistakesFromWeak(weak, max=8){
    const weakNames = new Set((weak||[]).map(x=>x.sp.sprint));
    const qs = Object.keys(state.mistakes||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean)
      .filter(q=>weakNames.has(q.sprint));
    return v343Shuffle(qs).slice(0,max);
  }
  window.startNeuroToday = function(){
    const p = v343Plan();
    const used = new Set();
    const add = (list, max)=>v343Shuffle(list||[]).forEach(q=>{ if(q && !used.has(q.id) && used.size<max){ used.add(q.id); } });
    add(v343PickMistakesFromWeak(p.weak, 8), 8);
    add(p.due, 14);
    if(p.uncovered[0]) add(p.uncovered[0].sp.questions || [], 20);
    buildBalancedExam(20,{excludeIds:[...used],preferUnanswered:true}).forEach(q=>{ if(used.size<20) used.add(q.id); });
    const qs = [...used].map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean).slice(0,20);
    if(!qs.length) return startBalancedMini();
    setSession(qs, 'NeuroPREP · Sesión recomendada', 'Errores + vencidas + nodo sin cubrir · sin decisiones', 'preguntas', false, {mode:'practice'});
    if(session){ session.neuroprepType='today_recommended'; state.session=session; saveState(); }
  };

  function v343MiniExamCard(){
    const preview = previewBalancedExam(20);
    return '<section id="v343BalancedPanel" class="v34-clean-card mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">'
      + '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Exámenes equilibrados</p><h3 class="font-display text-2xl font-extrabold">Simulacros por distribución real del banco</h3><p class="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">La app arma automáticamente preguntas por eje según el peso histórico: Salud Pública 7%, Mujeres 19%, Niñez 21% y Adultos 53%.</p></div>'
      + '<div class="flex flex-wrap gap-2"><button class="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white" onclick="startBalancedMini()">Mini 20q</button><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startBalancedMedium()">Medio 50q</button><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startBalancedFull()">Completo 100q</button></div></div>'
      + '<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">'+preview.map(r=>'<div class="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"><div class="flex items-center justify-between gap-2"><span class="text-xs font-black uppercase tracking-[.12em] text-slate-400">'+v343Esc(r.id)+'</span><span class="font-display text-2xl font-extrabold" style="color:'+r.color+'">'+r.n+'</span></div><h4 class="mt-1 text-sm font-extrabold">'+v343Esc(r.label)+'</h4><p class="mt-1 text-xs font-semibold text-slate-500">'+Math.round(r.weight*100)+'% del examen</p><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" style="width:'+Math.round(r.weight*100)+'%;background:'+r.color+'"></div></div></div>').join('')+'</div></section>';
  }

  function v343ModePanelHtml(){
    const p = v343Plan();
    const weakText = p.weak.length ? p.weak[0].sp.tema+' · '+p.weak[0].errorRate+'% error' : 'sin zona débil crítica';
    const dueText = p.due.length ? p.due.length+' vencidas' : 'sin vencidas hoy';
    const uncText = p.uncovered.length ? p.uncovered[0].sp.tema : 'sin nodos pendientes grandes';
    return '<section id="v343ModePanel" class="v34-clean-card mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">'
      + '<div class="mb-4"><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Elegí universo</p><h3 class="font-display text-2xl font-extrabold">Libre o NeuroPREP</h3><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Modo Libre: vos decidís. Modo IA: la app analiza errores, vencidas y cobertura y te sirve una sesión cerrada.</p></div>'
      + '<div class="grid gap-3 lg:grid-cols-2"><article class="rounded-[1.6rem] border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50"><p class="text-xs font-black uppercase tracking-[.15em] text-slate-400">Modo Libre</p><h4 class="mt-1 font-display text-2xl font-extrabold">Explorar por sprint</h4><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">Elegís área, tema, sprint, método y timing. Ideal para estudiar un tema puntual.</p><button class="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="startFreeMode()">Abrir selector libre</button></article>'
      + '<article class="rounded-[1.6rem] border border-indigo-200 bg-indigo-50/80 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/25"><p class="text-xs font-black uppercase tracking-[.15em] text-indigo-600 dark:text-indigo-300">Modo IA · NeuroPREP</p><h4 class="mt-1 font-display text-2xl font-extrabold">Tu sesión de hoy</h4><div class="mt-3 space-y-2 text-sm font-bold text-slate-700 dark:text-slate-300"><p>⚠ '+v343Esc(weakText)+' → repaso correctivo</p><p>📅 '+v343Esc(dueText)+' → repaso espaciado</p><p>◻ '+v343Esc(uncText)+' → nodo nuevo</p></div><button class="mt-4 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700" onclick="startNeuroToday()">Empezar sesión recomendada</button></article></div></section>';
  }

  window.startFreeMode = function(){
    showView('dashboard');
    setTimeout(()=>{ const el=document.querySelector('#searchInput'); if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.focus(); } },80);
  };

  function v343InjectDashboardPanels(){
    const dash = document.querySelector('#dashboardView');
    if(!dash) return;
    const firstGrid = dash.querySelector(':scope > .grid');
    if(!firstGrid) return;
    let mode = document.querySelector('#v343ModePanel');
    if(!mode){ firstGrid.insertAdjacentHTML('afterend', v343ModePanelHtml()); }
    else { mode.outerHTML = v343ModePanelHtml(); }
    let exam = document.querySelector('#v343BalancedPanel');
    const afterMode = document.querySelector('#v343ModePanel');
    if(!exam && afterMode){ afterMode.insertAdjacentHTML('afterend', v343MiniExamCard()); }
    else if(exam){ exam.outerHTML = v343MiniExamCard(); }
  }

  function v343RenderNeuroCards(){
    const p = v343Plan();
    const answered = typeof globalAnsweredQuestions === 'function' ? globalAnsweredQuestions().length : Object.keys(state.answers||{}).length;
    const acc = typeof globalAccuracy === 'function' ? globalAccuracy() : 0;
    const stateCard = document.querySelector('#neuroStateCard');
    if(stateCard){
      stateCard.innerHTML = '<p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Perfil de rendimiento</p><h4 class="mt-2 font-display text-3xl font-extrabold">'+(answered<30?'Exploración inicial':acc>=80?'Zona fuerte':'Entrenamiento dirigido')+'</h4><div class="mt-4 grid grid-cols-2 gap-3 text-sm"><div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Precisión</p><p class="text-2xl font-black">'+acc+'%</p></div><div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Cobertura</p><p class="text-2xl font-black">'+answered+'/'+QUESTIONS.length+'</p></div><div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Errores</p><p class="text-2xl font-black">'+p.mistakes.length+'</p></div><div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Vencidas</p><p class="text-2xl font-black">'+p.due.length+'</p></div></div><button class="mt-4 w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white" onclick="startNeuroToday()">Empezar sesión recomendada</button>';
    }
    const rec = document.querySelector('#neuroRecommendation');
    if(rec){
      const weak = p.weak[0];
      const unc = p.uncovered[0];
      rec.innerHTML = '<div class="rounded-3xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20"><p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Tu sesión de hoy</p><h4 class="mt-1 font-display text-2xl font-extrabold">Un botón, sin decidir</h4><div class="mt-4 space-y-3 text-sm font-bold text-slate-700 dark:text-slate-300">'
        + '<div class="rounded-2xl bg-white/75 p-3 dark:bg-slate-900/70">⚠ '+(weak? v343Esc(weak.sp.sprint)+' · '+weak.errorRate+'% de error' : 'Sin sprint con >40% de error todavía')+'</div>'
        + '<div class="rounded-2xl bg-white/75 p-3 dark:bg-slate-900/70">📅 '+p.due.length+' preguntas vencidas para repaso espaciado</div>'
        + '<div class="rounded-2xl bg-white/75 p-3 dark:bg-slate-900/70">◻ '+(unc? v343Esc(unc.sp.sprint)+' sin cubrir' : 'Sin nodos grandes sin cubrir')+'</div>'
        + '</div><button class="mt-4 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700" onclick="startNeuroToday()">Empezar sesión recomendada</button></div>';
    }
    const graph = document.querySelector('#neuroGraph');
    if(graph){
      const rows = (typeof getPerformanceAreas === 'function' ? getPerformanceAreas() : []).map(a=>({label:a.label, acc:a.acc, answered:a.answered,total:a.total,color:a.acc>=80?'emerald':a.acc>=60?'amber':'rose'}));
      graph.innerHTML = '<div class="space-y-3">'+rows.map(r=>'<div><div class="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-[.12em] text-slate-500"><span>'+v343Esc(r.label)+'</span><span>'+(r.answered?r.acc+'%':'sin datos')+' · '+r.answered+'/'+r.total+'</span></div><div class="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full bg-'+r.color+'-500" style="width:'+(r.answered?r.acc:0)+'%"></div></div></div>').join('')+'</div>';
    }
  }

  function v343LibraryChip(q){
    const items = (state.library||[]).filter(it => it && (it.qid===q.id || v343Norm(it.topic||'')===v343Norm(q.sprint||'') || v343Norm(it.topic||'')===v343Norm(q.tema||'')));
    if(!items.length) return '';
    return '<button class="mt-4 mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200" onclick="openQuestionLibrary(\''+v343Esc(q.id)+'\')">📚 Tenés '+items.length+' nota'+(items.length===1?'':'s')+' para este tema</button>';
  }
  window.openQuestionLibrary = function(qid){
    showView('library');
    setTimeout(()=>alert('Abrí Biblioteca personal. Buscá las notas asociadas a la pregunta '+qid+' o al sprint/tema.'),100);
  };

  const __v343QuestionTemplate = questionTemplate;
  questionTemplate = function(q, selected, showExplanation){
    let html = __v343QuestionTemplate(q, selected, showExplanation);
    if(session?.mode !== 'exam' && session?.mode !== 'revenge'){
      const chip = v343LibraryChip(q);
      if(chip && html.includes('<h3 class="font-display')) html = html.replace('<h3 class="font-display', chip+'<h3 class="font-display');
    }
    return html;
  };

  if(typeof lessonCard === 'function'){
    const __v343LessonCard = lessonCard;
    lessonCard = function(lesson){
      const qs = typeof lessonRelatedQuestions === 'function' ? lessonRelatedQuestions(lesson) : [];
      const answered = qs.filter(v343Answered).length;
      const correct = qs.filter(v343Correct).length;
      const acc = answered ? Math.round(correct/answered*100) : 0;
      const coverage = qs.length ? Math.round(answered/qs.length*100) : 0;
      const dominated = answered >= Math.min(5, Math.max(2, Math.ceil(qs.length*.15))) && acc >= 70;
      let html = __v343LessonCard(lesson);
      const tag = dominated ? '✓ Dominado' : answered ? '◑ En práctica' : '◻ Sin ver';
      const cls = dominated ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : answered ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';
      const insert = '<div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div class="flex items-center justify-between gap-2"><span class="rounded-full px-2 py-1 text-[10px] font-black '+cls+'">'+tag+'</span><span class="text-xs font-black text-slate-500">'+coverage+'% leído/resuelto</span></div><div class="mt-2 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-800"><div class="h-full rounded-full '+(dominated?'bg-emerald-500':'bg-amber-500')+'" style="width:'+coverage+'%"></div></div><p class="mt-2 text-[11px] font-bold text-slate-500">Dominado cuando las preguntas relacionadas superan 70% de acierto.</p></div>';
      return html.replace('</button>', insert+'</button>');
    };
  }

  function v343ExamResultsPanel(oldSession){
    if(!oldSession || oldSession.examKind !== 'balanced') return '';
    const ids = oldSession.questions || [];
    const qs = ids.map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
    const byEje = v343GroupBy(qs, q=>v343EjeSpecForQuestion(q).id);
    const rows = V343_EJE_SPECS.map(spec=>{
      const list = byEje[spec.id] || [];
      const answered = list.filter(q=>selectedForScoring(q, oldSession)).length;
      const correct = list.filter(q=>{ const s=selectedForScoring(q, oldSession); return s && s===q.ans; }).length;
      const acc = answered ? Math.round(correct/answered*100) : 0;
      return '<div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"><div class="flex items-center justify-between gap-3"><h4 class="font-display text-lg font-extrabold">'+v343Esc(spec.label)+'</h4><span class="font-display text-2xl font-extrabold" style="color:'+spec.color+'">'+(answered?acc+'%':'—')+'</span></div><p class="mt-1 text-xs font-bold text-slate-500">'+correct+' correctas · '+answered+'/'+list.length+' respondidas</p><div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full" style="width:'+(answered?acc:0)+'%;background:'+spec.color+'"></div></div></div>';
    }).join('');
    return '<section class="mt-6 rounded-[2rem] border border-indigo-200 bg-white p-5 shadow-soft dark:border-indigo-900/60 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Análisis por eje</p><h3 class="mt-1 font-display text-2xl font-extrabold">Resultado del examen equilibrado</h3><div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">'+rows+'</div></section>';
  }
  const __v343FinishSession = finishSession;
  finishSession = function(reason='manual'){
    const old = session ? Object.assign({}, session, {questions:[...(session.questions||[])], selected:Object.assign({}, session.selected||{})}) : null;
    __v343FinishSession(reason);
    const html = v343ExamResultsPanel(old);
    if(html && document.querySelector('#resultsContent')) document.querySelector('#resultsContent').insertAdjacentHTML('beforeend', html);
  };

  const __v343RenderDueTodayHero = typeof renderDueTodayHero === 'function' ? renderDueTodayHero : null;
  if(__v343RenderDueTodayHero){
    renderDueTodayHero = function(){
      __v343RenderDueTodayHero();
      const el = document.querySelector('#dueTodayHero');
      if(el && el.innerHTML){
        el.insertAdjacentHTML('beforeend','<p class="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">Regla v34.3: si acertás una vencida, sale del repaso. Si fallás, vuelve mañana. Si elegís Fácil/Dudosa/Difícil, se programa manualmente.</p>');
      }
    };
  }

  if(typeof v341RepasoAutoMove === 'function'){
    v341RepasoAutoMove = function(id, selected){
      if(!id) return;
      const q = QUESTIONS.find(x=>x.id===id); if(!q) return;
      const ok = q.ans && selected === q.ans;
      state.retention ||= {}; state.scheduled ||= {};
      if(ok){ delete state.scheduled[id]; delete state.retention[id]; }
      else {
        const due = typeof addDays === 'function' ? addDays(1) : v343Today();
        state.retention[id] = Object.assign(state.retention[id]||{}, {id, difficulty:'hard', label:'Difícil', due, intervalDays:1, reviewedAt:Date.now(), updatedAt:Date.now(), tema:q.tema, sprint:q.sprint, eje:q.eje, source:q.source});
        state.scheduled[id] = {id, due, days:1, difficulty:'hard', label:'Difícil', at:Date.now(), reviewedAt:Date.now(), tema:q.tema, sprint:q.sprint, eje:q.eje};
      }
    };
  }

  const __v343ScheduleQuestion = scheduleQuestion;
  scheduleQuestion = function(id, days=3, announce=true){
    __v343ScheduleQuestion(id, days, announce);
    renderDueTodayHero?.();
    renderV34Dashboard?.();
  };

  const __v343RenderReview = renderReview;
  renderReview = function(){
    __v343RenderReview();
    const panels = document.querySelector('#reviewPanels');
    if(panels && !document.querySelector('#v343ReviewHelp')){
      panels.insertAdjacentHTML('afterend','<section id="v343ReviewHelp" class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Cómo funciona el repaso</p><h3 class="mt-1 font-display text-2xl font-extrabold">No se repite lo que ya consolidaste</h3><div class="mt-3 grid gap-3 md:grid-cols-3"><div class="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">✓ Si acertás una vencida, sale del repaso automático.</div><div class="rounded-2xl bg-rose-50 p-3 text-sm font-bold text-rose-800 dark:bg-rose-950/30 dark:text-rose-200">✗ Si fallás, queda como error y vuelve mañana.</div><div class="rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">⚙ Si apretás Fácil/Dudosa/Difícil, vos decidís cuándo vuelve.</div></div></section>');
    }
  };

  const __v343RenderTodayProposalStrip = typeof renderTodayProposalStrip === 'function' ? renderTodayProposalStrip : null;
  if(__v343RenderTodayProposalStrip){
    renderTodayProposalStrip = function(){
      const box = document.querySelector('#todayProposalStrip');
      if(!box) return __v343RenderTodayProposalStrip();
      const p = v343Plan();
      const cards = [
        {k:'IA', t:'NeuroPREP hoy', d:(p.weak[0]?p.weak[0].sp.tema:'Sin zona crítica')+' · '+p.due.length+' vencidas', a:'startNeuroToday()'},
        {k:'20', t:'Mini equilibrado', d:'20 preguntas por distribución real.', a:'startBalancedMini()'},
        {k:'ERR', t:'Revancha', d:p.mistakes.length+' errores activos.', a:p.mistakes.length?'startMistakesRevengeSession()':'showView(\'review\')'}
      ];
      box.innerHTML = cards.map(c=>'<button class="v342-proposal rounded-[1.25rem] border border-slate-200 bg-white/75 p-3 text-left shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800" onclick="'+c.a+'"><span class="inline-grid h-7 min-w-7 place-items-center rounded-xl bg-medical-50 px-2 text-xs font-black text-medical-700 dark:bg-medical-950/50 dark:text-medical-200">'+v343Esc(c.k)+'</span><h4 class="mt-2 font-display text-sm font-extrabold">'+v343Esc(c.t)+'</h4><p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+v343Esc(c.d)+'</p></button>').join('');
    };
  }

  const __v343RenderQuickActions = renderV34QuickActions;
  renderV34QuickActions = function(){
    const box = document.querySelector('#v34QuickActions');
    if(!box) return __v343RenderQuickActions?.();
    const p = v343Plan();
    const actions = [
      ['🧬','NeuroPREP hoy','Una sesión recomendada sin decidir.','startNeuroToday()'],
      ['🧪','Mini 20q','Examen equilibrado corto.','startBalancedMini()'],
      ['⏱️','Medio 50q','Media simulación real.','startBalancedMedium()'],
      ['🏁','Completo 100q','Simulacro equilibrado final.','startBalancedFull()'],
      ['🔁','Repaso inteligente',p.due.length+' vencidas.','showView(\'review\')'],
      ['🧾','Revancha errores',p.mistakes.length+' activos.','startMistakesRevengeSession()'],
      ['🎮','Juegos','Calendario de vacunas.','showView(\'games\')'],
      ['📄','Reporte PDF','Métricas con fecha.','downloadProgressPDF()']
    ];
    box.innerHTML = actions.map(a=>'<button class="v34-action-btn rounded-[1.35rem] border border-slate-200 p-4 text-left dark:border-slate-800" onclick="'+a[3]+'"><div class="text-2xl">'+a[0]+'</div><h4 class="mt-2 font-display text-lg font-extrabold">'+a[1]+'</h4><p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+a[2]+'</p></button>').join('');
  };

  const __v343RenderNeuroprep = renderNeuroprep;
  renderNeuroprep = function(){
    __v343RenderNeuroprep();
    v343RenderNeuroCards();
  };

  const __v343RenderV34Dashboard = renderV34Dashboard;
  renderV34Dashboard = function(){
    __v343RenderV34Dashboard();
    v343InjectDashboardPanels();
    renderTodayProposalStrip?.();
  };

  const __v343ShowView = showView;
  showView = function(name){
    __v343ShowView(name);
    if(name==='dashboard') { v343InjectDashboardPanels(); renderTodayProposalStrip?.(); }
    if(name==='neuroprep') v343RenderNeuroCards();
    if(name==='review') renderReview();
  };

  const __v343RenderAll = renderAll;
  renderAll = function(){
    __v343RenderAll();
    v343InjectDashboardPanels();
    v343RenderNeuroCards();
  };

  // Primera pintura tras cargar esta extensión, porque main.js ya ejecutó init().
  try { renderAll(); if(!document.querySelector('#dashboardView')?.classList.contains('hidden')) v343InjectDashboardPanels(); } catch(e){ console.warn('ResidenciAPP v34.3 init parcial:', e); }
})();
