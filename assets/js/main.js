const DATA = window.RESIDENCIAPP_DATA || {metadata:{}, summary_by_eje:[], summary_by_tema:[], summary_by_sprint:[], questions:[]};
    const QUESTIONS = DATA.questions || [];
    const LESSONS = window.RESIDENCIAPP_LESSONS || [];
    const METHODS = [
      {id:'preguntas', name:'Preguntas ABCD', icon:'✅', tag:'Aplicación', desc:'Responder y justificar. Ideal para entrenar toma de decisiones.'},
      {id:'simulacro', name:'Simulacro', icon:'⏱️', tag:'Presión', desc:'Sin explicación inmediata. Sirve para entrenar rendimiento real.'},
      {id:'flashcard', name:'Flashcard', icon:'🃏', tag:'Recuerdo', desc:'Pregunta al frente, respuesta al dorso. Útil para falladas.'},
      {id:'feynman', name:'Feynman', icon:'🎙️', tag:'Comprensión', desc:'Explicar simple. Ideal para temas nuevos o confusos.'},
      {id:'mapa', name:'Mapa mental', icon:'🗺️', tag:'Estructura', desc:'Ordenar ramas, claves y distractores del tema.'},
      {id:'nemotecnia', name:'Nemotecnia', icon:'🧩', tag:'Memoria', desc:'Crear una frase/imagen absurda para datos aislados.'},
      {id:'errorlog', name:'Error log', icon:'🧾', tag:'Corrección', desc:'Clasificar por qué fallaste: lectura, concepto, razonamiento o trampa.'},
      {id:'repaso', name:'Repaso espaciado', icon:'🔁', tag:'Consolidación', desc:'Programar D1-D3-D7-D21 según dificultad.'},
    ];
    const ERROR_REASONS = [
      {id:'no_sabia', label:'No sabía el tema'},
      {id:'lei_mal', label:'Leí mal el enunciado'},
      {id:'dude_entre_dos', label:'Dudé entre dos opciones'},
      {id:'confundi_diagnosticos', label:'Confundí diagnósticos o conductas'},
      {id:'dato_clave', label:'No detecté el dato clave'},
      {id:'dato_duro', label:'Olvidé un dato duro / criterio'},
      {id:'trampa', label:'Caí en un distractor'},
      {id:'pregunta_dudosa', label:'La pregunta me parece dudosa'}
    ];
    const TRIGGER_WORDS = [
      'súbito','subito','brusca','brusco','postmenopáusica','postmenopausica','embarazo','gestante','puérpera','puerpera','lactante','neonato','recién nacido','recien nacido','adolescente',
      'fiebre','febril','hipotensión','hipotension','taquicardia','bradicardia','disnea','dolor torácico','dolor toracico','opresivo','irradiado','saturación','saturacion',
      'hipokalemia','hipopotasemia','hiperkalemia','hiperpotasemia','microalbuminuria','proteinuria','hematuria','cilindros','plaquetas','anemia','pancitopenia',
      'microcalcificaciones','agrupadas','birads','asc-us','asc-h','hsil','lsil','vph','pap','sangrado','metrorragia','amenorrea','prurito','flujo',
      'irreductible','peritonitis','rebote','blumberg','lactato','acidosis','vómitos biliosos','vomitos biliosos','hematoquecia','melena','ictericia','ascitis',
      'ecg','st','supradesnivel','fibrilación auricular','fibrilacion auricular','soplo','yugular','pulso paradójico','pulso paradojico','taponamiento','tep','tvp',
      'sibilancias','tiraje','estridor','babeo','cianosis','exantema','petequias','púrpura','purpura','convulsión','convulsion','oliguria','deshidratación','deshidratacion'
    ];
    const $ = (s, root=document) => root.querySelector(s);
    const $$ = (s, root=document) => [...root.querySelectorAll(s)];
    const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
    const norm = (s='') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const label = (s='') => String(s||'Sin clasificar').replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase());
    const todayKey = () => new Date().toISOString().slice(0,10);
    const addDays = (n) => { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };

    function defaultState(){
      return { theme:'', method:'preguntas', answers:{}, mistakes:{}, favorites:{}, scheduled:{}, library:[], daily:{}, session:null, streak:{last:'',count:0}, timing:{totalMs:0, timedAnswers:0, questionTimes:{}}, lessonProgress:{}, currentLessonId:'' };
    }
    let state = loadState();
    let session = null;
    function loadState(){ try { return Object.assign(defaultState(), JSON.parse(localStorage.getItem('residenciapp_integrada_state')||'{}')); } catch { return defaultState(); } }
    function saveState(){ localStorage.setItem('residenciapp_integrada_state', JSON.stringify(state)); }

    function groupBy(arr, keyFn){ return arr.reduce((acc, x)=>{ const k=keyFn(x); (acc[k] ||= []).push(x); return acc; },{}); }
    const allEjes = [...new Set(QUESTIONS.map(q=>q.eje))].sort();
    const SPRINTS = Object.entries(groupBy(QUESTIONS, q => [q.eje,q.tema,q.sprint].join('||'))).map(([key, qs]) => {
      const [eje, tema, sprint] = key.split('||');
      return {id:btoa(unescape(encodeURIComponent(key))).replace(/=+$/,''), key, eje, tema, sprint, total:qs.length, questions:qs};
    }).sort((a,b)=> a.eje.localeCompare(b.eje) || a.tema.localeCompare(b.tema) || a.sprint.localeCompare(b.sprint));

    const SOURCE_LABELS = { clinica:'Clínica', cirugia:'Cirugía', gineco:'Gineco-Obstetricia', pediatria:'Pediatría' };
    const SOURCE_ORDER = ['clinica','cirugia','gineco','pediatria'];
    function sourceLabel(src){ return SOURCE_LABELS[src] || label(src || 'Sin fuente'); }
    function areaLightClasses(acc, answered){
      if(!answered) return 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';
      if(acc > 85) return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300';
      if(acc >= 60) return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300';
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300';
    }
    function areaBarClasses(acc, answered){
      if(!answered) return 'bg-slate-300 dark:bg-slate-700';
      if(acc > 85) return 'bg-emerald-500';
      if(acc >= 60) return 'bg-amber-500';
      return 'bg-rose-500';
    }
    function areaStatusText(acc, answered){
      if(!answered) return 'Sin datos';
      if(acc > 85) return 'Verde';
      if(acc >= 60) return 'Amarillo';
      return 'Rojo';
    }
    function formatDuration(ms){
      if(!ms || !isFinite(ms)) return '—';
      const sec = Math.round(ms/1000);
      if(sec < 60) return sec+' s';
      const m = Math.floor(sec/60); const s = sec%60;
      return m+' min '+String(s).padStart(2,'0')+' s';
    }
    function globalAnsweredQuestions(){ return QUESTIONS.filter(q=>answerFor(q)); }
    function globalCorrectCount(){ return QUESTIONS.filter(q=>isCorrect(q)).length; }
    function globalAccuracy(){ const answered=globalAnsweredQuestions().length; return answered ? Math.round(globalCorrectCount()/answered*100) : 0; }
    function averageQuestionTime(){ const t=state.timing || {}; return t.timedAnswers ? Math.round(t.totalMs/t.timedAnswers) : 0; }
    function getPerformanceAreas(){
      const sources = [...new Set(QUESTIONS.map(q=>q.source || 'sin_fuente'))];
      const ordered = [...SOURCE_ORDER.filter(s=>sources.includes(s)), ...sources.filter(s=>!SOURCE_ORDER.includes(s)).sort()];
      return ordered.map(src=>{
        const qs = QUESTIONS.filter(q=> (q.source || 'sin_fuente') === src);
        const answered = qs.filter(q=>answerFor(q)).length;
        const correct = qs.filter(q=>isCorrect(q)).length;
        const acc = answered ? Math.round(correct/answered*100) : 0;
        return {src, label:sourceLabel(src), total:qs.length, answered, correct, acc};
      });
    }
    function recordQuestionTiming(qid){
      if(!session || !qid) return;
      const start = session.questionStartedAt || Date.now();
      let elapsed = Date.now() - start;
      if(!isFinite(elapsed) || elapsed < 1000) elapsed = 1000;
      elapsed = Math.min(elapsed, 15 * 60 * 1000);
      state.timing ||= {totalMs:0, timedAnswers:0, questionTimes:{}};
      state.timing.totalMs = (state.timing.totalMs || 0) + elapsed;
      state.timing.timedAnswers = (state.timing.timedAnswers || 0) + 1;
      state.timing.questionTimes ||= {};
      (state.timing.questionTimes[qid] ||= []).push(elapsed);
    }
    function startQuestionTimer(q){
      if(!session || !q) return;
      const selected = session.selected?.[q.id] || answerFor(q)?.selected || '';
      if(selected) return;
      if(session.activeQuestionId !== q.id){
        session.activeQuestionId = q.id;
        session.questionStartedAt = Date.now();
        state.session = session;
        saveState();
      }
    }
    function renderPerformancePanel(){
      const panel = $('#performancePanel');
      if(!panel) return;
      const answered = globalAnsweredQuestions().length;
      const correct = globalCorrectCount();
      const acc = globalAccuracy();
      const avg = averageQuestionTime();
      const areas = getPerformanceAreas();
      panel.innerHTML = '<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">'
        + '<div class="min-w-0"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Panel de rendimiento</p><h3 class="mt-1 font-display text-2xl font-extrabold">Semáforo + métricas en tiempo real</h3><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Las estadísticas quedan guardadas en este navegador con localStorage.</p></div>'
        + '<div class="grid gap-3 sm:grid-cols-2 xl:w-[420px]">'
        + '<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Acierto global</p><p class="mt-1 font-display text-4xl font-extrabold">'+acc+'%</p><p class="text-xs font-bold text-slate-500 dark:text-slate-400">'+correct+' / '+answered+' respondidas</p></div>'
        + '<div class="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Tiempo promedio</p><p class="mt-1 font-display text-4xl font-extrabold">'+formatDuration(avg)+'</p><p class="text-xs font-bold text-slate-500 dark:text-slate-400">'+((state.timing&&state.timing.timedAnswers)||0)+' respuestas medidas</p></div>'
        + '</div></div>'
        + '<div class="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">'+areas.map(a=>{
            const width = a.answered ? a.acc : 0;
            const chip = areaLightClasses(a.acc, a.answered);
            const bar = areaBarClasses(a.acc, a.answered);
            return '<div class="performance-chip rounded-3xl border p-4 '+chip+'"><div class="flex items-start justify-between gap-3"><div><p class="text-xs font-black uppercase tracking-[.14em] opacity-70">'+areaStatusText(a.acc,a.answered)+'</p><h4 class="mt-1 font-display text-lg font-extrabold">'+esc(a.label)+'</h4></div><p class="font-display text-3xl font-extrabold">'+(a.answered?a.acc+'%':'—')+'</p></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-950/60"><div class="h-full rounded-full '+bar+'" style="width:'+width+'%"></div></div><p class="mt-2 text-xs font-bold opacity-80">'+a.correct+' correctas · '+a.answered+' respondidas de '+a.total+'</p></div>';
          }).join('')+'</div>';
    }

    function answerFor(q){ return state.answers[q.id]; }
    function isCorrect(q){ return answerFor(q)?.selected === q.ans && !!q.ans; }
    function sprintStats(sp){
      const answered = sp.questions.filter(q=>answerFor(q)).length;
      const correct = sp.questions.filter(q=>isCorrect(q)).length;
      const pct = sp.total ? Math.round(answered/sp.total*100) : 0;
      const acc = answered ? Math.round(correct/answered*100) : 0;
      return {answered, correct, pct, acc};
    }
    function searchTokens(raw=''){
      return norm(raw).split(/\s+/).map(t=>t.trim()).filter(Boolean);
    }
    function sprintSearchHaystack(sp){
      const questionText = sp.questions.map(q => [q.q, q.year, q.source, q.image_reference, Object.values(q.opts||{}).join(' ')].join(' ')).join(' ');
      return norm([sp.eje, sp.tema, sp.sprint, sp.total, questionText].join(' '));
    }
    function sprintMatchesSearch(sp, rawQuery){
      const tokens = searchTokens(rawQuery);
      if(!tokens.length) return true;
      const haystack = sprintSearchHaystack(sp);
      return tokens.every(token => haystack.includes(token));
    }
    function sprintMatchPreview(sp, rawQuery){
      const tokens = searchTokens(rawQuery);
      if(!tokens.length) return '';
      const hit = sp.questions.find(q => {
        const hay = norm([q.q, Object.values(q.opts||{}).join(' '), q.year, q.source].join(' '));
        return tokens.every(token => hay.includes(token));
      });
      if(!hit) return '';
      const text = String(hit.q || '');
      return text.length > 135 ? text.slice(0,132).trim()+'…' : text;
    }
    function highlightSearchPreview(text, rawQuery){
      let safe = esc(text);
      const tokens = searchTokens(rawQuery).filter(t=>t.length>=3).slice(0,4);
      tokens.forEach(token => {
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('('+escaped+')','ig');
        safe = safe.replace(re, '<mark class="rounded bg-yellow-200 px-1 font-black text-slate-900">$1</mark>');
      });
      return safe;
    }
    function renderSearchStatus(list, rawQuery){
      const box = $('#searchLiveResults');
      if(!box) return;
      const query = String(rawQuery||'').trim();
      if(!query){ box.innerHTML=''; return; }
      const top = list.slice(0,4).map(sp => '<button class="rounded-full border border-medical-100 bg-white px-3 py-1 text-[11px] font-black text-medical-700 shadow-sm hover:bg-medical-50 dark:border-medical-900/60 dark:bg-slate-900 dark:text-medical-300 dark:hover:bg-medical-950/30" onclick="startSprint(\''+sp.id+'\', state.method||\'preguntas\')">'+esc(sp.sprint)+'</button>').join('');
      box.innerHTML = '<div class="rounded-2xl border border-medical-100 bg-medical-50/70 p-3 text-xs font-bold leading-5 text-medical-800 dark:border-medical-900/60 dark:bg-medical-950/30 dark:text-medical-200"><div class="flex flex-wrap items-center gap-2"><span>🔎 '+list.length+' resultado'+(list.length===1?'':'s')+' para “'+esc(query)+'”</span>'+top+'</div><p class="mt-1 text-[11px] font-semibold opacity-80">Busca en eje, tema, sprint, enunciados y opciones. Los resultados se actualizan mientras escribís.</p></div>';
    }

    function questionStatus(q){
      const a = answerFor(q); if(!a) return 'pendiente'; if(a.selected === q.ans) return 'correcta'; return 'fallada';
    }

    function initSelects(){
      const methodOpts = METHODS.map(m => '<option value="'+m.id+'">'+m.icon+' '+m.name+'</option>').join('');
      $('#defaultMethod').innerHTML = methodOpts; $('#defaultMethod').value = state.method || 'preguntas';
      $('#methodFilter').innerHTML = methodOpts; $('#methodFilter').value = state.method || 'preguntas';
      $('#sessionMethod').innerHTML = methodOpts;
      $('#defaultMethod').addEventListener('change', e => { state.method=e.target.value; $('#methodFilter').value=e.target.value; saveState(); renderAll(); });
      $('#methodFilter').addEventListener('change', e => { state.method=e.target.value; $('#defaultMethod').value=e.target.value; saveState(); renderAll(); });
      $('#sessionMethod').addEventListener('change', e => { if(session){ session.method=e.target.value; state.session=session; saveState(); renderQuestion(); }});

      $('#ejeFilter').innerHTML = '<option value="">Todos los ejes</option>' + allEjes.map(e => '<option value="'+esc(e)+'">'+esc(e)+'</option>').join('');
      $('#temaFilter').innerHTML = '<option value="">Todos los temas</option>';
      $('#ejeFilter').addEventListener('change', () => { updateTemaFilter(); renderSprints(); });
      $('#temaFilter').addEventListener('change', renderSprints);
      $('#searchInput').addEventListener('input', renderSprints);
      $('#librarySearch').addEventListener('input', renderLibrary);
      if($('#lessonSearch')) $('#lessonSearch').addEventListener('input', renderLearn);
    }
    function updateTemaFilter(){
      const eje = $('#ejeFilter').value;
      const temas = [...new Set(SPRINTS.filter(s => !eje || s.eje===eje).map(s=>s.tema))].sort();
      $('#temaFilter').innerHTML = '<option value="">Todos los temas</option>' + temas.map(t => '<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');
    }

    function renderStats(){
      const answered = Object.keys(state.answers).length;
      const correct = QUESTIONS.filter(q=>isCorrect(q)).length;
      const mistakes = Object.keys(state.mistakes).length;
      const due = dueQuestions().length;
      const acc = answered ? Math.round(correct/answered*100) : 0;
      const items = [
        ['Preguntas', QUESTIONS.length, 'Banco integrado'],
        ['Respondidas', answered, acc+'% precisión'],
        ['Errores activos', mistakes, 'Para error log'],
        ['Repasos vencidos', due, 'D1 · D3 · D7 · D21'],
      ];
      $('#statCards').innerHTML = items.map(([a,b,c]) => '<div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">'+a+'</p><p class="mt-2 font-display text-4xl font-extrabold">'+b+'</p><p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">'+c+'</p></div>').join('');
    }

    function renderSprints(){
      const rawQuery = $('#searchInput').value || '';
      const eje = $('#ejeFilter').value;
      const tema = $('#temaFilter').value;
      let list = SPRINTS.filter(s => (!eje || s.eje===eje) && (!tema || s.tema===tema));
      if(rawQuery.trim()) list = list.filter(s => sprintMatchesSearch(s, rawQuery));
      $('#sprintCount').textContent = list.length+' sprints';
      renderSearchStatus(list, rawQuery);
      $('#sprintGrid').innerHTML = list.map(sp => {
        const st = sprintStats(sp);
        const method = $('#methodFilter').value || state.method || 'preguntas';
        const preview = sprintMatchPreview(sp, rawQuery);
        const previewHtml = preview ? '<div class="mt-3 rounded-2xl bg-medical-50/70 p-3 text-xs font-semibold leading-5 text-medical-800 dark:bg-medical-950/20 dark:text-medical-200"><span class="font-black">Coincidencia:</span> '+highlightSearchPreview(preview, rawQuery)+'</div>' : '';
        return '<article class="rounded-3xl border border-slate-200 p-4 transition hover:border-medical-300 hover:shadow-soft dark:border-slate-800 dark:hover:border-medical-800">\n'
          + '<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate text-xs font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300">'+esc(sp.eje)+'</p><h4 class="mt-1 font-display text-lg font-extrabold leading-6">'+esc(sp.sprint)+'</h4><p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">'+esc(sp.tema)+' · '+sp.total+' preguntas</p></div><div class="rounded-2xl bg-slate-100 px-3 py-2 text-center dark:bg-slate-800"><p class="text-lg font-black">'+st.pct+'%</p><p class="text-[10px] font-black uppercase text-slate-400">avance</p></div></div>'
          + '<div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full bg-medical-600" style="width:'+st.pct+'%"></div></div>'
          + previewHtml
          + '<div class="mt-3 flex flex-wrap items-center justify-between gap-2"><p class="text-xs font-bold text-slate-500 dark:text-slate-400">'+st.answered+'/'+sp.total+' respondidas · '+st.acc+'% acierto</p><div class="flex flex-wrap gap-2"><button class="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="openTopicMethods(\''+sp.id+'\')">Métodos</button><button class="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30" onclick="resetSprintProgress(\''+sp.id+'\')">Reiniciar</button><button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white hover:bg-medical-700" onclick="startSprint(\''+sp.id+'\', \''+method+'\')">Iniciar</button></div></div>'
          + '</article>';
      }).join('') || '<div class="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">No encontré sprints con esos filtros.</div>';
    }

    function clearFilters(){ $('#searchInput').value=''; $('#ejeFilter').value=''; updateTemaFilter(); $('#temaFilter').value=''; renderSprints(); }

    function shuffle(arr){ return [...arr].sort(()=>Math.random()-.5); }
    function setSession(qs, title, meta, method='preguntas', shuffleQs=false){
      const list = shuffleQs ? shuffle(qs) : [...qs];
      session = { questions:list.map(q=>q.id), idx:0, title, meta, method, startedAt:Date.now(), selected:{}, failed:[], correct:0, revealed:false };
      state.session = session; saveState(); showView('session'); renderQuestion();
    }
    function getSessionQuestions(){ return (session?.questions||[]).map(id => QUESTIONS.find(q=>q.id===id)).filter(Boolean); }
    function currentQuestion(){ const arr=getSessionQuestions(); return arr[session?.idx||0]; }
    function startSprint(id, method){ const sp=SPRINTS.find(s=>s.id===id); if(sp) setSession(sp.questions, sp.sprint, sp.tema+' · '+sp.eje, method || state.method, false); }
    function startGlobalSession(){ setSession(QUESTIONS, 'Entrenamiento global', 'Banco completo · '+QUESTIONS.length+' preguntas', state.method || 'preguntas', true); }
    function startGlobalSimulation(){ setSession(QUESTIONS, 'Simulacro global', 'Modo examen · explicación al final', 'simulacro', true); }
    function startMistakesSession(){ const qs=Object.keys(state.mistakes).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean); if(!qs.length) return alert('Todavía no tenés errores registrados.'); setSession(qs, 'Repaso de errores', 'Error log activo', 'errorlog', true); }
    function startFavoritesSession(){ const qs=Object.keys(state.favorites).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean); if(!qs.length) return alert('Todavía no guardaste preguntas favoritas.'); setSession(qs, 'Preguntas favoritas', 'Guardadas para repasar', 'flashcard', false); }
    function startDueSession(){ const qs=dueQuestions(); if(!qs.length) return alert('No tenés repasos vencidos hoy.'); setSession(qs, 'Repasos vencidos', 'Repaso espaciado', 'repaso', false); }
    function resumeOrStart(){ if(state.session){ session=state.session; showView('session'); renderQuestion(); } else showView('session'); }

    function renderQuestion(){
      if(!session){ $('#emptySession').classList.remove('hidden'); $('#sessionContent').classList.add('hidden'); return; }
      $('#emptySession').classList.add('hidden'); $('#sessionContent').classList.remove('hidden');
      const arr=getSessionQuestions(); const q=arr[session.idx]; if(!q){ finishSession(); return; }
      $('#sessionMethod').value = session.method;
      $('#sessionTitle').textContent = session.title;
      $('#sessionMeta').textContent = session.meta;
      const pct = Math.round(((session.idx)/arr.length)*100);
      $('#sessionBar').style.width = pct+'%';
      $('#sessionProgress').textContent = 'Pregunta '+(session.idx+1)+' de '+arr.length+' · Método: '+methodById(session.method).name;
      const selected = session.selected[q.id] || answerFor(q)?.selected || '';
      const answered = !!selected;
      const showExplanation = answered;
      startQuestionTimer(q);
      renderPerformancePanel();
      $('#questionCard').innerHTML = questionTemplate(q, selected, showExplanation);
      renderMethodDock(q);
    }

    function questionTemplate(q, selected, showExplanation){
      const status = questionStatus(q);
      const year = q.year ? 'Año '+q.year : 'Año no detectado';
      const options = ['a','b','c','d'].map(k => {
        const txt = q.opts?.[k]; if(!txt) return '';
        const isSel = selected===k; const isAns = q.ans===k;
        const answered = !!selected;
        let cls = 'border-slate-200 hover:border-medical-300 dark:border-slate-700 dark:hover:border-medical-700';
        if(answered && isAns) cls = 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30';
        else if(answered && isSel && !isAns) cls = 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30';
        return '<label class="choice block cursor-pointer"><input class="sr-only" name="choice" type="radio" value="'+k+'" '+(isSel?'checked':'')+' '+(answered?'disabled':'')+' onchange="selectAnswer(\''+q.id+'\',\''+k+'\')"><div class="rounded-3xl border '+cls+' p-4 transition"><div class="flex gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-black uppercase dark:bg-slate-800">'+k+'</span><p class="text-sm font-semibold leading-6">'+esc(txt)+'</p></div></div></label>';
      }).join('');
      return '<div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div class="flex flex-wrap gap-2"><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">'+esc(q.eje)+'</span><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+esc(q.tema)+'</span><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+esc(year)+'</span></div><span class="text-xs font-black uppercase tracking-[.16em] '+(status==='fallada'?'text-rose-500':status==='correcta'?'text-emerald-500':'text-slate-400')+'">'+status+'</span></div>'
        + '<h3 class="font-display text-2xl font-extrabold leading-tight sm:text-3xl">'+highlightTriggerWords(q.q)+'</h3>'
        + (q.image_reference ? '<div class="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">⚠️ Esta pregunta menciona una imagen/ECG/radiografía. Para uso final conviene adjuntar la imagen original.</div>' : '')
        + '<div class="mt-6 grid gap-3">'+options+'</div>'
        + (selected ? '' : methodInlinePrompt(q))
        + (showExplanation ? explanationTemplate(q, selected) : '')
        + '<div class="mt-6 flex flex-wrap justify-between gap-3"><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" '+(session.idx===0?'disabled':'')+' onclick="prevQuestion()">← Anterior</button><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white hover:bg-medical-700" onclick="nextQuestion()">'+(session.idx===getSessionQuestions().length-1?'Terminar':'Siguiente →')+'</button></div>';
    }
    function methodInlinePrompt(q){
      const m = methodById(session.method);
      if(session.method==='feynman') return '<div class="mt-5 rounded-3xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20"><p class="text-sm font-black text-violet-700 dark:text-violet-300">Antes de elegir: explicá el concepto con palabras simples</p><textarea id="inlineFeynman" class="mt-3 min-h-28 w-full rounded-2xl border border-violet-200 bg-white p-3 text-sm outline-none dark:border-violet-800 dark:bg-slate-950" placeholder="Ej: Esta pregunta se resuelve porque…"></textarea><button class="mt-3 rounded-2xl bg-violet-600 px-4 py-2 text-xs font-black text-white" onclick="saveInlineNote(\'feynman\')">Guardar explicación</button></div>';
      if(session.method==='mapa') return '<div class="mt-5 rounded-3xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/20"><p class="text-sm font-black text-sky-700 dark:text-sky-300">Construí un mini mapa antes de responder</p><textarea id="inlineMap" class="mt-3 min-h-28 w-full rounded-2xl border border-sky-200 bg-white p-3 text-sm outline-none dark:border-sky-800 dark:bg-slate-950" placeholder="Centro: '+esc(q.sprint)+'\nRama 1: diagnóstico\nRama 2: conducta\nRama 3: distractores"></textarea><button class="mt-3 rounded-2xl bg-sky-600 px-4 py-2 text-xs font-black text-white" onclick="saveInlineNote(\'mapa\')">Guardar mapa</button></div>';
      if(session.method==='nemotecnia') return '<div class="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><p class="text-sm font-black text-amber-700 dark:text-amber-300">Dato difícil: inventá una nemotecnia absurda</p><textarea id="inlineMnemonic" class="mt-3 min-h-24 w-full rounded-2xl border border-amber-200 bg-white p-3 text-sm outline-none dark:border-amber-800 dark:bg-slate-950" placeholder="Ej: Para recordar…"></textarea><button class="mt-3 rounded-2xl bg-amber-600 px-4 py-2 text-xs font-black text-white" onclick="saveInlineNote(\'nemotecnia\')">Guardar nemotecnia</button></div>';
      if(session.method==='flashcard') return '<div class="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">🃏 Modo flashcard: intentá responder mentalmente antes de mirar opciones.</div>';
      if(session.method==='repaso') return '<div class="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">🔁 Modo repaso espaciado: al responder, marcá tu dificultad para programar el próximo intervalo.</div>';
      return '';
    }

    function explanationTemplate(q, selected){
      const ok = selected===q.ans;
      const correct = q.ans ? q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'') : 'Sin clave cargada';
      const selectedTxt = selected ? selected.toUpperCase()+') '+(q.opts?.[selected]||'') : 'Sin responder';
      return '<section class="mt-6 rounded-[1.75rem] border '+(ok?'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20':'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20')+' p-5 animate-fadeUp">'
        + '<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] '+(ok?'text-emerald-700 dark:text-emerald-300':'text-rose-700 dark:text-rose-300')+'">'+(ok?'Correcta':'Incorrecta')+'</p><h4 class="mt-1 text-xl font-black">Experiencia de aprendizaje</h4><p class="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Tu respuesta: '+esc(selectedTxt)+'</p></div><button class="rounded-2xl bg-white/80 px-4 py-2 text-xs font-black shadow-sm hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800" onclick="openGoogleForQuestion(\''+q.id+'\')">Copiar pregunta + Consultar IA ↗</button></div>'
        + '<div class="mt-5 grid gap-3">'
        + learningPanelItem('Respuesta correcta', esc(correct), 'emerald')
        + learningPanelItem('Por qué es correcta', whyCorrectHint(q), 'medical')
        + learningPanelItem('Dato clave del enunciado', keyDataHint(q), 'amber')
        + learningPanelItem('Por qué las otras son incorrectas', wrongOptionsHint(q), 'rose')
        + '</div>'
        + (!ok ? errorLogRequiredTemplate(q, selected) : '')
        + '<div class="mt-4 flex flex-wrap gap-2">'+METHODS.filter(m=>['feynman','flashcard','mapa','nemotecnia','errorlog','repaso'].includes(m.id)).map(m => '<button class="rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-xs font-black hover:bg-white dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="openMethodForQuestion(\''+m.id+'\',\''+q.id+'\')">'+m.icon+' '+m.name+'</button>').join('')+'</div>'
        + (session.method==='repaso' ? '<div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',7)">Fácil · +7 días</button><button class="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',3)">Dudosa · +3 días</button><button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',1)">Difícil · mañana</button></div>' : '')
        + '</section>';
    }

    function reasoningHint(q){
      if(!q.ans) return 'Esta pregunta no tiene clave cargada. Conviene revisarla antes de usarla en modo examen.';
      const base = 'Identificá el dato director del enunciado y comparalo contra los distractores. La opción correcta debe explicar la conducta o diagnóstico con menos supuestos adicionales.';
      if(/conducta|tratamiento|manejo|indica|solicita/i.test(q.q)) return 'Es una pregunta de conducta. Primero decidí gravedad/urgencia, luego elegí el estudio o tratamiento que cambia la conducta inmediata.';
      if(/diagn[oó]stico|sospecha/i.test(q.q)) return 'Es una pregunta diagnóstica. Buscá el patrón clínico dominante: edad, tiempo de evolución, signos cardinales y dato de laboratorio/imagen que inclina la balanza.';
      if(/prevalencia|edad|criterio|definici[oó]n/i.test(q.q)) return 'Es una pregunta de dato duro. Conviene convertirla en flashcard o nemotecnia para repaso espaciado.';
      return base;
    }
    function keywordHint(q){
      const words = q.q.match(/[A-Za-zÁÉÍÓÚáéíóúÑñ0-9%]+/g) || [];
      const useful = words.filter(w => w.length>5 && !['paciente','consulta','cuál','cual','siguiente','conducta','presenta','antecedentes'].includes(norm(w))).slice(0,10);
      return useful.length ? useful.join(' · ') : 'Edad, síntoma principal, tiempo de evolución, signos de gravedad, laboratorio e imagen.';
    }

    function escapeRegExp(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
    function highlightTriggerWords(text){
      let out = esc(text || '');
      const words = [...TRIGGER_WORDS].sort((a,b)=>b.length-a.length);
      words.forEach(w => {
        const safe = esc(w);
        const re = new RegExp('(^|[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9])('+escapeRegExp(safe)+')(?=[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9]|$)', 'gi');
        out = out.replace(re, (m, pre, term) => pre+'<strong class="trigger-word">'+term+'</strong>');
      });
      return out;
    }
    function learningPanelItem(title, body, color){
      const palette = {
        emerald:'border-emerald-200 bg-white/80 dark:border-emerald-900/60 dark:bg-slate-900/75',
        medical:'border-medical-200 bg-white/80 dark:border-medical-900/60 dark:bg-slate-900/75',
        amber:'border-amber-200 bg-white/80 dark:border-amber-900/60 dark:bg-slate-900/75',
        rose:'border-rose-200 bg-white/80 dark:border-rose-900/60 dark:bg-slate-900/75'
      };
      return '<div class="rounded-2xl border '+(palette[color]||palette.medical)+' p-4"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">'+esc(title)+'</p><div class="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-300">'+body+'</div></div>';
    }
    function keyDataHint(q){
      const hits = triggerHits(q);
      const base = hits.length ? hits.map(esc).join(' · ') : esc(keywordHint(q));
      return '<p>'+base+'</p><p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Usá este dato como “bisagra”: primero identificá qué cambia la conducta o el diagnóstico, después mirá las opciones.</p>';
    }
    function triggerHits(q){
      const nq = norm(q.q || '');
      return TRIGGER_WORDS.filter(w => nq.includes(norm(w))).slice(0,12);
    }
    function whyCorrectHint(q){
      if(!q.ans) return '<p>Esta pregunta no tiene clave cargada. Marcala para revisar antes de usarla como pregunta de examen.</p>';
      const type = /conducta|tratamiento|manejo|indica|solicita|realizar|conducta a seguir/i.test(q.q) ? 'conducta' : /diagn[oó]stico|sospecha|presuntivo/i.test(q.q) ? 'diagnóstico' : /criterio|definici[oó]n|prevalencia|edad|factor/i.test(q.q) ? 'dato duro' : 'razonamiento clínico';
      const txt = q.opts?.[q.ans] || '';
      return '<p>La clave cargada en el banco es <strong>'+esc(q.ans.toUpperCase()+') '+txt)+'</strong>.</p><p class="mt-2">Tipo de pregunta: <strong>'+type+'</strong>. Para consolidarla, verificá que esta opción sea la que mejor integra el dato clave del enunciado con el tema <strong>'+esc(q.tema)+'</strong> / <strong>'+esc(q.sprint)+'</strong>.</p>';
    }
    function wrongOptionsHint(q){
      const keys = ['a','b','c','d'].filter(k => q.opts?.[k] && k !== q.ans);
      if(!keys.length) return '<p>No hay distractores cargados para analizar.</p>';
      return '<ul class="list-disc space-y-2 pl-5">'+keys.map(k => '<li><strong>'+esc(k.toUpperCase()+')')+'</strong> '+esc(q.opts[k])+'<br><span class="text-xs text-slate-500 dark:text-slate-400">Distractor: no coincide con la clave cargada. Revisá si falla por diagnóstico, conducta, timing, gravedad o por omitir el dato clave.</span></li>').join('')+'</ul>';
    }
    function errorLogRequiredTemplate(q, selected){
      const current = state.mistakes?.[q.id] || {};
      const done = !!current.errorType;
      const options = '<option value="">Seleccioná una razón antes de seguir</option>'+ERROR_REASONS.map(r=>'<option value="'+r.id+'" '+(current.errorType===r.id?'selected':'')+'>'+esc(r.label)+'</option>').join('');
      return '<div id="requiredErrorLog" class="mt-5 rounded-[1.5rem] border border-rose-300 bg-white/85 p-4 error-required dark:border-rose-800 dark:bg-slate-900/85">'
        + '<div class="flex items-start gap-3"><div class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">🧾</div><div class="min-w-0 flex-1"><p class="text-sm font-black text-rose-700 dark:text-rose-300">Error log obligatorio</p><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Para avanzar, clasificá por qué fallaste. Esto convierte el error en una regla de estudio.</p></div></div>'
        + '<select id="requiredErrorType" class="mt-3 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold outline-none dark:border-rose-800 dark:bg-slate-950">'+options+'</select>'
        + '<textarea id="requiredErrorNote" class="mt-3 min-h-24 w-full rounded-2xl border border-rose-200 bg-white p-3 text-sm outline-none dark:border-rose-800 dark:bg-slate-950" placeholder="Opcional: ¿qué dato te confundió? ¿qué regla querés recordar?">'+esc(current.note||'')+'</textarea>'
        + '<div class="mt-3 flex flex-wrap items-center gap-2"><button class="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700" onclick="saveRequiredErrorLog(\''+q.id+'\')">Guardar error log</button>'
        + '<span class="text-xs font-bold '+(done?'text-emerald-600 dark:text-emerald-300':'text-rose-600 dark:text-rose-300')+'">'+(done?'✓ Error clasificado. Ya podés seguir.':'Bloquea “Siguiente” hasta completarlo.')+'</span></div></div>';
    }
    function saveRequiredErrorLog(id){
      const q=QUESTIONS.find(x=>x.id===id); if(!q) return;
      const type=$('#requiredErrorType')?.value || '';
      const note=$('#requiredErrorNote')?.value.trim() || '';
      if(!type) return alert('Elegí una razón del error antes de seguir.');
      const reason = ERROR_REASONS.find(r=>r.id===type)?.label || type;
      state.mistakes[id] = Object.assign(state.mistakes[id]||{id, correct:q.ans, selected:answerFor(q)?.selected||'', at:Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint}, {errorType:type, errorLabel:reason, note});
      addLibrary({type:'error', topic:q.sprint, text:reason+' — '+(note||'Sin nota'), qid:id});
      scheduleQuestion(id, 3, false);
      saveState(); renderQuestion(); renderReview(); renderLibrary();
    }
    function currentNeedsErrorLog(){
      const q=currentQuestion(); if(!q) return false;
      const selected = session?.selected?.[q.id] || answerFor(q)?.selected;
      if(!selected || !q.ans || selected===q.ans) return false;
      return !state.mistakes?.[q.id]?.errorType;
    }

    function selectAnswer(id, selected){
      const q = QUESTIONS.find(x=>x.id===id); if(!q || !session) return;
      const hadStoredAnswer = !!state.answers[id];
      if(!hadStoredAnswer) recordQuestionTiming(id);
      session.selected[id] = selected;
      state.answers[id] = { selected, correct:q.ans, at:Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint, source:q.source, method:session.method };
      if(q.ans && selected !== q.ans){
        const previous = state.mistakes[id] || {};
        state.mistakes[id] = Object.assign({ id, at:Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint }, previous, { selected, correct:q.ans });
        if(!session.failed.includes(id)) session.failed.push(id);
      }
      else { delete state.mistakes[id]; }
      saveState(); renderQuestion(); renderStats(); renderPerformancePanel(); renderReview();
    }
    function prevQuestion(){ if(session && session.idx>0){ session.idx--; state.session=session; saveState(); renderQuestion(); } }
    function nextQuestion(){
      if(!session) return;
      if(currentNeedsErrorLog()){
        alert('Antes de seguir, clasificá el error en el Error Log obligatorio.');
        $('#requiredErrorLog')?.scrollIntoView({behavior:'smooth', block:'center'});
        return;
      }
      if(session.idx >= getSessionQuestions().length-1){ finishSession(); }
      else { session.idx++; state.session=session; saveState(); renderQuestion(); }
    }
    function finishSession(){
      if(!session){ showView('dashboard'); return; }
      const qs = getSessionQuestions();
      const answered = qs.filter(q=>session.selected[q.id] || answerFor(q)).length;
      const correct = qs.filter(q=>{ const s=session.selected[q.id] || answerFor(q)?.selected; return s && s===q.ans; }).length;
      const failed = qs.filter(q=>{ const s=session.selected[q.id] || answerFor(q)?.selected; return s && q.ans && s!==q.ans; });
      const acc = answered ? Math.round(correct/answered*100) : 0;
      state.session = null; saveState(); const old=session; session=null;
      $('#resultsContent').innerHTML = '<div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Sesión finalizada</p><h3 class="mt-1 font-display text-4xl font-extrabold">'+acc+'% de precisión</h3><p class="mt-2 text-slate-600 dark:text-slate-400">'+correct+' correctas sobre '+answered+' respondidas · '+failed.length+' errores para trabajar.</p><div class="mt-6 flex flex-wrap gap-3"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white" onclick="showView(\'dashboard\')">Volver al panel</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesSession()">Repasar errores</button></div></div>'
        + '<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">'+failed.slice(0,24).map(q => flashcardMini(q)).join('')+'</div>';
      showView('results');
    }
    function flashcardMini(q){
      return '<button class="card-flip min-h-64 text-left" data-flipped="false" onclick="this.dataset.flipped=this.dataset.flipped===\'true\'?\'false\':\'true\'"><div class="card-flip-inner relative h-full min-h-64"><div class="card-face absolute inset-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div class="mb-3 flex items-center justify-between"><span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Fallada</span><span class="text-xs text-slate-400">Tocar</span></div><h4 class="text-base font-black leading-6">'+esc(q.q)+'</h4><p class="mt-4 text-xs font-semibold text-slate-500">'+esc(q.sprint)+'</p></div><div class="card-face card-back absolute inset-0 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft dark:border-emerald-900/60 dark:bg-emerald-950/30"><div class="mb-3 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-slate-900 dark:text-emerald-300 w-fit">Respuesta correcta</div><p class="text-lg font-black">'+(q.ans?esc(q.ans.toUpperCase()+') '+q.opts[q.ans]):'Sin clave')+'</p><p class="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">Clasificá el error y programá el repaso.</p></div></div></button>';
    }

    function renderMethodDock(q){
      const active = session?.method || state.method;
      $('#methodDock').innerHTML = '<p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Método activo</p><h4 class="mt-1 font-display text-xl font-extrabold">'+methodById(active).icon+' '+methodById(active).name+'</h4><p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">'+methodById(active).desc+'</p><div class="mt-4 grid grid-cols-2 gap-2">'+METHODS.map(m=>'<button class="rounded-2xl border px-3 py-2 text-xs font-black '+(m.id===active?'border-medical-400 bg-medical-50 text-medical-700 dark:border-medical-800 dark:bg-medical-950/30 dark:text-medical-300':'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')+'" onclick="changeSessionMethod(\''+m.id+'\')">'+m.icon+' '+m.name.split(' ')[0]+'</button>').join('')+'</div>';
    }
    function methodById(id){ return METHODS.find(m=>m.id===id) || METHODS[0]; }
    function changeSessionMethod(id){ if(session){ session.method=id; state.method=id; $('#defaultMethod').value=id; $('#methodFilter').value=id; state.session=session; saveState(); renderQuestion(); } }

    function questionFullText(q){
      const opts = ['a','b','c','d'].map(k => q.opts?.[k] ? k.toUpperCase()+') '+q.opts[k] : '').filter(Boolean).join('\n');
      return [
        'ID: '+q.id,
        'Eje: '+(q.eje||''),
        'Tema: '+(q.tema||''),
        'Sprint: '+(q.sprint||''),
        'Enunciado: '+(q.q||''),
        'Opciones:',
        opts,
        q.ans ? 'Respuesta correcta cargada: '+q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'') : 'Respuesta correcta cargada: sin clave detectada'
      ].join('\n');
    }
    function aiPromptForQuestion(q){
      return [
        'Actuá como docente experto en examen de residencia médica argentina.',
        'Analizá la siguiente pregunta y devolvé la respuesta en este formato exacto:',
        '',
        '1) Por qué es correcta:',
        '2) Datos clave del enunciado:',
        '3) Análisis de distractores: explicá por qué las opciones incorrectas no corresponden.',
        '4) Regla de Oro: una regla corta para recordar en examen.',
        '',
        questionFullText(q)
      ].join('\n');
    }
    function copyTextToClipboard(text){
      if(navigator.clipboard && window.isSecureContext){
        navigator.clipboard.writeText(text).then(()=>showAiToast('Pregunta completa copiada. Pegala en Google IA o en tu IA externa.')).catch(()=>fallbackCopyText(text));
      } else {
        fallbackCopyText(text);
      }
    }
    function fallbackCopyText(text){
      const ta=document.createElement('textarea');
      ta.value=text;
      ta.setAttribute('readonly','');
      ta.style.position='fixed';
      ta.style.left='-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showAiToast('Pregunta completa copiada.'); }
      catch(e){ showAiToast('No se pudo copiar automáticamente.'); }
      ta.remove();
    }
    function showAiToast(message){
      let toast=document.getElementById('aiCopyToast');
      if(!toast){
        toast=document.createElement('div');
        toast.id='aiCopyToast';
        toast.className='ai-toast rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-premium dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
        document.body.appendChild(toast);
      }
      toast.textContent=message;
      toast.classList.add('show');
      clearTimeout(window.__aiToastTimer);
      window.__aiToastTimer=setTimeout(()=>toast.classList.remove('show'),2600);
    }
    function openGoogleForQuestion(id){
      const q=QUESTIONS.find(x=>x.id===id);
      if(!q) return;
      const prompt=aiPromptForQuestion(q);
      copyTextToClipboard(prompt);
      window.open(googleUrl(q), '_blank', 'noopener');
    }
    function openGoogleForCurrent(){ const q=currentQuestion(); if(q) openGoogleForQuestion(q.id); }
    function googleUrl(q){
      const query = aiPromptForQuestion(q);
      return 'https://www.google.com/search?q='+encodeURIComponent(query);
    }

    function openMethodForCurrent(method){ const q=currentQuestion(); if(q) openMethodForQuestion(method,q.id); }
    function openMethodForQuestion(method, id){ const q=QUESTIONS.find(x=>x.id===id); if(!q) return; openMethodModal(method, q); }
    function closeMethodModal(){ $('#methodModal').classList.add('hidden'); $('#methodModal').classList.remove('flex'); }
    function openMethodModal(method, q){
      const m = methodById(method); $('#modalKicker').textContent = q.tema+' · '+q.sprint; $('#modalTitle').textContent = m.icon+' '+m.name; $('#modalBody').innerHTML = modalBody(method,q); $('#methodModal').classList.remove('hidden'); $('#methodModal').classList.add('flex');
    }
    function modalBody(method,q){
      const correct = q.ans ? q.ans.toUpperCase()+') '+q.opts[q.ans] : 'Sin clave cargada';
      const header = '<div class="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/60"><p class="text-sm font-black">Pregunta</p><p class="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">'+esc(q.q)+'</p><p class="mt-3 text-sm font-black text-emerald-600 dark:text-emerald-300">'+esc(correct)+'</p></div>';
      if(method==='flashcard') return header + '<div class="mt-4 card-flip min-h-72" data-flipped="false" onclick="this.dataset.flipped=this.dataset.flipped===\'true\'?\'false\':\'true\'"><div class="card-flip-inner relative min-h-72"><div class="card-face absolute inset-0 rounded-[1.75rem] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Frente</p><h4 class="mt-3 font-display text-2xl font-extrabold">'+esc(q.q)+'</h4><p class="mt-4 text-sm text-slate-500">Tocá para ver respuesta</p></div><div class="card-face card-back absolute inset-0 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20"><p class="text-xs font-black uppercase tracking-[.18em] text-emerald-600">Dorso</p><h4 class="mt-3 text-xl font-black">'+esc(correct)+'</h4><p class="mt-4 text-sm leading-6">'+esc(reasoningHint(q))+'</p></div></div></div><div class="mt-4 flex gap-2"><button class="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',7); closeMethodModal();">La sé · +7 días</button><button class="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',3); closeMethodModal();">Dudosa · +3 días</button><button class="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',1); closeMethodModal();">No la sé · mañana</button></div>';
      if(method==='feynman') return header + noteEditor('feynman', q, 'Explicá esta pregunta como si se la contaras a alguien sin base médica. Evitá jerga. Donde te trabes, marcá el hueco.', 'Mi explicación simple es…');
      if(method==='mapa') return header + noteEditor('mapa', q, 'Construí un mapa mental del tema. Ramas sugeridas: diagnóstico, datos clave, conducta inicial, distractores frecuentes, trampa del examen.', 'Centro: '+q.sprint+'\n1) Diagnóstico/conducta:\n2) Datos clave:\n3) Distractores:\n4) Trampa del examen:');
      if(method==='nemotecnia') return header + noteEditor('nemotecnia', q, 'Inventá una frase, imagen o historia absurda para recordar este dato o criterio.', 'Mi nemotecnia absurda es…');
      if(method==='errorlog') return header + '<div class="mt-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-700"><label class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Tipo de error</label><select id="errorType" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"><option>Falta de conocimiento</option><option>Mala lectura del enunciado</option><option>Razonamiento incorrecto</option><option>Confusión entre dos temas</option><option>Trampa/distractor</option><option>Dato duro olvidado</option></select><textarea id="errorNote" class="mt-3 min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="¿Por qué me equivoqué? ¿Qué regla puedo sacar para no repetirlo?"></textarea><button class="mt-3 rounded-2xl bg-medical-600 px-4 py-3 text-sm font-black text-white" onclick="saveErrorLog(\''+q.id+'\')">Guardar error log</button></div>';
      if(method==='repaso') return header + '<div class="mt-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-700"><p class="text-sm font-black">Programar próximo contacto</p><p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Elegí según dificultad. Lo difícil vuelve antes; lo fácil se aleja.</p><div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',1); closeMethodModal();">Mañana</button><button class="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',3); closeMethodModal();">+3 días</button><button class="rounded-2xl bg-medical-600 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',7); closeMethodModal();">+7 días</button><button class="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',21); closeMethodModal();">+21 días</button></div></div>';
      return header;
    }
    function noteEditor(type,q,help,placeholder){ return '<div class="mt-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-700"><p class="text-sm font-black">'+esc(help)+'</p><textarea id="methodNote" class="mt-3 min-h-44 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-slate-700 dark:bg-slate-950" placeholder="'+esc(placeholder)+'"></textarea><div class="mt-3 flex flex-wrap gap-2"><button class="rounded-2xl bg-medical-600 px-4 py-3 text-sm font-black text-white" onclick="saveMethodNote(\''+type+'\',\''+q.id+'\')">Guardar</button><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="openGoogleForQuestion(\''+q.id+'\')">Copiar pregunta + Consultar IA</button></div></div>'; }

    function saveMethodNote(type, id){ const q=QUESTIONS.find(x=>x.id===id); const text=$('#methodNote').value.trim(); if(!text) return; addLibrary({type, topic:q.sprint, text, qid:id}); closeMethodModal(); renderLibrary(); }
    function saveInlineNote(type){ const q=currentQuestion(); const el = type==='feynman'?$('#inlineFeynman'):type==='mapa'?$('#inlineMap'):$('#inlineMnemonic'); const text=el?.value.trim(); if(!q||!text) return; addLibrary({type, topic:q.sprint, text, qid:q.id}); el.value=''; alert('Guardado en tu biblioteca.'); }
    function saveErrorLog(id){ const q=QUESTIONS.find(x=>x.id===id); const type=$('#errorType').value; const note=$('#errorNote').value.trim(); const reason = ERROR_REASONS.find(r=>r.id===type)?.label || type; state.mistakes[id] = Object.assign(state.mistakes[id]||{id, correct:q.ans, selected:answerFor(q)?.selected||'', at:Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint}, {errorType:type, errorLabel:reason, note}); addLibrary({type:'error', topic:q.sprint, text:reason+' — '+(note||'Sin nota'), qid:id}); scheduleQuestion(id, 3, false); saveState(); closeMethodModal(); renderReview(); renderLibrary(); renderQuestion(); alert('Error guardado y programado para repaso.'); }
    function addLibrary(item){ state.library.unshift(Object.assign({createdAt:Date.now()}, item)); state.library = state.library.slice(0,300); saveState(); }
    function saveLibraryItem(){ const type=$('#libraryType').value; const topic=$('#libraryTopic').value.trim(); const text=$('#libraryText').value.trim(); if(!topic||!text) return alert('Completá tema y texto.'); addLibrary({type, topic, text}); $('#libraryTopic').value=''; $('#libraryText').value=''; renderLibrary(); }
    function renderLibrary(){ const q=norm($('#librarySearch')?.value||''); const list=(state.library||[]).filter(x => !q || norm([x.type,x.topic,x.text].join(' ')).includes(q)); $('#libraryList').innerHTML = list.map((it,i)=>'<article class="rounded-3xl border border-slate-200 p-4 dark:border-slate-700"><div class="flex items-start justify-between gap-3"><div><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+esc(it.type)+'</span><h4 class="mt-2 font-display text-lg font-extrabold">'+esc(it.topic)+'</h4></div><button class="text-rose-500 font-black" onclick="deleteLibraryItem('+i+')">×</button></div><p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">'+esc(it.text)+'</p></article>').join('') || '<div class="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">Todavía no hay recursos guardados.</div>'; }
    function deleteLibraryItem(i){ state.library.splice(i,1); saveState(); renderLibrary(); }

    function scheduleQuestion(id, days=3, announce=true){ const q=QUESTIONS.find(x=>x.id===id); if(!q) return; state.scheduled[id] = {id, due:addDays(days), days, at:Date.now(), tema:q.tema, sprint:q.sprint}; saveState(); renderReview(); if(announce) alert('Repaso programado para '+state.scheduled[id].due); }
    function scheduleCurrentQuestion(){ const q=currentQuestion(); if(q) scheduleQuestion(q.id,3); }
    function dueQuestions(){ const t=todayKey(); return Object.values(state.scheduled||{}).filter(x=>x.due<=t).map(x=>QUESTIONS.find(q=>q.id===x.id)).filter(Boolean); }
    function markCurrentFavorite(){ const q=currentQuestion(); if(!q) return; state.favorites[q.id] = {id:q.id, at:Date.now(), tema:q.tema, sprint:q.sprint}; saveState(); alert('Pregunta guardada como favorita.'); }

    function openTopicMethods(id){
      const sp=SPRINTS.find(s=>s.id===id); if(!sp) return;
      $('#modalKicker').textContent = sp.tema+' · '+sp.eje;
      $('#modalTitle').textContent = 'Métodos para '+sp.sprint;
      $('#modalBody').innerHTML = '<div class="grid gap-3 sm:grid-cols-2">'+METHODS.map(m => '<button class="rounded-3xl border border-slate-200 p-4 text-left hover:border-medical-300 hover:bg-medical-50 dark:border-slate-700 dark:hover:border-medical-800 dark:hover:bg-medical-950/20" onclick="closeMethodModal(); startSprint(\''+sp.id+'\',\''+m.id+'\')"><p class="text-2xl">'+m.icon+'</p><h4 class="mt-2 font-display text-lg font-extrabold">'+m.name+'</h4><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">'+m.desc+'</p></button>').join('')+'</div><div class="mt-4 rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/60"><p class="text-sm font-black">Consejo</p><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Para un sprint completo, empezá con preguntas ABCD o simulacro. Si fallás varias del mismo patrón, pasá a Feynman o mapa mental.</p></div>';
      $('#methodModal').classList.remove('hidden'); $('#methodModal').classList.add('flex');
    }

    function renderReview(){
      const mistakes = Object.keys(state.mistakes).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const due = dueQuestions();
      const fav = Object.keys(state.favorites).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const panel = (title, icon, qs, action) => '<section class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div class="flex items-center justify-between"><div><p class="text-2xl">'+icon+'</p><h4 class="mt-1 font-display text-xl font-extrabold">'+title+'</h4><p class="text-sm font-bold text-slate-500">'+qs.length+' preguntas</p></div><button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="'+action+'">Iniciar</button></div><div class="mt-4 space-y-2">'+qs.slice(0,5).map(q=>'<div class="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 dark:bg-slate-950/60">'+esc(q.q.slice(0,130))+(q.q.length>130?'…':'')+'</div>').join('')+'</div></section>';
      $('#reviewPanels').innerHTML = panel('Errores activos','🧾',mistakes,'startMistakesSession()') + panel('Repasos vencidos','🔁',due,'startDueSession()') + panel('Favoritas','⭐',fav,'startFavoritesSession()');
    }

    const dailyBlocks = [
      ['Codificación activa','60–90 min','Construir desde cero: mapa, metáfora, esquema visual.'],
      ['Simulación clínica','90–120 min','Casos y preguntas tipo examen bajo presión.'],
      ['Repaso espaciado','45–60 min','Recuperar sin mirar: flashcards, falladas y D1-D3-D7-D21.'],
      ['Exposición libre','30–45 min','Videos o lectura rápida como insumo, no como aprendizaje principal.'],
      ['Cierre metacognitivo','10–30 min','Qué aprendí, qué no quedó claro y qué método funcionó.']
    ];
    function renderDailyChecklist(){
      const day = state.daily[todayKey()] || {};
      $('#dailyChecklist').innerHTML = dailyBlocks.map((b,i)=>'<button class="flex w-full gap-3 rounded-3xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 '+(day[i]?'opacity-60':'')+'" onclick="toggleDaily('+i+')"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-2xl '+(day[i]?'bg-medical-600 text-white':'bg-slate-100 dark:bg-slate-800')+' font-black">'+(day[i]?'✓':i+1)+'</span><span><strong class="block font-display text-lg">'+b[0]+'</strong><span class="text-sm font-bold text-medical-600 dark:text-medical-300">'+b[1]+'</span><span class="mt-1 block text-sm text-slate-600 dark:text-slate-400">'+b[2]+'</span></span></button>').join('');
      const done=Object.values(day).filter(Boolean).length; $('#dailyProgress').textContent = done+' / '+dailyBlocks.length+' bloques completados';
    }
    function toggleDaily(i){ const t=todayKey(); state.daily[t] ||= {}; state.daily[t][i] = !state.daily[t][i]; saveState(); renderDailyChecklist(); }
    function resetDailyChecklist(){ state.daily[todayKey()]={}; saveState(); renderDailyChecklist(); }


    function lessonById(id){ return LESSONS.find(l => l.id === id); }
    function lessonProgress(id){ state.lessonProgress ||= {}; return state.lessonProgress[id] || {}; }
    function lessonIsDone(id){ return lessonProgress(id).status === 'done'; }
    function lessonIsSaved(id){ return lessonProgress(id).status === 'saved'; }
    function lessonAccentClasses(accent){
      const map = {blue:'border-medical-200 bg-medical-50 text-medical-700 dark:border-medical-900/60 dark:bg-medical-950/30 dark:text-medical-300',rose:'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',purple:'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/30 dark:text-purple-300',teal:'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/30 dark:text-teal-300',amber:'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',indigo:'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300'};
      return map[accent] || map.blue;
    }
    function lessonMatches(lesson, query){
      const tokens = searchTokens(query);
      if(!tokens.length) return true;
      const hay = norm([lesson.title, lesson.eje, lesson.tema, lesson.subtitle, lesson.description, (lesson.badges||[]).join(' '), (lesson.sections||[]).join(' '), (lesson.terms||[]).join(' ')].join(' '));
      return tokens.every(t => hay.includes(t));
    }
    function lessonRelatedQuestions(lesson){
      const terms = (lesson?.terms || []).map(norm).filter(Boolean);
      if(!terms.length) return [];
      return QUESTIONS.filter(q => {
        const hay = norm([q.eje, q.tema, q.sprint, q.q, q.source, q.year, Object.values(q.opts||{}).join(' ')].join(' '));
        return terms.some(t => t.length > 2 && hay.includes(t));
      });
    }
    function lessonCard(lesson){
      const prog = lessonProgress(lesson.id);
      const done = prog.status === 'done';
      const saved = prog.status === 'saved';
      const current = state.currentLessonId === lesson.id;
      const related = lessonRelatedQuestions(lesson).length;
      const status = done ? 'Vista' : saved ? 'Para repasar' : 'Pendiente';
      const statusClass = done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : saved ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';
      return '<button class="w-full rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-soft '+(current?'border-medical-400 bg-medical-50/80 dark:border-medical-700 dark:bg-medical-950/20':'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50')+'" onclick="openLesson(\''+lesson.id+'\')">'
        + '<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="text-[11px] font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300">'+esc(lesson.eje)+'</p><h4 class="mt-1 font-display text-lg font-extrabold leading-6">'+esc(lesson.title)+'</h4><p class="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">'+esc(lesson.subtitle)+'</p></div><span class="rounded-full px-2 py-1 text-[10px] font-black '+statusClass+'">'+status+'</span></div>'
        + '<p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">'+esc(lesson.description)+'</p>'
        + '<div class="mt-3 flex flex-wrap gap-2">'+(lesson.badges||[]).map(b=>'<span class="rounded-full border px-2 py-1 text-[10px] font-black '+lessonAccentClasses(lesson.accent)+'">'+esc(b)+'</span>').join('')+'</div>'
        + '<p class="mt-3 text-xs font-bold text-slate-500 dark:text-slate-400">'+related+' preguntas relacionadas · '+(lesson.sections||[]).length+' secciones</p>'
        + '</button>';
    }
    function renderLessonStats(){
      if(!$('#lessonStats')) return;
      const total = LESSONS.length;
      const done = LESSONS.filter(l => lessonIsDone(l.id)).length;
      const saved = LESSONS.filter(l => lessonIsSaved(l.id)).length;
      const pct = total ? Math.round(done/total*100) : 0;
      $('#lessonStats').innerHTML = [['Nodos', total, 'disponibles'],['Vistos', done, pct+'% avance'],['Repasar', saved, 'guardados']].map(x=>'<div class="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950/60"><p class="font-display text-2xl font-extrabold">'+x[1]+'</p><p class="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">'+x[0]+'</p><p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">'+x[2]+'</p></div>').join('');
    }
    function renderLearn(){
      if(!$('#learnView')) return;
      renderLessonStats();
      const q = $('#lessonSearch')?.value || '';
      const list = LESSONS.filter(l => lessonMatches(l, q));
      if($('#lessonGrid')) $('#lessonGrid').innerHTML = list.map(lessonCard).join('') || '<div class="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700">No encontré nodos con esa búsqueda.</div>';
      if(state.currentLessonId && lessonById(state.currentLessonId)) openLesson(state.currentLessonId, true);
    }
    function resetLessonFilter(){ if($('#lessonSearch')) $('#lessonSearch').value=''; renderLearn(); }
    function openLesson(id, silent=false){
      const lesson = lessonById(id);
      if(!lesson) return;
      state.currentLessonId = id;
      saveState();
      if($('#lessonEmpty')) $('#lessonEmpty').classList.add('hidden');
      if($('#lessonViewer')) $('#lessonViewer').classList.remove('hidden');
      if($('#lessonViewerTitle')) $('#lessonViewerTitle').textContent = lesson.title;
      if($('#lessonViewerMeta')) $('#lessonViewerMeta').textContent = lesson.tema+' · '+lesson.eje;
      if($('#lessonViewerSub')) $('#lessonViewerSub').textContent = lesson.subtitle;
      const frame = $('#lessonFrame');
      if(frame && frame.getAttribute('src') !== lesson.file) frame.setAttribute('src', lesson.file);
      const related = lessonRelatedQuestions(lesson);
      const done = lessonIsDone(id);
      if($('#lessonCompleteBtn')) $('#lessonCompleteBtn').textContent = done ? '✓ Vista' : 'Marcar vista';
      if($('#lessonQuickMap')) $('#lessonQuickMap').innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Ruta del nodo</p><div class="mt-2 flex flex-wrap gap-2">'+(lesson.sections||[]).map((s,i)=>'<span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+(i+1)+'. '+esc(s)+'</span>').join('')+'</div></div><div class="shrink-0 rounded-2xl border border-slate-200 px-4 py-3 text-center dark:border-slate-700"><p class="font-display text-2xl font-extrabold">'+related.length+'</p><p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">preguntas relacionadas</p></div></div>';
      renderLessonStats();
      if(!silent) renderLearn();
    }
    function markCurrentLessonDone(){
      const id = state.currentLessonId;
      if(!id) return;
      state.lessonProgress ||= {};
      state.lessonProgress[id] = Object.assign({}, state.lessonProgress[id]||{}, {status:'done', completedAt:Date.now()});
      saveState(); renderLearn();
    }
    function saveCurrentLessonForReview(){
      const id = state.currentLessonId;
      const lesson = lessonById(id);
      if(!lesson) return;
      state.lessonProgress ||= {};
      state.lessonProgress[id] = Object.assign({}, state.lessonProgress[id]||{}, {status:'saved', savedAt:Date.now(), nextReview:addDays(3)});
      addLibrary({type:'tema', topic:lesson.title, text:'Nodo tutor guardado para repasar: '+lesson.subtitle, qid:''});
      saveState(); renderLearn(); alert('Nodo guardado para repasar luego.');
    }
    function startCurrentLessonPractice(){
      const lesson = lessonById(state.currentLessonId);
      if(!lesson) return alert('Elegí primero un nodo.');
      startLessonPractice(lesson.id);
    }
    function startLessonPractice(id){
      const lesson = lessonById(id);
      if(!lesson) return;
      const qs = lessonRelatedQuestions(lesson);
      if(!qs.length) return alert('Todavía no encontré preguntas vinculadas a este nodo.');
      setSession(qs, 'Tutor · '+lesson.title, lesson.tema+' · '+qs.length+' preguntas relacionadas', state.method || 'preguntas', true);
    }

    function renderMethods(){
      $('#methodGuide').innerHTML = METHODS.map(m=>'<div class="rounded-3xl border border-slate-200 p-4 dark:border-slate-700"><p class="text-2xl">'+m.icon+'</p><h4 class="mt-2 font-display text-lg font-extrabold">'+m.name+'</h4><p class="text-xs font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300">'+m.tag+'</p><p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">'+m.desc+'</p></div>').join('');
      const techniques = [
        ['Técnica Feynman','Tema nuevo o confuso','Explicá el concepto con palabras simples. Donde te trabás, ahí está el hueco que tenés que cerrar.'],
        ['Metáfora sensorial','Concepto abstracto','Convertí el mecanismo en una imagen concreta: pH como temperatura química, presión oncótica como imán de agua.'],
        ['Nemotecnia absurda','Dato duro o lista','Cuanto más ridícula la imagen, más recordable. Ideal para criterios, escalas y secuencias.'],
        ['Mapa mental desde cero','Tema amplio','No copies mapas: construí uno propio, tapalo y reconstruí de memoria.'],
        ['Repaso espaciado','Consolidación','Día 1, 3, 7 y 21. No releer: recuperar.'],
        ['Activación previa','Antes de estudiar','Antes de abrir el material, escribí todo lo que ya sabés y marcá dudas.']
      ];
      $('#techniqueCards').innerHTML = techniques.map((t,i)=>'<details class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><summary class="cursor-pointer font-display text-xl font-extrabold">'+t[0]+'</summary><p class="mt-2 text-xs font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300">'+t[1]+'</p><p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">'+t[2]+'</p></details>').join('');
    }

    function renderTemario(){
      const byEje = groupBy(SPRINTS, s=>s.eje);
      $('#temarioTree').innerHTML = Object.entries(byEje).map(([eje,sps])=>{
        const byTema=groupBy(sps,s=>s.tema);
        return '<details open class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><summary class="cursor-pointer font-display text-2xl font-extrabold">'+esc(eje)+' <span class="text-sm font-bold text-slate-400">('+sps.reduce((a,s)=>a+s.total,0)+' preguntas)</span></summary><div class="mt-4 grid gap-3">'+Object.entries(byTema).map(([tema,list])=>'<div class="rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/60"><h4 class="font-display text-lg font-extrabold">'+esc(tema)+' <span class="text-xs font-bold text-slate-400">('+list.reduce((a,s)=>a+s.total,0)+')</span></h4><div class="mt-3 flex flex-wrap gap-2">'+list.map(sp=>'<button class="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm hover:bg-medical-50 dark:bg-slate-900 dark:hover:bg-medical-950/40" onclick="startSprint(\''+sp.id+'\', state.method||\'preguntas\')">'+esc(sp.sprint)+' · '+sp.total+'</button>').join('')+'</div></div>').join('')+'</div></details>';
      }).join('');
    }

    function saveStateAndAll(){ saveState(); renderAll(); }
    function renderAll(){ renderStats(); renderPerformancePanel(); updateTemaFilter(); renderSprints(); renderLearn(); renderReview(); renderDailyChecklist(); renderMethods(); renderTemario(); renderLibrary(); }

    function showView(name){
      $$('.view').forEach(v=>v.classList.add('hidden'));
      $('#'+name+'View')?.classList.remove('hidden');
      $$('.navBtn').forEach(b=> b.classList.toggle('bg-medical-50', b.dataset.nav===name));
      $$('.navBtn').forEach(b=> b.classList.toggle('text-medical-700', b.dataset.nav===name));
      const titles={dashboard:'Panel principal',learn:'Aprender desde cero',session:'Sesión activa',results:'Resultados',review:'Repaso inteligente',methods:'Métodos de estudio',temario:'Temario 2026',library:'Biblioteca personal'};
      $('#viewTitle').textContent = titles[name] || 'ResidenciAPP';
      closeMobileMenu(); window.scrollTo({top:0, behavior:'smooth'});
      if(name==='session') renderQuestion(); if(name==='learn') renderLearn(); if(name==='review') renderReview(); if(name==='library') renderLibrary();
    }
    function openMobileMenu(){ $('#sidebar').classList.remove('-translate-x-full'); $('#overlay').classList.remove('hidden'); }
    function closeMobileMenu(){ $('#sidebar').classList.add('-translate-x-full'); $('#overlay').classList.add('hidden'); }
    function applyTheme(theme){
      const dark=theme==='dark';
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.classList.toggle('light', !dark);
      const icon=dark?'☀️':'🌙';
      const label=dark?'Modo claro':'Modo oscuro';
      if($('#themeIcon')) $('#themeIcon').textContent=dark?'☀️':'🌙';
      if($('#themeLabel')) $('#themeLabel').textContent=dark?'Claro':'Oscuro';
      if($('#themeIconTop')) $('#themeIconTop').textContent=icon;
      if($('#themeLabelTop')) $('#themeLabelTop').textContent=label;
      state.theme=theme;
      saveState();
    }



    /* === Advanced Retention, Dynamic Flashcards & Feynman Layer === */
    function ensureAdvancedState(){
      state.retention ||= {};
      state.feynmanNotes ||= {};
      state.mnemonics ||= {};
      state.scheduled ||= {};
      state.library ||= [];
    }
    function difficultyConfig(difficulty){
      const d = String(difficulty||'medium');
      if(['hard','dificil','difícil'].includes(d)) return {days:1, label:'Difícil', color:'rose', ease:1.3};
      if(['easy','facil','fácil'].includes(d)) return {days:7, label:'Fácil', color:'emerald', ease:2.5};
      return {days:3, label:'Dudosa', color:'amber', ease:1.8};
    }
    function markDifficulty(id, difficulty='medium', announce=true){
      ensureAdvancedState();
      const q = QUESTIONS.find(x=>x.id===id); if(!q) return;
      const cfg = difficultyConfig(difficulty);
      const prev = state.retention[id] || {reps:0};
      state.retention[id] = {
        id, difficulty, label:cfg.label, ease:cfg.ease,
        reps:(prev.reps||0)+1,
        due:addDays(cfg.days), intervalDays:cfg.days,
        updatedAt:Date.now(), tema:q.tema, sprint:q.sprint, eje:q.eje, source:q.source
      };
      state.scheduled[id] = {id, due:addDays(cfg.days), days:cfg.days, difficulty, label:cfg.label, at:Date.now(), tema:q.tema, sprint:q.sprint, eje:q.eje};
      saveState(); renderReview(); renderDueTodayHero(); renderAdvancedFlashcards();
      if(announce) alert('Repaso programado: '+cfg.label+' → '+state.scheduled[id].due);
    }
    function dueReviewItems(){
      ensureAdvancedState();
      const t=todayKey();
      const byId = {};
      Object.values(state.scheduled||{}).forEach(x=>{ if(x && x.due<=t) byId[x.id]=x; });
      Object.values(state.retention||{}).forEach(x=>{ if(x && x.due<=t) byId[x.id]=Object.assign(byId[x.id]||{}, x); });
      return Object.values(byId).map(x=>({meta:x, q:QUESTIONS.find(q=>q.id===x.id)})).filter(x=>x.q);
    }
    function dueTopicCount(){ return new Set(dueReviewItems().map(x=>x.q.sprint || x.q.tema)).size; }
    function renderDueTodayHero(){
      ensureAdvancedState();
      const el = $('#dueTodayHero'); if(!el) return;
      const due = dueReviewItems(); const topics = dueTopicCount();
      const label = topics===1 ? 'tema' : 'temas';
      el.innerHTML = '<div class="micro-pop rounded-[1.75rem] border border-medical-200 bg-medical-50/90 p-4 dark:border-medical-900/60 dark:bg-medical-950/30">'
        + '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-medical-700 dark:text-medical-300">Repaso espaciado de hoy</p><h4 class="mt-1 font-display text-2xl font-extrabold">Tenés '+topics+' '+label+' para repasar hoy</h4><p class="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">'+due.length+' preguntas vencidas o programadas según dificultad.</p></div>'
        + '<button class="native-tap rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-medical-700" onclick="startDueSession()">Repasar ahora</button></div></div>';
    }
    function getPersonalMnemonic(q){
      ensureAdvancedState();
      if(state.mnemonics?.[q.id]) return state.mnemonics[q.id];
      const item = (state.library||[]).find(x=>x.qid===q.id && x.type==='nemotecnia');
      return item?.text || '';
    }
    function saveMnemonicForQuestion(id){
      ensureAdvancedState();
      const input = $('#mnemonic_'+id); if(!input) return;
      const text = input.value.trim(); if(!text) return alert('Escribí una nemotecnia primero.');
      const q = QUESTIONS.find(x=>x.id===id); if(!q) return;
      state.mnemonics[id] = text;
      addLibrary({type:'nemotecnia', topic:q.sprint, text, qid:id});
      saveState(); renderAdvancedFlashcards(); renderLibrary();
    }
    function officialKeyData(q){
      const hits = triggerHits(q);
      const correct = q.ans ? q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'') : 'Sin clave cargada';
      return {hits, correct, hint: reasoningHint(q)};
    }
    function dynamicFlashcard(q, tag='Repaso'){
      const kd = officialKeyData(q);
      const mnemonic = getPersonalMnemonic(q);
      const backMnemonic = mnemonic ? '<div class="mt-3 rounded-2xl bg-white/80 p-3 dark:bg-slate-900/80"><p class="text-xs font-black uppercase tracking-[.14em] text-amber-600 dark:text-amber-300">Nemotecnia personal</p><p class="mt-1 whitespace-pre-wrap text-sm font-semibold leading-6">'+esc(mnemonic)+'</p></div>' : '<div class="mt-3 rounded-2xl border border-dashed border-amber-300 p-3 dark:border-amber-800"><p class="text-xs font-black uppercase tracking-[.14em] text-amber-600 dark:text-amber-300">Nemotecnia personal</p><textarea id="mnemonic_'+q.id+'" class="mt-2 min-h-20 w-full rounded-2xl border border-amber-200 bg-white p-3 text-sm outline-none dark:border-amber-800 dark:bg-slate-950" placeholder="Ej: regla, frase absurda o imagen mental para recordar esta pregunta…"></textarea><button class="mt-2 rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white" onclick="event.stopPropagation(); saveMnemonicForQuestion(\''+q.id+'\')">Guardar nemotecnia</button></div>';
      return '<div class="flip-card-3d native-tap" data-flipped="false" onclick="this.dataset.flipped=this.dataset.flipped===\'true\'?\'false\':\'true\'">'
        + '<div class="flip-card-3d-inner relative"><div class="flip-card-3d-face absolute inset-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">'
        + '<div class="mb-3 flex items-center justify-between gap-2"><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">'+esc(tag)+'</span><span class="text-xs font-bold text-slate-400">Tocar para girar</span></div>'
        + '<h4 class="text-base font-black leading-6 sm:text-lg">'+highlightTriggerWords(q.q)+'</h4><p class="mt-4 text-xs font-bold text-slate-500">'+esc(q.tema+' · '+q.sprint)+'</p></div>'
        + '<div class="flip-card-3d-face flip-card-3d-back absolute inset-0 overflow-auto rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft dark:border-emerald-900/60 dark:bg-emerald-950/25">'
        + '<p class="text-xs font-black uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-300">Dato clave</p><p class="mt-2 text-sm font-bold leading-6">'+esc(kd.hits.length?kd.hits.join(' · '):keywordHint(q))+'</p>'
        + '<p class="mt-3 text-xs font-black uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-300">Respuesta</p><p class="mt-1 text-base font-black leading-6">'+esc(kd.correct)+'</p>'+backMnemonic
        + '<div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="event.stopPropagation(); markDifficulty(\''+q.id+'\',\'hard\')">Difícil · mañana</button><button class="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white" onclick="event.stopPropagation(); markDifficulty(\''+q.id+'\',\'medium\')">Dudosa · +3 días</button><button class="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white" onclick="event.stopPropagation(); markDifficulty(\''+q.id+'\',\'easy\')">Fácil · +7 días</button></div>'
        + '</div></div></div>';
    }
    function renderAdvancedFlashcards(){
      ensureAdvancedState();
      const el = $('#advancedFlashcards'); if(!el) return;
      const due = dueReviewItems().map(x=>x.q);
      const mistakeQs = Object.keys(state.mistakes||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const favQs = Object.keys(state.favorites||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const map = new Map();
      [...due, ...mistakeQs, ...favQs].forEach(q=>{ if(q) map.set(q.id,q); });
      const cards = [...map.values()].slice(0,12);
      el.innerHTML = '<div class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Flashcards dinámicas</p><h3 class="font-display text-2xl font-extrabold">Flip 3D: pregunta → dato clave + nemotecnia</h3><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Se alimenta con vencidas, errores y favoritas. Guardá tu nemotecnia personal en el dorso.</p></div><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="showView(\'session\'); startDueSession();">Modo repaso</button></div>'
        + (cards.length ? '<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">'+cards.map((q,i)=>dynamicFlashcard(q, due.some(d=>d.id===q.id)?'Vencida':state.mistakes[q.id]?'Error':'Favorita')).join('')+'</div>' : '<div class="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700">Todavía no hay flashcards dinámicas. Respondé preguntas, marcá favoritas o programá repasos.</div>')
        + '</div>';
    }
    function openFeynmanModalForQuestion(id){
      ensureAdvancedState();
      const q = QUESTIONS.find(x=>x.id===id); if(!q) return;
      window.__feynmanQid = id;
      $('#feynmanKicker').textContent = q.tema+' · '+q.sprint;
      $('#feynmanQuestion').innerHTML = '<p class="text-xs font-black uppercase tracking-[.14em] text-slate-400">Pregunta</p><p class="mt-2">'+highlightTriggerWords(q.q)+'</p>';
      $('#feynmanText').value = state.feynmanNotes[id]?.text || '';
      $('#feynmanOfficial').classList.add('hidden');
      $('#feynmanOfficial').innerHTML = '';
      $('#feynmanModal').classList.remove('hidden'); $('#feynmanModal').classList.add('flex');
      setTimeout(()=>$('#feynmanText')?.focus(), 80);
    }
    function closeFeynmanModal(){ $('#feynmanModal').classList.add('hidden'); $('#feynmanModal').classList.remove('flex'); }
    function finishFeynmanCompare(){
      ensureAdvancedState();
      const id = window.__feynmanQid; const q = QUESTIONS.find(x=>x.id===id); if(!q) return;
      const text = $('#feynmanText').value.trim();
      if(!text) return alert('Primero escribí tu explicación. La idea es recuperar sin mirar.');
      state.feynmanNotes[id] = {id, text, at:Date.now(), tema:q.tema, sprint:q.sprint};
      addLibrary({type:'feynman', topic:q.sprint, text, qid:id});
      saveState(); renderLibrary();
      const correct = q.ans ? q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'') : 'Sin clave cargada';
      $('#feynmanOfficial').innerHTML = '<div class="rounded-[1.75rem] border border-medical-200 bg-medical-50 p-5 animate-fadeUp dark:border-medical-900/60 dark:bg-medical-950/30"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-700 dark:text-medical-300">Explicación oficial para comparar</p><div class="mt-4 grid gap-3">'+learningPanelItem('Respuesta correcta', esc(correct), 'emerald')+learningPanelItem('Dato clave', keyDataHint(q), 'amber')+learningPanelItem('Por qué es correcta', whyCorrectHint(q), 'medical')+'</div><div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'hard\')">Me costó · mañana</button><button class="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'medium\')">Regular · +3 días</button><button class="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'easy\')">Lo expliqué bien · +7 días</button></div></div>';
      $('#feynmanOfficial').classList.remove('hidden');
      $('#feynmanOfficial').scrollIntoView({behavior:'smooth', block:'nearest'});
    }

    const __oldScheduleQuestion = scheduleQuestion;
    scheduleQuestion = function(id, days=3, announce=true){
      let difficulty = days<=1 ? 'hard' : days>=7 ? 'easy' : 'medium';
      ensureAdvancedState();
      const q=QUESTIONS.find(x=>x.id===id);
      if(q){
        state.retention[id] = Object.assign(state.retention[id]||{id,reps:0}, {id, difficulty, label:difficultyConfig(difficulty).label, due:addDays(days), intervalDays:days, updatedAt:Date.now(), tema:q.tema, sprint:q.sprint, eje:q.eje, source:q.source, reps:((state.retention[id]?.reps)||0)+1});
      }
      __oldScheduleQuestion(id, days, false);
      renderDueTodayHero(); renderAdvancedFlashcards(); renderReview();
      if(announce && state.scheduled?.[id]) alert('Repaso programado para '+state.scheduled[id].due);
    };
    const __oldDueQuestions = dueQuestions;
    dueQuestions = function(){ return dueReviewItems().map(x=>x.q); };
    const __oldExplanationTemplate = explanationTemplate;
    explanationTemplate = function(q, selected){
      const base = __oldExplanationTemplate(q, selected);
      const extra = '<div class="mt-5 rounded-[1.5rem] border border-slate-200 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-950/50"><div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Retención avanzada</p><h5 class="mt-1 font-display text-xl font-extrabold">¿Qué tan difícil se sintió?</h5><p class="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">La dificultad programa el próximo repaso: Difícil mañana, Fácil en 7 días.</p></div><button class="native-tap rounded-2xl border border-medical-200 bg-medical-50 px-4 py-3 text-sm font-black text-medical-700 hover:bg-medical-100 dark:border-medical-800 dark:bg-medical-950/30 dark:text-medical-300" onclick="openFeynmanModalForQuestion(\''+q.id+'\')">🎙️ ¿Podés explicarlo?</button></div><div class="mt-4 flex flex-wrap gap-2"><button class="retention-pill rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'hard\')">Difícil · mañana</button><button class="retention-pill rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'medium\')">Dudosa · +3 días</button><button class="retention-pill rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'easy\')">Fácil · +7 días</button></div></div>';
      return base.replace('</section>', extra+'</section>');
    };
    const __oldQuestionTemplate = questionTemplate;
    questionTemplate = function(q, selected, showExplanation){
      let html = __oldQuestionTemplate(q, selected, showExplanation);
      if(!selected){
        html = html.replace('<div class="mt-6 flex flex-wrap justify-between gap-3">', '<div class="mt-5 flex flex-wrap gap-2"><button class="native-tap rounded-2xl border border-medical-200 bg-medical-50 px-4 py-3 text-sm font-black text-medical-700 hover:bg-medical-100 dark:border-medical-800 dark:bg-medical-950/30 dark:text-medical-300" onclick="openFeynmanModalForQuestion(\''+q.id+'\')">🎙️ ¿Podés explicarlo?</button><button class="native-tap rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="openMethodForQuestion(\'flashcard\',\''+q.id+'\')">🃏 Ver como flashcard</button></div><div class="mt-6 flex flex-wrap justify-between gap-3">');
      }
      return html;
    };
    const __oldRenderStats = renderStats;
    renderStats = function(){ __oldRenderStats(); renderDueTodayHero(); };
    const __oldRenderReview = renderReview;
    renderReview = function(){ __oldRenderReview(); renderAdvancedFlashcards(); };
    const __oldRenderAll = renderAll;
    renderAll = function(){ __oldRenderAll(); renderDueTodayHero(); renderAdvancedFlashcards(); };


    /* === ResidenciAPP Collaboration Layer · Bandeja externa sin GitHub ===
       Objetivo: que cualquier usuario pueda aportar explicaciones, bibliografía y reglas sin tocar GitHub.
       El destino recomendado es Google Sheets mediante Google Apps Script.
       Configuración principal: assets/js/config.js → window.RESIDENCIAPP_CONFIG.contributions.endpoint
    */
    const CONTRIBUTION_CONFIG = Object.assign({ mode:'google-sheet', endpoint:'', requireEndpoint:false, allowImages:true, maxImageSizeMB:3 }, (window.RESIDENCIAPP_CONFIG && window.RESIDENCIAPP_CONFIG.contributions) || {});

    const COLLAB_FIELDS = [
      {key:'whyCorrect', title:'Por qué es correcta', placeholder:'Explicá por qué la opción correcta resuelve el caso. Ideal: criterio clínico, conducta, fisiopatología o guía.'},
      {key:'keyData', title:'Datos clave', placeholder:'Marcá los datos gatillo del enunciado: edad, contexto, laboratorio, imagen, tiempo de evolución, signo o síntoma clave.'},
      {key:'distractors', title:'Análisis de distractores', placeholder:'Explicá por qué las otras opciones no corresponden y en qué escenario podrían ser correctas.'},
      {key:'goldenRule', title:'Regla de Oro', placeholder:'Escribí una regla breve tipo examen: “Si ves X, pensá Y / hacé Z”.'},
      {key:'bibliography', title:'Bibliografía / fuente', placeholder:'Pegá la fuente usada: guía, consenso, manual CEAR, bibliografía oficial, página, capítulo o link.'}
    ];

    const CONTRIBUTION_TYPES = [
      ['explicacion_completa','Explicación completa'],
      ['correccion_respuesta','Corrección de respuesta'],
      ['dato_clave','Dato clave'],
      ['bibliografia','Bibliografía'],
      ['nemotecnia','Nemotecnia'],
      ['error_detectado','Error detectado'],
      ['mejora_redaccion','Mejora de redacción']
    ];

    function ensureCollaborationState(){
      state.collaboration ||= { enabled:false, analyses:{}, inbox:{endpoint:''}, outbox:[] };
      state.collaboration.analyses ||= {};
      state.collaboration.inbox ||= {endpoint:''};
      state.collaboration.outbox ||= [];
    }

    function mergeEmbeddedCollaborationData(){
      ensureCollaborationState();
      const tag = document.getElementById('collabdata');
      const embeddedSource = window.RESIDENCIAPP_COLLABDATA || (tag ? JSON.parse(tag.textContent || '{}') : null);
      if(!embeddedSource) return;
      try {
        const embedded = embeddedSource;
        const analyses = embedded.analyses || embedded || {};
        Object.entries(analyses).forEach(([qid, value]) => {
          if(value && typeof value === 'object' && !state.collaboration.analyses[qid]) {
            state.collaboration.analyses[qid] = value;
          }
        });
        saveState();
      } catch(err) { console.warn('No se pudo leer collabdata embebido', err); }
    }

    function toggleCollaborationMode(){
      ensureCollaborationState();
      state.collaboration.enabled = !state.collaboration.enabled;
      saveState();
      renderCollaborationControls();
      if(session) renderQuestion();
      const btn = $('#collabToggleBtn');
      if(btn){ btn.classList.add('collab-pulse'); setTimeout(()=>btn.classList.remove('collab-pulse'), 260); }
    }

    function renderCollaborationControls(){
      ensureCollaborationState();
      const enabled = !!state.collaboration.enabled;
      const text = $('#collabToggleText');
      if(text) text.textContent = enabled ? 'Colaboración Activada' : 'Activar Colaboración';
      const btn = $('#collabToggleBtn');
      if(btn){
        btn.classList.toggle('collab-on', enabled);
        btn.classList.toggle('bg-emerald-50', enabled);
        btn.classList.toggle('text-emerald-700', enabled);
        btn.classList.toggle('dark:bg-emerald-950/30', enabled);
        btn.classList.toggle('dark:text-emerald-300', enabled);
      }
    }

    function getContributionEndpoint(){
      ensureCollaborationState();
      return (state.collaboration.inbox.endpoint || localStorage.getItem('residenciapp_contribution_endpoint') || CONTRIBUTION_CONFIG.endpoint || '').trim();
    }

    function configureContributionInbox(){
      ensureCollaborationState();
      const current = getContributionEndpoint();
      const endpoint = prompt('URL del Web App de Google Apps Script para recibir aportes. Si la dejás vacía, los aportes quedan guardados localmente y se pueden exportar en JSON.', current);
      if(endpoint === null) return;
      state.collaboration.inbox.endpoint = endpoint.trim();
      if(endpoint.trim()) localStorage.setItem('residenciapp_contribution_endpoint', endpoint.trim());
      else localStorage.removeItem('residenciapp_contribution_endpoint');
      saveState();
      alert(endpoint.trim() ? 'Bandeja de aportes configurada en este navegador.' : 'Bandeja desconfigurada. Los aportes quedarán solo en este navegador.');
      if(session) renderQuestion();
    }

    function getCollabAnalysis(id){
      ensureCollaborationState();
      return state.collaboration.analyses[id] || {};
    }

    function saveCollaborativeField(id, field, value){
      ensureCollaborationState();
      const q = QUESTIONS.find(x=>x.id===id);
      const prev = state.collaboration.analyses[id] || {};
      state.collaboration.analyses[id] = Object.assign({}, prev, {
        id,
        updatedAt: new Date().toISOString(),
        eje: q?.eje || prev.eje || '',
        tema: q?.tema || prev.tema || '',
        sprint: q?.sprint || prev.sprint || '',
        source: q?.source || prev.source || '',
        [field]: value
      });
      saveState();
      const stamp = $('#collabSavedStamp_'+id);
      if(stamp) stamp.textContent = 'Guardado localmente · '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
    }



    function saveCollaborativeImage(id, input){
      ensureCollaborationState();
      const file = input && input.files && input.files[0];
      if(!file) return;
      if(!file.type || !file.type.startsWith('image/')){
        input.value = '';
        return alert('Solo se permiten archivos de imagen.');
      }
      const maxMb = Number(CONTRIBUTION_CONFIG.maxImageSizeMB || 3);
      const maxBytes = maxMb * 1024 * 1024;
      if(file.size > maxBytes){
        input.value = '';
        return alert('La imagen pesa '+(file.size/1024/1024).toFixed(1)+' MB. Subí una imagen de hasta '+maxMb+' MB.');
      }
      const reader = new FileReader();
      reader.onload = function(){
        const dataUrl = String(reader.result || '');
        const q = QUESTIONS.find(x=>x.id===id);
        const prev = state.collaboration.analyses[id] || {};
        state.collaboration.analyses[id] = Object.assign({}, prev, {
          id,
          updatedAt: new Date().toISOString(),
          eje: q?.eje || prev.eje || '',
          tema: q?.tema || prev.tema || '',
          sprint: q?.sprint || prev.sprint || '',
          source: q?.source || prev.source || '',
          image: {
            name: file.name,
            mimeType: file.type,
            size: file.size,
            data: dataUrl,
            addedAt: new Date().toISOString()
          }
        });
        saveState();
        renderQuestion();
      };
      reader.readAsDataURL(file);
    }

    function removeCollaborativeImage(id){
      ensureCollaborationState();
      const prev = state.collaboration.analyses[id] || {};
      state.collaboration.analyses[id] = Object.assign({}, prev, { image: null, updatedAt: new Date().toISOString() });
      saveState();
      renderQuestion();
    }

    function imageUploadTemplate(q, saved){
      const needsImage = !!q.image_reference;
      const image = saved.image || null;
      const note = needsImage
        ? 'Esta pregunta menciona imagen/ECG/Rx. Adjuntá la imagen original o una captura clara para completar el banco.'
        : 'Opcional: adjuntá una imagen si ayuda a corregir, explicar o documentar esta pregunta.';
      const preview = image && image.data
        ? '<div class="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950"><img src="'+esc(image.data)+'" alt="Imagen adjunta" class="max-h-72 w-full object-contain bg-slate-50 dark:bg-slate-900"><div class="flex flex-col gap-2 border-t border-slate-200 p-3 text-xs font-bold text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:text-slate-300"><span>📎 '+esc(image.name || 'imagen')+' · '+(((image.size||0)/1024/1024).toFixed(2))+' MB</span><button class="rounded-2xl border border-rose-200 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30" onclick="removeCollaborativeImage(\''+q.id+'\')">Quitar imagen</button></div></div>'
        : '';
      return '<div class="mt-5 rounded-[1.5rem] border '+(needsImage?'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20':'border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-950/30')+' p-4">'
        + '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.15em] '+(needsImage?'text-amber-700 dark:text-amber-300':'text-slate-400')+'">Imagen de la pregunta</p><p class="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">'+note+'</p></div><label class="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-medical-600 px-4 py-3 text-xs font-black text-white shadow-soft hover:bg-medical-700"><input class="sr-only" type="file" accept="image/*" onchange="saveCollaborativeImage(\''+q.id+'\', this)">Subir imagen</label></div>'
        + preview
        + '</div>';
    }

    function hasContributionContent(analysis){
      return COLLAB_FIELDS.some(f => (analysis[f.key]||'').trim()) || !!(analysis.image && analysis.image.data);
    }

    function contributionStatusBadge(saved){
      if(saved?.submittedAt) return '<span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[.12em] text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Enviado</span>';
      if(saved?.pendingUploadAt) return '<span class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-[.12em] text-amber-700 dark:bg-amber-950 dark:text-amber-300">Pendiente local</span>';
      return '<span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black uppercase tracking-[.12em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">Borrador</span>';
    }

    function collaborationPanelTemplate(q){
      ensureCollaborationState();
      if(!state.collaboration.enabled) return '';
      const saved = getCollabAnalysis(q.id);
      const endpoint = getContributionEndpoint();
      const endpointReady = !!endpoint;
      const fields = COLLAB_FIELDS.map(f => '<label class="block"><span class="text-xs font-black uppercase tracking-[.15em] text-slate-400">'+f.title+'</span><textarea class="mt-2 w-full rounded-3xl border border-slate-200 bg-white/90 p-4 text-sm font-semibold leading-6 outline-none transition focus:border-medical-400 dark:border-slate-700 dark:bg-slate-950" placeholder="'+esc(f.placeholder)+'" oninput="saveCollaborativeField(\''+q.id+'\',\''+f.key+'\',this.value)">'+esc(saved[f.key]||'')+'</textarea></label>').join('');
      const typeOptions = CONTRIBUTION_TYPES.map(([value,labelText]) => '<option value="'+value+'" '+((saved.contributionType||'explicacion_completa')===value?'selected':'')+'>'+labelText+'</option>').join('');
      const confidenceOptions = ['Alto','Medio','Bajo'].map(v => '<option value="'+v+'" '+((saved.confidence||'Medio')===v?'selected':'')+'>'+v+'</option>').join('');
      return '<section class="collab-panel mt-6 rounded-[1.75rem] border border-emerald-200 bg-emerald-50/60 p-5 shadow-soft animate-fadeUp dark:border-emerald-900/60 dark:bg-emerald-950/20">'
        + '<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div class="flex flex-wrap items-center gap-2"><p class="text-xs font-black uppercase tracking-[.18em] text-emerald-700 dark:text-emerald-300">Modo Editor / Colaborador</p>'+contributionStatusBadge(saved)+'</div><h4 class="mt-1 font-display text-2xl font-extrabold">Aporte colaborativo para '+esc(q.id)+'</h4><p class="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">Completá la explicación, bibliografía o mejora. Al enviar, el aporte queda en una bandeja externa para revisión, sin pedirle GitHub al usuario.</p></div><div class="flex flex-wrap gap-2"><button class="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300" onclick="configureContributionInbox()">Configurar recepción</button><button class="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-700" onclick="sendContribution(\''+q.id+'\')">Enviar aporte</button></div></div>'
        + '<div class="mt-4 rounded-2xl border '+(endpointReady?'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200':'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200')+' p-3 text-xs font-bold leading-5">'+(endpointReady?'✅ Los aportes se enviarán a la bandeja externa configurada.':'⚠️ Todavía no hay bandeja externa configurada. El aporte se guardará localmente y podrás exportarlo en JSON.')+'</div>'
        + imageUploadTemplate(q, saved)
        + '<div class="mt-5 grid gap-4 lg:grid-cols-2">'+fields+'</div>'
        + '<div class="mt-5 grid gap-3 md:grid-cols-3"><label><span class="text-xs font-black uppercase tracking-[.15em] text-slate-400">Nombre / alias opcional</span><input class="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm font-bold outline-none transition focus:border-medical-400 dark:border-slate-700 dark:bg-slate-950" value="'+esc(saved.contributorName||'')+'" placeholder="Ej: Juan, Dra. M, Anónimo" oninput="saveCollaborativeField(\''+q.id+'\',\'contributorName\',this.value)"></label><label><span class="text-xs font-black uppercase tracking-[.15em] text-slate-400">Tipo de aporte</span><select class="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm font-bold outline-none transition focus:border-medical-400 dark:border-slate-700 dark:bg-slate-950" onchange="saveCollaborativeField(\''+q.id+'\',\'contributionType\',this.value)">'+typeOptions+'</select></label><label><span class="text-xs font-black uppercase tracking-[.15em] text-slate-400">Confianza</span><select class="mt-2 w-full rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm font-bold outline-none transition focus:border-medical-400 dark:border-slate-700 dark:bg-slate-950" onchange="saveCollaborativeField(\''+q.id+'\',\'confidence\',this.value)">'+confidenceOptions+'</select></label></div>'
        + '<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p id="collabSavedStamp_'+q.id+'" class="text-xs font-bold text-slate-500 dark:text-slate-400">'+(saved.updatedAt ? 'Última edición local: '+new Date(saved.updatedAt).toLocaleString('es-AR') : 'Todavía sin edición local')+'</p><div class="flex flex-wrap gap-2"><button class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="copyContributionPrompt(\''+q.id+'\')">Copiar prompt IA</button><button class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="exportContributionDatabase()">Exportar aportes JSON</button></div></div>'
        + '</section>';
    }

    function buildContributionPayload(q, analysis){
      const correct = q.ans ? q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'') : 'Sin clave cargada';
      return {
        submissionId: 'resapp_'+q.id+'_'+Date.now(),
        app: 'ResidenciAPP',
        schemaVersion: 2,
        createdAt: new Date().toISOString(),
        status: 'pendiente',
        question: {
          id: q.id,
          source: q.source || '',
          sourceLabel: sourceLabel(q.source),
          year: q.year || '',
          eje: q.eje || '',
          tema: q.tema || '',
          sprint: q.sprint || '',
          text: q.q || '',
          options: q.opts || {},
          answer: q.ans || '',
          correctAnswerText: correct
        },
        contribution: {
          whyCorrect: analysis.whyCorrect || '',
          keyData: analysis.keyData || '',
          distractors: analysis.distractors || '',
          goldenRule: analysis.goldenRule || '',
          bibliography: analysis.bibliography || '',
          contributorName: analysis.contributorName || '',
          contributionType: analysis.contributionType || 'explicacion_completa',
          confidence: analysis.confidence || 'Medio',
          image: analysis.image || null
        },
        userContext: {
          userAgent: navigator.userAgent,
          url: location.href
        }
      };
    }

    async function sendContribution(id){
      ensureCollaborationState();
      const q = QUESTIONS.find(x=>x.id===id);
      if(!q) return alert('No encontré la pregunta.');
      const analysis = getCollabAnalysis(id);
      if(!hasContributionContent(analysis)) return alert('Completá al menos uno de los campos colaborativos antes de enviar.');
      const payload = buildContributionPayload(q, analysis);
      const endpoint = getContributionEndpoint();
      state.collaboration.analyses[id] = Object.assign({}, analysis, {lastPayload: payload, updatedAt: new Date().toISOString()});
      state.collaboration.outbox ||= [];
      if(!endpoint){
        state.collaboration.analyses[id].pendingUploadAt = new Date().toISOString();
        state.collaboration.outbox.unshift(payload);
        state.collaboration.outbox = state.collaboration.outbox.slice(0, 300);
        saveState();
        renderQuestion();
        return alert('Aporte guardado localmente. Falta configurar la bandeja externa. Podés exportar los aportes en JSON.');
      }
      try {
        await fetch(endpoint, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        state.collaboration.analyses[id] = Object.assign({}, analysis, {submittedAt: new Date().toISOString(), pendingUploadAt: '', lastPayload: payload});
        saveState();
        renderQuestion();
        alert('¡Gracias! Tu aporte fue enviado para revisión.');
      } catch(err){
        state.collaboration.analyses[id].pendingUploadAt = new Date().toISOString();
        state.collaboration.outbox.unshift(payload);
        state.collaboration.outbox = state.collaboration.outbox.slice(0, 300);
        saveState();
        alert('No se pudo enviar ahora. Quedó guardado localmente y puede exportarse en JSON. Detalle: '+err.message);
      }
    }

    function copyContributionPrompt(id){
      const q = QUESTIONS.find(x=>x.id===id);
      if(!q) return;
      const opts = ['a','b','c','d'].filter(k=>q.opts?.[k]).map(k => k.toUpperCase()+') '+q.opts[k]).join('\n');
      const correct = q.ans ? q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'') : 'Sin clave cargada';
      const text = 'Actuá como docente experto en examen de residencia médica argentina. Analizá esta pregunta y devolveme exactamente estos campos: 1) Por qué es correcta, 2) Datos clave, 3) Análisis de distractores, 4) Regla de oro, 5) Bibliografía/fuente sugerida.\n\nTema: '+q.tema+'\nSprint: '+q.sprint+'\nPregunta: '+q.q+'\n\nOpciones:\n'+opts+'\n\nRespuesta correcta cargada: '+correct;
      navigator.clipboard?.writeText(text).then(()=>alert('Prompt copiado. Pegalo en tu IA externa y luego volcá la respuesta en los campos.')).catch(()=>prompt('Copiá este prompt:', text));
    }

    function exportContributionDatabase(){
      ensureCollaborationState();
      const analyses = state.collaboration.analyses || {};
      const data = {
        exportedAt: new Date().toISOString(),
        app: 'ResidenciAPP colaborativa',
        schemaVersion: 2,
        destination: getContributionEndpoint() ? 'external-inbox-configured' : 'local-only',
        stats: {
          totalQuestions: QUESTIONS.length,
          analysesCount: Object.keys(analyses).length,
          outboxCount: (state.collaboration.outbox || []).length,
          answeredCount: Object.keys(state.answers || {}).length,
          mistakesCount: Object.keys(state.mistakes || {}).length
        },
        analyses,
        outbox: state.collaboration.outbox || [],
        questions: QUESTIONS.map(q => Object.assign({}, q, { collaborationAnalysis: analyses[q.id] || null }))
      };
      const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'residenciapp_aportes_'+todayKey()+'.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    const __collabQuestionTemplate = questionTemplate;
    questionTemplate = function(q, selected, showExplanation){
      let html = __collabQuestionTemplate(q, selected, showExplanation);
      const panel = collaborationPanelTemplate(q);
      if(panel) html = html.replace('<div class="mt-6 flex flex-wrap justify-between gap-3">', panel+'<div class="mt-6 flex flex-wrap justify-between gap-3">');
      return html;
    };

    const __collabRenderAll = renderAll;
    renderAll = function(){ __collabRenderAll(); renderCollaborationControls(); };

    function clearProgressForQuestionIds(ids){
      const idSet = ids instanceof Set ? ids : new Set(ids);
      Object.keys(state.answers||{}).forEach(id => { if(idSet.has(id)) delete state.answers[id]; });
      Object.keys(state.mistakes||{}).forEach(id => { if(idSet.has(id)) delete state.mistakes[id]; });
      Object.keys(state.favorites||{}).forEach(id => { if(idSet.has(id)) delete state.favorites[id]; });
      Object.keys(state.scheduled||{}).forEach(id => { if(idSet.has(id)) delete state.scheduled[id]; });
      Object.keys(state.retention||{}).forEach(id => { if(idSet.has(id)) delete state.retention[id]; });
      Object.keys(state.feynmanNotes||{}).forEach(id => { if(idSet.has(id)) delete state.feynmanNotes[id]; });
      if(state.timing?.questionTimes){ Object.keys(state.timing.questionTimes).forEach(id => { if(idSet.has(id)) delete state.timing.questionTimes[id]; }); }
    }
    function rebuildTimingFromRemainingAnswers(){
      const times = state.timing?.questionTimes || {};
      let totalMs = 0, timedAnswers = 0;
      Object.values(times).forEach(list => (Array.isArray(list)?list:[]).forEach(ms => { if(isFinite(ms)){ totalMs += ms; timedAnswers += 1; } }));
      state.timing = {totalMs, timedAnswers, questionTimes: times};
    }
    function resetGlobalProgress(){
      const ok = confirm('¿Reiniciar TODO el progreso? Se borran respuestas, errores, favoritos, repasos programados, retención, tiempos y sesión activa. No se borran aportes colaborativos ni imágenes guardadas.');
      if(!ok) return;
      const keep = { theme: state.theme, method: state.method, collaboration: state.collaboration, library: state.library || [] };
      state = Object.assign(defaultState(), keep);
      session = null;
      saveState();
      renderAll();
      showView('dashboard');
      alert('Progreso global reiniciado. Los aportes colaborativos se conservaron.');
    }
    function resetSprintProgress(id){
      const sp = SPRINTS.find(s=>s.id===id);
      if(!sp) return alert('No encontré ese sprint.');
      const st = sprintStats(sp);
      const ok = confirm('¿Reiniciar el progreso de este sprint?\n\n'+sp.sprint+'\n'+sp.tema+'\n\nSe borran '+st.answered+' respuestas, errores, favoritos y repasos de sus '+sp.total+' preguntas. No se borran aportes colaborativos.');
      if(!ok) return;
      const ids = new Set(sp.questions.map(q=>q.id));
      clearProgressForQuestionIds(ids);
      rebuildTimingFromRemainingAnswers();
      if(session && (session.questions||[]).some(qid => ids.has(qid))){ session = null; state.session = null; }
      saveState();
      renderAll();
      alert('Sprint reiniciado: '+sp.sprint);
    }

    function init(){
      initSelects();
      session = state.session || null;
      const preferredDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(state.theme || (preferredDark?'dark':'light'));
      ensureCollaborationState();
      mergeEmbeddedCollaborationData();
      renderAll();
      renderCollaborationControls();
      $('#loading').style.display='none';
      $('#themeToggle').addEventListener('click',()=>applyTheme(document.documentElement.classList.contains('dark')?'light':'dark'));
      $('#themeToggleTop')?.addEventListener('click',()=>applyTheme(document.documentElement.classList.contains('dark')?'light':'dark'));
      $('#mobileMenuBtn').addEventListener('click',openMobileMenu); $('#closeMenuBtn').addEventListener('click',closeMobileMenu); $('#overlay').addEventListener('click',closeMobileMenu);
      $('#resetProgressBtn').addEventListener('click', resetGlobalProgress);
    }
    init();
