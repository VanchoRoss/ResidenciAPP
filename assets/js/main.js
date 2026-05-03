const DATA = window.RESIDENCIAPP_DATA || {metadata:{}, summary_by_eje:[], summary_by_tema:[], summary_by_sprint:[], questions:[]};
    const QUESTIONS = DATA.questions || [];
    const LESSONS = window.RESIDENCIAPP_LESSONS || [];
    const METHODS = [
      {id:'preguntas', name:'Preguntas ABCD', icon:'✅', tag:'Aplicación', desc:'Responder y justificar. Ideal para entrenar toma de decisiones.'},
      {id:'razonamiento', name:'Razonamiento guiado', icon:'🧬', tag:'NeuroPREP', desc:'Primero formulás hipótesis sin opciones, luego comparás contra ABCD y calibrás confianza.'},
      {id:'simulacro', name:'Simulacro', icon:'⏱️', tag:'Presión', desc:'Sin explicación inmediata. Sirve para entrenar rendimiento real.'},
      {id:'flashcard', name:'Flashcard', icon:'🃏', tag:'Recuerdo', desc:'Pregunta al frente, respuesta al dorso. Útil para falladas.'},
      {id:'feynman', name:'Feynman', icon:'🎙️', tag:'Comprensión', desc:'Explicar simple. Ideal para temas nuevos o confusos.'},
      {id:'mapa', name:'Mapa mental', icon:'🗺️', tag:'Estructura', desc:'Ordenar ramas, claves y distractores del tema.'},
      {id:'nemotecnia', name:'Nemotecnia', icon:'🧩', tag:'Memoria', desc:'Crear una frase/imagen absurda para datos aislados.'},
      {id:'errorlog', name:'Error log', icon:'🧾', tag:'Corrección', desc:'Clasificar por qué fallaste: lectura, concepto, razonamiento o trampa.'},
      {id:'repaso', name:'Repaso espaciado', icon:'🔁', tag:'Consolidación', desc:'Programar D1-D2-D4 según dificultad.'},
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

    const SOURCE_LABELS = { clinica:'Clínica', cirugia:'Cirugía', pediatria:'Pediatría', gineco_obstetricia:'Gineco-Obstetricia', gineco:'Gineco-Obstetricia', salud_publica:'Salud Pública' };
    const SOURCE_ORDER = ['clinica','cirugia','pediatria','gineco_obstetricia','salud_publica'];
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
      const answered = QUESTIONS.filter(q=>answerFor(q)).length;
      const correct = QUESTIONS.filter(q=>isCorrect(q)).length;
      const mistakes = QUESTIONS.filter(q=>state.mistakes?.[q.id]).length;
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
        + (session.method==='repaso' ? '<div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',7)">Fácil · +4 días</button><button class="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',3)">Dudosa · +2 días</button><button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',1)">Difícil · mañana</button></div>' : '')
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
      if(method==='flashcard') return header + '<div class="mt-4 card-flip min-h-72" data-flipped="false" onclick="this.dataset.flipped=this.dataset.flipped===\'true\'?\'false\':\'true\'"><div class="card-flip-inner relative min-h-72"><div class="card-face absolute inset-0 rounded-[1.75rem] border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-950"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Frente</p><h4 class="mt-3 font-display text-2xl font-extrabold">'+esc(q.q)+'</h4><p class="mt-4 text-sm text-slate-500">Tocá para ver respuesta</p></div><div class="card-face card-back absolute inset-0 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20"><p class="text-xs font-black uppercase tracking-[.18em] text-emerald-600">Dorso</p><h4 class="mt-3 text-xl font-black">'+esc(correct)+'</h4><p class="mt-4 text-sm leading-6">'+esc(reasoningHint(q))+'</p></div></div></div><div class="mt-4 flex gap-2"><button class="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',7); closeMethodModal();">La sé · +4 días</button><button class="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',3); closeMethodModal();">Dudosa · +2 días</button><button class="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',1); closeMethodModal();">No la sé · mañana</button></div>';
      if(method==='feynman') return header + noteEditor('feynman', q, 'Explicá esta pregunta como si se la contaras a alguien sin base médica. Evitá jerga. Donde te trabes, marcá el hueco.', 'Mi explicación simple es…');
      if(method==='mapa') return header + noteEditor('mapa', q, 'Construí un mapa mental del tema. Ramas sugeridas: diagnóstico, datos clave, conducta inicial, distractores frecuentes, trampa del examen.', 'Centro: '+q.sprint+'\n1) Diagnóstico/conducta:\n2) Datos clave:\n3) Distractores:\n4) Trampa del examen:');
      if(method==='nemotecnia') return header + noteEditor('nemotecnia', q, 'Inventá una frase, imagen o historia absurda para recordar este dato o criterio.', 'Mi nemotecnia absurda es…');
      if(method==='errorlog') return header + '<div class="mt-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-700"><label class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Tipo de error</label><select id="errorType" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"><option>Falta de conocimiento</option><option>Mala lectura del enunciado</option><option>Razonamiento incorrecto</option><option>Confusión entre dos temas</option><option>Trampa/distractor</option><option>Dato duro olvidado</option></select><textarea id="errorNote" class="mt-3 min-h-32 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="¿Por qué me equivoqué? ¿Qué regla puedo sacar para no repetirlo?"></textarea><button class="mt-3 rounded-2xl bg-medical-600 px-4 py-3 text-sm font-black text-white" onclick="saveErrorLog(\''+q.id+'\')">Guardar error log</button></div>';
      if(method==='repaso') return header + '<div class="mt-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-700"><p class="text-sm font-black">Programar próximo contacto</p><p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Elegí según dificultad. Lo difícil vuelve antes; lo fácil se aleja.</p><div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',1); closeMethodModal();">Mañana</button><button class="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',3); closeMethodModal();">+2 días</button><button class="rounded-2xl bg-medical-600 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',7); closeMethodModal();">+4 días</button><button class="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white" onclick="scheduleQuestion(\''+q.id+'\',21); closeMethodModal();">+21 días</button></div></div>';
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
      ['Repaso espaciado','45–60 min','Recuperar sin mirar: flashcards, falladas y D1-D2-D4.'],
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
      const expected = window.RESIDENCIAPP_EXPECTED_LESSON_COUNT || 12;
      const suffix = total < expected ? 'actualizá caché' : 'disponibles';
      $('#lessonStats').innerHTML = [['Nodos', total, suffix],['Vistos', done, pct+'% avance'],['Repasar', saved, 'guardados']].map(x=>'<div class="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-950/60"><p class="font-display text-2xl font-extrabold">'+x[1]+'</p><p class="text-[10px] font-black uppercase tracking-[.15em] text-slate-400">'+x[0]+'</p><p class="text-[11px] font-bold text-slate-500 dark:text-slate-400">'+x[2]+'</p></div>').join('');
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
    function renderAll(){ renderStats(); renderPerformancePanel(); updateTemaFilter(); renderSprints(); renderLearn(); renderNeuroprep(); renderReview(); renderDailyChecklist(); renderMethods(); renderTemario(); renderLibrary(); }

    function showView(name){
      $$('.view').forEach(v=>v.classList.add('hidden'));
      $('#'+name+'View')?.classList.remove('hidden');
      $$('.navBtn').forEach(b=> b.classList.toggle('bg-medical-50', b.dataset.nav===name));
      $$('.navBtn').forEach(b=> b.classList.toggle('text-medical-700', b.dataset.nav===name));
      const titles={dashboard:'Panel principal',learn:'Aprender desde cero',neuroprep:'NeuroPREP',session:'Sesión activa',results:'Resultados',review:'Repaso inteligente',methods:'Métodos de estudio',temario:'Temario 2026',library:'Biblioteca personal'};
      $('#viewTitle').textContent = titles[name] || 'ResidenciAPP';
      closeMobileMenu(); window.scrollTo({top:0, behavior:'smooth'});
      if(name==='session') renderQuestion(); if(name==='learn') renderLearn(); if(name==='neuroprep') renderNeuroprep(); if(name==='review') renderReview(); if(name==='library') renderLibrary();
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
      if(['easy','facil','fácil'].includes(d)) return {days:4, label:'Fácil', color:'emerald', ease:2.5};
      return {days:2, label:'Dudosa', color:'amber', ease:1.8};
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
        + '<div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="event.stopPropagation(); markDifficulty(\''+q.id+'\',\'hard\')">Difícil · mañana</button><button class="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white" onclick="event.stopPropagation(); markDifficulty(\''+q.id+'\',\'medium\')">Dudosa · +2 días</button><button class="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white" onclick="event.stopPropagation(); markDifficulty(\''+q.id+'\',\'easy\')">Fácil · +4 días</button></div>'
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
      $('#feynmanOfficial').innerHTML = '<div class="rounded-[1.75rem] border border-medical-200 bg-medical-50 p-5 animate-fadeUp dark:border-medical-900/60 dark:bg-medical-950/30"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-700 dark:text-medical-300">Explicación oficial para comparar</p><div class="mt-4 grid gap-3">'+learningPanelItem('Respuesta correcta', esc(correct), 'emerald')+learningPanelItem('Dato clave', keyDataHint(q), 'amber')+learningPanelItem('Por qué es correcta', whyCorrectHint(q), 'medical')+'</div><div class="mt-4 flex flex-wrap gap-2"><button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'hard\')">Me costó · mañana</button><button class="rounded-2xl bg-amber-500 px-3 py-2 text-xs font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'medium\')">Regular · +2 días</button><button class="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'easy\')">Lo expliqué bien · +4 días</button></div></div>';
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
      const extra = '<div class="mt-5 rounded-[1.5rem] border border-slate-200 bg-white/75 p-4 dark:border-slate-700 dark:bg-slate-950/50"><div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Retención avanzada</p><h5 class="mt-1 font-display text-xl font-extrabold">¿Qué tan difícil se sintió?</h5><p class="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">La dificultad programa el próximo repaso: Difícil mañana, Dudosa en 2 días y Fácil en 4 días.</p></div><button class="native-tap rounded-2xl border border-medical-200 bg-medical-50 px-4 py-3 text-sm font-black text-medical-700 hover:bg-medical-100 dark:border-medical-800 dark:bg-medical-950/30 dark:text-medical-300" onclick="openFeynmanModalForQuestion(\''+q.id+'\')">🎙️ ¿Podés explicarlo?</button></div><div class="mt-4 flex flex-wrap gap-2"><button class="retention-pill rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'hard\')">Difícil · mañana</button><button class="retention-pill rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'medium\')">Dudosa · +2 días</button><button class="retention-pill rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white" onclick="markDifficulty(\''+q.id+'\',\'easy\')">Fácil · +4 días</button></div></div>';
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
        + '<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p id="collabSavedStamp_'+q.id+'" class="text-xs font-bold text-slate-500 dark:text-slate-400">'+(saved.updatedAt ? 'Última edición local: '+new Date(saved.updatedAt).toLocaleString('es-AR') : 'Todavía sin edición local')+'</p><div class="flex flex-wrap gap-2"><button class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="copyContributionPrompt(\''+q.id+'\')">Copiar prompt IA</button><button class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="exportContributionDatabase()">Exportar feedback para GitHub</button></div></div>'
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


    /* === ResidenciAPP Tutor v2: estudio separado de entrenamiento/simulacro === */
    let examTimerInterval = null;

    function selectedSimSeconds(){
      const fromSelect = Number($('#simTimePerQuestion')?.value || 0);
      return fromSelect || Number(state.simSeconds || 90) || 90;
    }
    function formatClock(total){
      total = Math.max(0, Number(total||0));
      const m = Math.floor(total/60);
      const s = total % 60;
      return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }
    function modeLabel(){
      if(!session) return '';
      return session.mode === 'exam' ? 'Simulacro de examen' : 'Práctica libre';
    }
    function stopExamTimer(){
      if(examTimerInterval){ clearInterval(examTimerInterval); examTimerInterval = null; }
    }
    function renderExamTimerPanel(){
      const panel = $('#examTimerPanel');
      if(!panel) return;
      if(!session || session.mode !== 'exam'){
        panel.classList.add('hidden');
        panel.innerHTML = '';
        stopExamTimer();
        return;
      }
      panel.classList.remove('hidden');
      const remaining = Math.max(0, Number(session.remainingSeconds || 0));
      const total = Math.max(1, Number(session.totalSeconds || 1));
      const pct = Math.max(0, Math.min(100, Math.round((remaining/total)*100)));
      const urgent = remaining <= 60;
      panel.innerHTML = '<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.16em]">Modo simulacro</p><p class="text-sm font-bold opacity-90">Sin explicación hasta finalizar · '+session.secondsPerQuestion+' segundos por pregunta</p></div><div class="font-display text-3xl font-extrabold '+(urgent?'exam-timer-pulse text-rose-600 dark:text-rose-300':'')+'">⏱ '+formatClock(remaining)+'</div></div><div class="mt-3 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-950/50"><div class="h-full rounded-full '+(urgent?'bg-rose-500':'bg-amber-500')+'" style="width:'+pct+'%"></div></div>';
    }
    function startExamTimerIfNeeded(){
      if(!session || session.mode !== 'exam') { renderExamTimerPanel(); return; }
      if(!session.lastTick) session.lastTick = Date.now();
      renderExamTimerPanel();
      if(examTimerInterval) return;
      examTimerInterval = setInterval(() => {
        if(!session || session.mode !== 'exam'){ renderExamTimerPanel(); return; }
        const now = Date.now();
        const delta = Math.floor((now - (session.lastTick || now))/1000);
        if(delta > 0){
          session.remainingSeconds = Math.max(0, Number(session.remainingSeconds||0) - delta);
          session.lastTick = (session.lastTick || now) + delta*1000;
          state.session = session;
          saveState();
        }
        renderExamTimerPanel();
        if(Number(session.remainingSeconds||0) <= 0){
          stopExamTimer();
          finishSession('time');
        }
      }, 1000);
    }

    const __v2OldInitSelects = initSelects;
    initSelects = function(){
      __v2OldInitSelects();
      const sim = $('#simTimePerQuestion');
      if(sim){
        sim.value = String(state.simSeconds || 90);
        sim.addEventListener('change', e => { state.simSeconds = Number(e.target.value || 90); saveState(); });
      }
      const lessonEje = $('#lessonEjeFilter');
      if(lessonEje){
        const ejes = [...new Set((LESSONS||[]).map(l=>l.eje).filter(Boolean))].sort();
        lessonEje.innerHTML = '<option value="">Todos los ejes</option>' + ejes.map(e=>'<option value="'+esc(e)+'">'+esc(e)+'</option>').join('');
        lessonEje.addEventListener('change', renderLearn);
      }
    };

    const __v2BaseSetSession = setSession;
    setSession = function(qs, title, meta, method='preguntas', shuffleQs=false, options={}){
      const list = shuffleQs ? shuffle(qs) : [...qs];
      const mode = options.mode || (method === 'simulacro' ? 'exam' : 'practice');
      const secondsPerQuestion = Number(options.secondsPerQuestion || selectedSimSeconds() || 90);
      const totalSeconds = mode === 'exam' ? list.length * secondsPerQuestion : 0;
      session = {
        questions:list.map(q=>q.id), idx:0, title, meta, method,
        mode, secondsPerQuestion, totalSeconds, remainingSeconds: totalSeconds,
        startedAt:Date.now(), lastTick: Date.now(), selected:{}, failed:[], correct:0, revealed:false
      };
      state.session = session;
      saveState();
      showView('session');
      renderQuestion();
    };

    startSprintPractice = function(id){ const sp=SPRINTS.find(s=>s.id===id); if(sp) setSession(sp.questions, sp.sprint, sp.tema+' · '+sp.eje, state.method || 'preguntas', false, {mode:'practice'}); };
    startSprintExam = function(id){ const sp=SPRINTS.find(s=>s.id===id); if(sp) setSession(sp.questions, 'Simulacro · '+sp.sprint, sp.tema+' · '+sp.eje+' · '+sp.total+' preguntas', 'simulacro', false, {mode:'exam', secondsPerQuestion:selectedSimSeconds()}); };
    startSprint = function(id, method){ return method === 'simulacro' ? startSprintExam(id) : startSprintPractice(id); };
    startGlobalSimulation = function(){ setSession(QUESTIONS, 'Simulacro global', 'Modo examen · banco completo', 'simulacro', true, {mode:'exam', secondsPerQuestion:selectedSimSeconds()}); };
    startGlobalSession = function(){ setSession(QUESTIONS, 'Entrenamiento global', 'Práctica libre · banco completo', state.method || 'preguntas', true, {mode:'practice'}); };

    const __v2BaseCurrentNeedsErrorLog = currentNeedsErrorLog;
    currentNeedsErrorLog = function(){ if(session?.mode === 'exam') return false; return __v2BaseCurrentNeedsErrorLog(); };

    const __v2BaseQuestionTemplate = questionTemplate;
    function examQuestionTemplate(q, selected){
      const status = questionStatus(q);
      const year = q.year ? 'Año '+q.year : 'Año no detectado';
      const options = ['a','b','c','d'].map(k => {
        const txt = q.opts?.[k]; if(!txt) return '';
        const isSel = selected===k;
        const cls = isSel ? 'border-medical-400 bg-medical-50 dark:border-medical-700 dark:bg-medical-950/30' : 'border-slate-200 hover:border-medical-300 dark:border-slate-700 dark:hover:border-medical-700';
        return '<label class="choice block cursor-pointer"><input class="sr-only" name="choice" type="radio" value="'+k+'" '+(isSel?'checked':'')+' onchange="selectAnswer(\''+q.id+'\',\''+k+'\')"><div class="rounded-3xl border '+cls+' p-4 transition"><div class="flex gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-black uppercase dark:bg-slate-800">'+k+'</span><p class="text-sm font-semibold leading-6">'+esc(txt)+'</p></div></div></label>';
      }).join('');
      return '<div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div class="flex flex-wrap gap-2"><span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Simulacro</span><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">'+esc(q.eje)+'</span><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+esc(year)+'</span></div><span class="text-xs font-black uppercase tracking-[.16em] text-amber-500">sin corrección inmediata</span></div>'
        + '<h3 class="font-display text-2xl font-extrabold leading-tight sm:text-3xl">'+highlightTriggerWords(q.q)+'</h3>'
        + (q.image_reference ? '<div class="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">⚠️ Esta pregunta menciona una imagen/ECG/radiografía.</div>' : '')
        + '<div class="mt-5 grid gap-3">'+options+'</div>'
        + '<div class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">La corrección, explicación y distractores se muestran al finalizar el simulacro.</div>'
        + '<div class="mt-6 flex flex-wrap justify-between gap-3"><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" '+(session.idx===0?'disabled':'')+' onclick="prevQuestion()">← Anterior</button><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white hover:bg-medical-700" onclick="nextQuestion()">'+(session.idx===getSessionQuestions().length-1?'Terminar':'Siguiente →')+'</button></div>';
    }
    questionTemplate = function(q, selected, showExplanation){
      if(session?.mode === 'exam') return examQuestionTemplate(q, selected);
      return __v2BaseQuestionTemplate(q, selected, showExplanation);
    };

    renderQuestion = function(){
      if(!session){ $('#emptySession').classList.remove('hidden'); $('#sessionContent').classList.add('hidden'); renderExamTimerPanel(); return; }
      $('#emptySession').classList.add('hidden'); $('#sessionContent').classList.remove('hidden');
      const arr=getSessionQuestions(); const q=arr[session.idx]; if(!q){ finishSession(); return; }
      $('#sessionMethod').value = session.method;
      $('#sessionTitle').textContent = session.title;
      $('#sessionMeta').textContent = session.meta;
      const pct = Math.round(((session.idx)/arr.length)*100);
      $('#sessionBar').style.width = pct+'%';
      const timingText = session.mode === 'exam' ? ' · Tiempo total: '+formatClock(session.totalSeconds)+' · Restante: '+formatClock(session.remainingSeconds) : ' · Sin tiempo';
      $('#sessionProgress').textContent = 'Pregunta '+(session.idx+1)+' de '+arr.length+' · '+modeLabel()+timingText;
      const selected = session.selected[q.id] || answerFor(q)?.selected || '';
      const answered = !!selected;
      const showExplanation = answered && session.mode !== 'exam';
      startQuestionTimer(q);
      renderPerformancePanel();
      $('#questionCard').innerHTML = questionTemplate(q, selected, showExplanation);
      renderMethodDock(q);
      startExamTimerIfNeeded();
    };

    const __v2OldFinishSession = finishSession;
    finishSession = function(reason='manual'){
      stopExamTimer();
      if(!session){ showView('dashboard'); return; }
      const qs = getSessionQuestions();
      const answered = qs.filter(q=>session.selected[q.id] || answerFor(q)).length;
      const correct = qs.filter(q=>{ const s=session.selected[q.id] || answerFor(q)?.selected; return s && s===q.ans; }).length;
      const failed = qs.filter(q=>{ const s=session.selected[q.id] || answerFor(q)?.selected; return s && q.ans && s!==q.ans; });
      const skipped = qs.filter(q=>!(session.selected[q.id] || answerFor(q))).length;
      const acc = answered ? Math.round(correct/answered*100) : 0;
      const wasExam = session.mode === 'exam';
      state.session = null; saveState(); const old=session; session=null;
      const headline = reason === 'time' ? 'Tiempo finalizado' : 'Sesión finalizada';
      $('#resultsContent').innerHTML = '<div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">'+headline+'</p><h3 class="mt-1 font-display text-4xl font-extrabold">'+acc+'% de precisión</h3><p class="mt-2 text-slate-600 dark:text-slate-400">'+correct+' correctas sobre '+answered+' respondidas · '+failed.length+' errores · '+skipped+' sin responder.</p><div class="mt-6 flex flex-wrap gap-3"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white" onclick="showView(\'dashboard\')">Volver al panel</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesSession()">Repasar errores</button></div></div>'
        + '<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">'+failed.slice(0,24).map(q => flashcardMini(q)).join('')+'</div>'
        + (wasExam ? '<div class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Corrección del simulacro</p><div class="mt-4 grid gap-3">'+qs.map(q=>{ const s=old.selected[q.id]||answerFor(q)?.selected||''; const ok=s&&s===q.ans; return '<div class="rounded-2xl border '+(ok?'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20':'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20')+' p-4"><p class="text-sm font-black">'+esc(q.q)+'</p><p class="mt-2 text-xs font-bold">Tu respuesta: '+(s?esc(s.toUpperCase()+') '+(q.opts?.[s]||'')):'Sin responder')+'</p><p class="text-xs font-bold">Correcta: '+(q.ans?esc(q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'')):'Sin clave')+'</p></div>'; }).join('')+'</div></div>' : '');
      showView('results');
    };

    // Re-render de sprints: separar práctica libre de simulacro cronometrado.
    renderSprints = function(){
      const rawQuery = $('#searchInput').value || '';
      const eje = $('#ejeFilter').value;
      const tema = $('#temaFilter').value;
      let list = SPRINTS.filter(s => (!eje || s.eje===eje) && (!tema || s.tema===tema));
      if(rawQuery.trim()) list = list.filter(s => sprintMatchesSearch(s, rawQuery));
      $('#sprintCount').textContent = list.length+' sprints';
      renderSearchStatus(list, rawQuery);
      const seconds = selectedSimSeconds();
      $('#sprintGrid').innerHTML = list.map(sp => {
        const st = sprintStats(sp);
        const preview = sprintMatchPreview(sp, rawQuery);
        const previewHtml = preview ? '<div class="mt-3 rounded-2xl bg-medical-50/70 p-3 text-xs font-semibold leading-5 text-medical-800 dark:bg-medical-950/20 dark:text-medical-200"><span class="font-black">Coincidencia:</span> '+highlightSearchPreview(preview, rawQuery)+'</div>' : '';
        return '<article class="rounded-3xl border border-slate-200 p-4 transition hover:border-medical-300 hover:shadow-soft dark:border-slate-800 dark:hover:border-medical-800">'
          + '<div class="flex items-start justify-between gap-3"><div class="min-w-0"><p class="truncate text-xs font-black uppercase tracking-[.16em] text-medical-600 dark:text-medical-300">'+esc(sp.eje)+'</p><h4 class="mt-1 font-display text-lg font-extrabold leading-6">'+esc(sp.sprint)+'</h4><p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">'+esc(sp.tema)+' · '+sp.total+' preguntas</p></div><div class="rounded-2xl bg-slate-100 px-3 py-2 text-center dark:bg-slate-800"><p class="text-lg font-black">'+st.pct+'%</p><p class="text-[10px] font-black uppercase text-slate-400">avance</p></div></div>'
          + '<div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-full rounded-full bg-medical-600" style="width:'+st.pct+'%"></div></div>'
          + previewHtml
          + '<div class="mt-3 rounded-2xl bg-slate-50 p-3 text-[11px] font-bold text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">Simulacro: '+sp.total+' × '+seconds+' s = '+formatClock(sp.total*seconds)+'</div>'
          + '<div class="mt-3 flex flex-wrap items-center justify-between gap-2"><p class="text-xs font-bold text-slate-500 dark:text-slate-400">'+st.answered+'/'+sp.total+' respondidas · '+st.acc+'% acierto</p><div class="flex flex-wrap gap-2"><button class="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="openTopicMethods(\''+sp.id+'\')">Métodos</button><button class="rounded-2xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30" onclick="resetSprintProgress(\''+sp.id+'\')">Reiniciar</button><button class="rounded-2xl border border-medical-200 bg-medical-50 px-3 py-2 text-xs font-black text-medical-700 hover:bg-medical-100 dark:border-medical-900/60 dark:bg-medical-950/30 dark:text-medical-300" onclick="startSprintPractice(\''+sp.id+'\')">Práctica libre</button><button class="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:opacity-90 dark:bg-white dark:text-slate-950" onclick="startSprintExam(\''+sp.id+'\')">Simulacro</button></div></div>'
          + '</article>';
      }).join('') || '<div class="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">No encontré sprints con esos filtros.</div>';
    };

    // Nodos: usar preguntas explícitas del nodo, no matching amplio del banco.
    lessonRelatedQuestions = function(lesson){
      const ids = Array.isArray(lesson?.explicitQuestionIds) ? lesson.explicitQuestionIds : [];
      if(ids.length) return ids.map(id => QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      // Fallback conservador: si un nodo futuro no trae preguntas explícitas, no inventar 60+ coincidencias.
      return [];
    };
    function lessonMatchesV2(lesson, raw){
      const q = norm(raw || '');
      const ejeSelected = $('#lessonEjeFilter')?.value || '';
      if(ejeSelected && lesson.eje !== ejeSelected) return false;
      if(!q) return true;
      const hay = norm([lesson.title, lesson.eje, lesson.tema, lesson.subtitle, lesson.description, (lesson.badges||[]).join(' '), (lesson.sections||[]).join(' '), (lesson.terms||[]).join(' ')].join(' '));
      return q.split(/\s+/).every(t => hay.includes(t));
    }
    renderLearn = function(){
      if(!$('#learnView')) return;
      renderLessonStats();
      const raw = $('#lessonSearch')?.value || '';
      const list = LESSONS.filter(l => lessonMatchesV2(l, raw));
      if($('#lessonGrid')){
        const byEje = groupBy(list, l => l.eje || 'Otros');
        $('#lessonGrid').innerHTML = cacheWarn + (Object.entries(byEje).map(([eje, items]) =>
          '<div class="space-y-3"><div class="lesson-eje-title rounded-2xl bg-white/85 px-3 py-2 text-xs font-black uppercase tracking-[.18em] text-medical-700 shadow-sm dark:bg-slate-900/85 dark:text-medical-300">'+esc(eje)+' · '+items.length+' nodos</div>'+items.map(lessonCard).join('')+'</div>'
        ).join('') || '<div class="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700">No encontré nodos con esa búsqueda.</div>');
      }
      if(state.currentLessonId && lessonById(state.currentLessonId)) openLesson(state.currentLessonId, true);
    };
    resetLessonFilter = function(){ if($('#lessonSearch')) $('#lessonSearch').value=''; if($('#lessonEjeFilter')) $('#lessonEjeFilter').value=''; renderLearn(); };
    openLesson = function(id, silent=false){
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
      if($('#lessonQuickMap')) $('#lessonQuickMap').innerHTML = '<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Ruta del nodo</p><div class="mt-2 flex flex-wrap gap-2">'+(lesson.sections||[]).map((s,i)=>'<span class="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+(i+1)+'. '+esc(s)+'</span>').join('')+'</div><p class="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">Las preguntas del nodo respetan la sección “Preguntas reales” del material cargado. No se mezclan con sprints por coincidencia automática.</p></div><div class="shrink-0 rounded-2xl border border-slate-200 px-4 py-3 text-center dark:border-slate-700"><p class="font-display text-2xl font-extrabold">'+related.length+'</p><p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">preguntas del nodo</p></div></div>';
      renderLessonStats();
      if(!silent) renderLearn();
    };
    startLessonPractice = function(id){
      const lesson = lessonById(id);
      if(!lesson) return;
      const qs = lessonRelatedQuestions(lesson);
      if(!qs.length) return alert('Este nodo todavía no tiene preguntas del banco vinculadas de forma explícita. Podés practicar desde la sección “Preguntas reales” dentro del nodo.');
      setSession(qs, 'Nodo · '+lesson.title, 'Práctica libre · preguntas reales del nodo', state.method || 'preguntas', false, {mode:'practice'});
    };
    startLessonExam = function(id){
      const lesson = lessonById(id);
      if(!lesson) return;
      const qs = lessonRelatedQuestions(lesson);
      if(!qs.length) return alert('Este nodo todavía no tiene preguntas del banco vinculadas de forma explícita.');
      setSession(qs, 'Simulacro nodo · '+lesson.title, qs.length+' preguntas reales del nodo', 'simulacro', false, {mode:'exam', secondsPerQuestion:selectedSimSeconds()});
    };
    startCurrentLessonPractice = function(){ const lesson=lessonById(state.currentLessonId); if(!lesson) return alert('Elegí primero un nodo.'); startLessonPractice(lesson.id); };
    toggleLessonFocus = function(){ document.body.classList.toggle('lesson-focus'); };
    toggleSessionFocus = function(){ document.body.classList.toggle('session-focus'); const b=$('#sessionFocusBtn'); if(b) b.textContent = document.body.classList.contains('session-focus') ? 'Vista normal' : 'Expandir'; };


    /* === ResidenciAPP v2.1 · Ajustes de uso real ===
       - Splash manual con botón Comenzar.
       - Sidebar colapsable también en escritorio.
       - Feedback colaborativo aparece en Experiencia de aprendizaje.
       - Errores corregidos desaparecen del repaso de errores.
    */
    const ACCESS_USER = 'resiapp';
    const ACCESS_PASS_SHA256 = '83589d4a38d3a491a38923299c55edd17eb1e2cc4b50495eefbc0cab9ad52660';
    const ACCESS_STORAGE_KEY = 'residenciapp_access_granted_v31';

    async function sha256Hex(text){
      const data = new TextEncoder().encode(String(text || ''));
      const digest = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,'0')).join('');
    }

    function isAccessGranted(){
      try { return localStorage.getItem(ACCESS_STORAGE_KEY) === 'true'; }
      catch(err){ return false; }
    }

    function setAccessGranted(value){
      try {
        if(value) localStorage.setItem(ACCESS_STORAGE_KEY, 'true');
        else localStorage.removeItem(ACCESS_STORAGE_KEY);
      } catch(err) {}
    }

    function hideAccessScreen(){
      const loading = $('#loading');
      if(!loading) return;
      loading.classList.add('loading-hidden');
      setTimeout(()=>{ loading.style.display='none'; }, 320);
    }

    function setLoginStatus(message, tone='neutral'){
      const el = $('#loginStatus');
      if(!el) return;
      el.textContent = message || '';
      el.className = 'min-h-[1.25rem] text-center text-xs font-bold ' + (
        tone === 'error' ? 'text-rose-600 dark:text-rose-300' :
        tone === 'ok' ? 'text-emerald-600 dark:text-emerald-300' :
        'text-slate-500 dark:text-slate-400'
      );
    }

    async function enterResidenciApp(){
      if(isAccessGranted()) { hideAccessScreen(); return; }
      const user = String($('#loginUser')?.value || '').trim().toLowerCase();
      const pass = String($('#loginPass')?.value || '');
      const btn = $('#startAppBtn');
      if(!user || !pass){
        setLoginStatus('Completá usuario y contraseña para ingresar.', 'error');
        return;
      }
      try{
        if(btn){ btn.disabled = true; btn.textContent = 'Verificando…'; btn.classList.add('opacity-70'); }
        const hash = await sha256Hex(pass);
        if(user === ACCESS_USER && hash === ACCESS_PASS_SHA256){
          setAccessGranted(true);
          setLoginStatus('Acceso concedido. Bienvenido a ResidenciAPP.', 'ok');
          setTimeout(hideAccessScreen, 220);
        } else {
          setLoginStatus('Usuario o contraseña incorrectos.', 'error');
          const passInput = $('#loginPass');
          if(passInput){ passInput.value = ''; passInput.focus(); }
        }
      } catch(err){
        setLoginStatus('No se pudo verificar el acceso en este navegador.', 'error');
      } finally {
        if(btn){ btn.disabled = false; btn.textContent = 'Acceder y comenzar'; btn.classList.remove('opacity-70'); }
      }
    }

    function initAccessGate(){
      const btn = $('#startAppBtn');
      const user = $('#loginUser');
      const pass = $('#loginPass');
      if(isAccessGranted()){
        setLoginStatus('Sesión autorizada en este navegador. Tocá para entrar.', 'ok');
        if(btn) btn.textContent = 'Entrar a ResidenciAPP';
        if(user) user.closest('div')?.classList.add('hidden');
        if(pass) pass.closest('div')?.classList.add('hidden');
      }
      [user, pass].forEach(input => input?.addEventListener('keydown', ev => {
        if(ev.key === 'Enter'){ ev.preventDefault(); enterResidenciApp(); }
      }));
    }

    toggleAccessPassword = function(){
      const input = $('#loginPass');
      const btn = $('#togglePassBtn');
      if(!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      if(btn) btn.textContent = show ? 'Ocultar' : 'Ver';
    };

    logoutResidenciApp = function(){
      setAccessGranted(false);
      location.reload();
    };

    openMobileMenu = function(){
      const sidebar = $('#sidebar');
      const overlay = $('#overlay');
      document.body.classList.remove('sidebar-collapsed');
      if(sidebar) sidebar.classList.remove('-translate-x-full');
      if(window.innerWidth < 1024 && overlay) overlay.classList.remove('hidden');
    };
    closeMobileMenu = function(){
      const sidebar = $('#sidebar');
      const overlay = $('#overlay');
      if(window.innerWidth >= 1024){ if(overlay) overlay.classList.add('hidden'); return; }
      if(sidebar) sidebar.classList.add('-translate-x-full');
      if(overlay) overlay.classList.add('hidden');
    };
    function toggleSidebar(){
      const sidebar = $('#sidebar');
      const overlay = $('#overlay');
      if(window.innerWidth >= 1024){
        document.body.classList.toggle('sidebar-collapsed');
        if(overlay) overlay.classList.add('hidden');
        return;
      }
      if(!sidebar) return;
      const closed = sidebar.classList.contains('-translate-x-full');
      sidebar.classList.toggle('-translate-x-full', !closed);
      if(overlay) overlay.classList.toggle('hidden', !closed);
    }

    function collabHasText(value){ return String(value||'').trim().length > 0; }
    function collabFeedbackStatus(id){
      const a = getCollabAnalysis ? getCollabAnalysis(id) : {};
      const fields = ['whyCorrect','keyData','distractors','goldenRule','bibliography'];
      return fields.some(k=>collabHasText(a[k])) ? a : null;
    }
    function collabOfficialBadge(){ return '<span class="feedback-official-badge">✓ Feedback colaborativo local</span>'; }
    function collabBlockHtml(id, field, html){
      return '<div id="feedback_'+field+'_'+id+'">'+html+'</div>';
    }
    function textToParagraphs(text){
      const parts = String(text||'').trim().split(/\n{2,}/).map(x=>x.trim()).filter(Boolean);
      if(!parts.length) return '';
      return parts.map(x=>'<p class="whitespace-pre-wrap">'+esc(x)+'</p>').join('<div class="h-2"></div>');
    }

    const __v21WhyCorrectHint = whyCorrectHint;
    whyCorrectHint = function(q){
      const a = collabFeedbackStatus(q.id);
      if(a && collabHasText(a.whyCorrect)) return collabBlockHtml(q.id, 'whyCorrect', collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.whyCorrect)+'</div>');
      return collabBlockHtml(q.id, 'whyCorrect', __v21WhyCorrectHint(q));
    };
    const __v21KeyDataHint = keyDataHint;
    keyDataHint = function(q){
      const a = collabFeedbackStatus(q.id);
      if(a && collabHasText(a.keyData)) return collabBlockHtml(q.id, 'keyData', collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.keyData)+'</div>');
      return collabBlockHtml(q.id, 'keyData', __v21KeyDataHint(q));
    };
    const __v21WrongOptionsHint = wrongOptionsHint;
    wrongOptionsHint = function(q){
      const a = collabFeedbackStatus(q.id);
      if(a && collabHasText(a.distractors)) return collabBlockHtml(q.id, 'distractors', collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.distractors)+'</div>');
      return collabBlockHtml(q.id, 'distractors', __v21WrongOptionsHint(q));
    };

    const __v21ExplanationTemplate = explanationTemplate;
    explanationTemplate = function(q, selected){
      let html = __v21ExplanationTemplate(q, selected);
      const a = collabFeedbackStatus(q.id);
      if(a && (collabHasText(a.goldenRule) || collabHasText(a.bibliography))){
        const extra = '<div class="mt-3 grid gap-3">'
          + (collabHasText(a.goldenRule) ? learningPanelItem('Regla de Oro', collabBlockHtml(q.id, 'goldenRule', collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.goldenRule)+'</div>'), 'emerald') : '')
          + (collabHasText(a.bibliography) ? learningPanelItem('Bibliografía / fuente', collabBlockHtml(q.id, 'bibliography', collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.bibliography)+'</div>'), 'medical') : '')
          + '</div>';
        html = html.replace('</section>', extra+'</section>');
      }
      return html;
    };

    function syncCollaborativeFeedbackPreview(id){
      const q = QUESTIONS.find(x=>x.id===id);
      if(!q) return;
      const targets = [
        ['whyCorrect', whyCorrectHint(q)],
        ['keyData', keyDataHint(q)],
        ['distractors', wrongOptionsHint(q)]
      ];
      const a = collabFeedbackStatus(id);
      if(a){
        if(collabHasText(a.goldenRule)) targets.push(['goldenRule', collabBlockHtml(id, 'goldenRule', collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.goldenRule)+'</div>')]);
        if(collabHasText(a.bibliography)) targets.push(['bibliography', collabBlockHtml(id, 'bibliography', collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.bibliography)+'</div>')]);
      }
      targets.forEach(([field, html])=>{
        const el = $('#feedback_'+field+'_'+id);
        if(el) el.outerHTML = html;
      });
    }
    const __v21SaveCollaborativeField = saveCollaborativeField;
    saveCollaborativeField = function(id, field, value){
      __v21SaveCollaborativeField(id, field, value);
      syncCollaborativeFeedbackPreview(id);
    };

    const __v21SelectAnswer = selectAnswer;
    selectAnswer = function(id, selected){
      __v21SelectAnswer(id, selected);
      const q = QUESTIONS.find(x=>x.id===id);
      if(q && selected === q.ans){
        let changed = false;
        if(state.mistakes && state.mistakes[id]){ delete state.mistakes[id]; changed = true; }
        if(session && /repaso de errores|error/i.test(String(session.title||'') + ' ' + String(session.meta||''))){
          if(state.scheduled && state.scheduled[id]){ delete state.scheduled[id]; changed = true; }
        }
        if(changed){ saveState(); renderReview(); renderDueTodayHero(); renderAdvancedFlashcards(); }
      }
    };

    /* === ResidenciAPP v2.2 · Revancha + IA verificadora + feedback aprobado remoto ===
       - Modo Revancha de errores: no muestra feedback; si acertás, limpia el error activo.
       - El prompt de IA ahora audita la clave antes de justificarla.
       - Etiqueta preguntas con datos actualizables para revisión de fuente vigente.
       - Carga feedback aprobado desde Google Sheets vía JSONP y lo muestra como validado.
    */

    window.RESIDENCIAPP_APPROVED_ANALYSES ||= {};

    function isUpdatableQuestion(q){
      const hay = norm([q.q, q.tema, q.sprint, Object.values(q.opts||{}).join(' ')].join(' '));
      const patterns = ['prevalencia','incidencia','mortalidad','porcentaje','%','frecuencia','estadistica','estadístico','ranking','casos nuevos','calendario','vacuna','vacunacion','vacunación','edad de inicio','rastreo','screening','tamizaje','criterio','criterios','guia','guía','consenso','normativa','clasificacion','clasificación','2025','2024','2017','2016'];
      return patterns.some(p => hay.includes(norm(p))) || /\b\d{1,3}\s?%/.test([q.q, Object.values(q.opts||{}).join(' ')].join(' '));
    }
    function dataUpdateWarning(q){
      if(!isUpdatableQuestion(q)) return '';
      return '<div class="mt-4 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"><div class="flex items-start gap-3"><span class="mt-0.5">⚠️</span><div><p class="font-black uppercase tracking-[.14em] text-[11px]">Dato actualizable / clave para verificar</p><p class="mt-1">Esta pregunta puede depender de prevalencias, guías, calendarios, criterios o datos epidemiológicos. Antes de transformar el feedback en oficial, contrastá con fuente vigente y con el año de la pregunta.</p></div></div></div>';
    }

    function remoteApprovedMap(){ return window.RESIDENCIAPP_APPROVED_ANALYSES || {}; }
    function normalizeRemoteApprovedRecord(record){
      if(!record) return null;
      const questionId = record.questionId || record.question_id || record.id || record?.question?.id;
      if(!questionId) return null;
      const c = record.contribution || record.analysis || record;
      return { questionId, status: record.status || 'aprobado', source: 'remote-approved', approvedAt: record.approvedAt || record.fecha || record.createdAt || '', whyCorrect: c.whyCorrect || c.why_correct || c.porqueCorrecta || c['Por qué es correcta'] || '', keyData: c.keyData || c.key_data || c.datosClave || c['Datos clave'] || '', distractors: c.distractors || c.analisisDistractores || c['Análisis de distractores'] || '', goldenRule: c.goldenRule || c.golden_rule || c.reglaDeOro || c['Regla de Oro'] || '', bibliography: c.bibliography || c.bibliografia || c['Bibliografía / fuente'] || c['Bibliografía'] || '', contributorName: c.contributorName || c.colaborador || record.contributorName || '', confidence: c.confidence || record.confidence || '', updatedAt: record.updatedAt || record.createdAt || new Date().toISOString() };
    }
    function ingestApprovedFeedback(payload){
      const records = Array.isArray(payload) ? payload : (payload?.records || payload?.analyses || payload?.data || []);
      if(!Array.isArray(records)) return;
      records.forEach(r => { const item = normalizeRemoteApprovedRecord(r); if(item) window.RESIDENCIAPP_APPROVED_ANALYSES[item.questionId] = item; });
      if(records.length){ renderQuestion(); renderReview(); }
    }
    function loadApprovedCollaborationData(){
      const endpoint = getContributionEndpoint ? getContributionEndpoint() : '';
      if(!endpoint) return;
      const cb = '__residenciappApproved_'+Date.now();
      window[cb] = function(payload){ try { ingestApprovedFeedback(payload); } finally { try { delete window[cb]; } catch(e){ window[cb] = undefined; } } };
      const sep = endpoint.includes('?') ? '&' : '?';
      const script = document.createElement('script');
      script.src = endpoint + sep + 'mode=approved&callback=' + encodeURIComponent(cb) + '&_=' + Date.now();
      script.async = true;
      script.onerror = function(){ try { delete window[cb]; } catch(e){}; script.remove(); };
      script.onload = function(){ setTimeout(()=>script.remove(), 1000); };
      document.head.appendChild(script);
    }

    const __v22CollabFeedbackStatus = collabFeedbackStatus;
    collabFeedbackStatus = function(id){
      const local = (typeof getCollabAnalysis === 'function') ? getCollabAnalysis(id) : {};
      const remote = remoteApprovedMap()[id] || null;
      const fields = ['whyCorrect','keyData','distractors','goldenRule','bibliography'];
      const localHasAny = fields.some(k => collabHasText(local?.[k]));
      if(!remote) return localHasAny ? local : null;
      const merged = Object.assign({}, remote);
      fields.forEach(k => { if(collabHasText(local?.[k])) merged[k] = local[k]; });
      ['contributorName','confidence','contributionType','image'].forEach(k => { if(local?.[k]) merged[k] = local[k]; });
      merged.source = localHasAny ? 'local-over-remote' : 'remote-approved';
      return merged;
    };
    collabOfficialBadge = function(){ return '<span class="feedback-official-badge">✓ Feedback validado / colaborativo</span>'; };

    function questionSessionSelection(q){
      if(!session) return '';
      if(session.mode === 'exam' || session.mode === 'revenge') return session.selected?.[q.id] || '';
      return session.selected?.[q.id] || answerFor(q)?.selected || '';
    }
    function selectedForScoring(q, oldSession){
      if(oldSession?.mode === 'exam' || oldSession?.mode === 'revenge') return oldSession.selected?.[q.id] || '';
      return oldSession?.selected?.[q.id] || answerFor(q)?.selected || '';
    }

    function startMistakesRevengeSession(){
      const qs = Object.keys(state.mistakes||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      if(!qs.length) return alert('No tenés errores activos para revancha.');
      setSession(qs, 'Revancha de errores', 'Sin feedback · si acertás se elimina del error log', 'preguntas', true, {mode:'revenge'});
    }

    function revengeQuestionTemplate(q, selected){
      const year = q.year ? 'Año '+q.year : 'Año no detectado';
      const options = ['a','b','c','d'].map(k => { const txt = q.opts?.[k]; if(!txt) return ''; const isSel = selected===k; const cls = isSel ? 'border-medical-400 bg-medical-50 dark:border-medical-700 dark:bg-medical-950/30' : 'border-slate-200 hover:border-medical-300 dark:border-slate-700 dark:hover:border-medical-700'; return '<label class="choice block cursor-pointer"><input class="sr-only" name="choice" type="radio" value="'+k+'" '+(isSel?'checked':'')+' '+(selected?'disabled':'')+' onchange="selectAnswer(\''+q.id+'\',\''+k+'\')"><div class="rounded-3xl border '+cls+' p-4 transition"><div class="flex gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-slate-100 text-sm font-black uppercase dark:bg-slate-800">'+k+'</span><p class="text-sm font-semibold leading-6">'+esc(txt)+'</p></div></div></label>'; }).join('');
      return '<div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div class="flex flex-wrap gap-2"><span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">Revancha</span><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">'+esc(q.eje)+'</span><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">'+esc(year)+'</span></div><span class="text-xs font-black uppercase tracking-[.16em] text-rose-500">sin feedback</span></div>' + '<h3 class="font-display text-2xl font-extrabold leading-tight sm:text-3xl">'+highlightTriggerWords(q.q)+'</h3>' + dataUpdateWarning(q) + (q.image_reference ? '<div class="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">⚠️ Esta pregunta menciona una imagen/ECG/radiografía.</div>' : '') + '<div class="mt-5 grid gap-3">'+options+'</div>' + (selected ? '<div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">Respuesta registrada. En modo revancha no se muestra la corrección. Si acertaste, este error se quita del listado activo.</div>' : '<div class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100">Respondé sin mirar feedback. La pregunta solo se considera corregida si la acertás.</div>') + '<div class="mt-6 flex flex-wrap justify-between gap-3"><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" '+(session.idx===0?'disabled':'')+' onclick="prevQuestion()">← Anterior</button><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white hover:bg-medical-700" onclick="nextQuestion()">'+(session.idx===getSessionQuestions().length-1?'Terminar':'Siguiente →')+'</button></div>';
    }

    const __v22QuestionTemplateBase = questionTemplate;
    questionTemplate = function(q, selected, showExplanation){
      if(session?.mode === 'revenge') return revengeQuestionTemplate(q, selected);
      let html = __v22QuestionTemplateBase(q, selected, showExplanation);
      if(isUpdatableQuestion(q) && !html.includes('Dato actualizable')) html = html.replace('<div class="mt-6 grid gap-3">', dataUpdateWarning(q)+'<div class="mt-6 grid gap-3">');
      return html;
    };

    const __v22BaseCurrentNeedsErrorLog = currentNeedsErrorLog;
    currentNeedsErrorLog = function(){ if(session?.mode === 'exam' || session?.mode === 'revenge') return false; return __v22BaseCurrentNeedsErrorLog(); };

    renderQuestion = function(){
      if(!session){ $('#emptySession').classList.remove('hidden'); $('#sessionContent').classList.add('hidden'); renderExamTimerPanel?.(); return; }
      $('#emptySession').classList.add('hidden'); $('#sessionContent').classList.remove('hidden');
      const arr=getSessionQuestions(); const q=arr[session.idx]; if(!q){ finishSession(); return; }
      $('#sessionMethod').value = session.method; $('#sessionTitle').textContent = session.title; $('#sessionMeta').textContent = session.meta;
      const pct = Math.round(((session.idx)/arr.length)*100); $('#sessionBar').style.width = pct+'%';
      const mode = session.mode === 'exam' ? 'Simulacro' : session.mode === 'revenge' ? 'Revancha' : 'Práctica libre';
      const timingText = session.mode === 'exam' ? ' · Tiempo total: '+formatClock(session.totalSeconds)+' · Restante: '+formatClock(session.remainingSeconds) : ' · Sin tiempo';
      $('#sessionProgress').textContent = 'Pregunta '+(session.idx+1)+' de '+arr.length+' · '+mode+timingText;
      const selected = questionSessionSelection(q); const showExplanation = !!selected && session.mode !== 'exam' && session.mode !== 'revenge';
      startQuestionTimer(q); renderPerformancePanel(); $('#questionCard').innerHTML = questionTemplate(q, selected, showExplanation); renderMethodDock(q); startExamTimerIfNeeded?.();
    };

    const __v22SelectAnswer = selectAnswer;
    selectAnswer = function(id, selected){
      const wasRevenge = session?.mode === 'revenge'; const q = QUESTIONS.find(x=>x.id===id);
      __v22SelectAnswer(id, selected);
      if(wasRevenge && q){
        if(selected === q.ans){ if(state.mistakes) delete state.mistakes[id]; if(state.scheduled) delete state.scheduled[id]; if(state.retention) delete state.retention[id]; }
        else { state.mistakes[id] = Object.assign(state.mistakes[id]||{}, {id, selected, correct:q.ans, at:Date.now(), eje:q.eje, tema:q.tema, sprint:q.sprint, revengeFailedAt:Date.now()}); }
        saveState(); renderReview(); renderDueTodayHero?.(); renderAdvancedFlashcards?.(); renderQuestion();
      }
    };

    finishSession = function(reason='manual'){
      stopExamTimer?.(); if(!session){ showView('dashboard'); return; }
      const qs = getSessionQuestions(); const old = session;
      const answered = qs.filter(q=>selectedForScoring(q, old)).length;
      const correct = qs.filter(q=>{ const s=selectedForScoring(q, old); return s && s===q.ans; }).length;
      const failed = qs.filter(q=>{ const s=selectedForScoring(q, old); return s && q.ans && s!==q.ans; });
      const skipped = qs.filter(q=>!selectedForScoring(q, old)).length; const acc = answered ? Math.round(correct/answered*100) : 0;
      const wasExam = old.mode === 'exam'; const wasRevenge = old.mode === 'revenge';
      state.session = null; saveState(); session=null;
      const headline = reason === 'time' ? 'Tiempo finalizado' : wasRevenge ? 'Revancha finalizada' : 'Sesión finalizada';
      $('#resultsContent').innerHTML = '<div class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">'+headline+'</p><h3 class="mt-1 font-display text-4xl font-extrabold">'+acc+'% de precisión</h3><p class="mt-2 text-slate-600 dark:text-slate-400">'+correct+' correctas sobre '+answered+' respondidas · '+failed.length+' errores · '+skipped+' sin responder.</p>'+(wasRevenge?'<p class="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-300">Las preguntas acertadas fueron eliminadas de errores activos.</p>':'')+'<div class="mt-6 flex flex-wrap gap-3"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white" onclick="showView(\'dashboard\')">Volver al panel</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesRevengeSession()">Revancha de errores</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesSession()">Repaso guiado</button></div></div>' + '<div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">'+failed.slice(0,24).map(q => flashcardMini(q)).join('')+'</div>' + ((wasExam || wasRevenge) ? '<div class="mt-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Corrección final</p><div class="mt-4 grid gap-3">'+qs.map(q=>{ const s=selectedForScoring(q, old); const ok=s&&s===q.ans; return '<div class="rounded-2xl border '+(ok?'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/20':'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20')+' p-4"><p class="text-sm font-black">'+esc(q.q)+'</p><p class="mt-2 text-xs font-bold">Tu respuesta: '+(s?esc(s.toUpperCase()+') '+(q.opts?.[s]||'')):'Sin responder')+'</p><p class="text-xs font-bold">Correcta: '+(q.ans?esc(q.ans.toUpperCase()+') '+(q.opts?.[q.ans]||'')):'Sin clave')+'</p></div>'; }).join('')+'</div></div>' : '');
      showView('results');
    };

    renderReview = function(){
      const mistakes = Object.keys(state.mistakes||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const due = dueQuestions(); const fav = Object.keys(state.favorites||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const panel = (title, icon, qs, buttons, note='') => '<section class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div class="flex items-start justify-between gap-3"><div><p class="text-2xl">'+icon+'</p><h4 class="mt-1 font-display text-xl font-extrabold">'+title+'</h4><p class="text-sm font-bold text-slate-500">'+qs.length+' preguntas</p>'+(note?'<p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+note+'</p>':'')+'</div></div><div class="mt-4 flex flex-wrap gap-2">'+buttons+'</div><div class="mt-4 space-y-2">'+qs.slice(0,5).map(q=>'<div class="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 dark:bg-slate-950/60">'+esc(q.q.slice(0,130))+(q.q.length>130?'…':'')+'</div>').join('')+'</div></section>';
      $('#reviewPanels').innerHTML = panel('Errores activos','🧾',mistakes,'<button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="startMistakesRevengeSession()">Revancha</button><button class="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesSession()">Repaso guiado</button>','Revancha no muestra feedback. Si acertás, el error desaparece del listado.') + panel('Repasos vencidos','🔁',due,'<button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startDueSession()">Iniciar</button>') + panel('Favoritas','⭐',fav,'<button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startFavoritesSession()">Iniciar</button>');
      renderAdvancedFlashcards?.();
    };

    aiPromptForQuestion = function(q){
      return ['Actuá como docente experto en examen de residencia médica argentina.','','IMPORTANTE: no asumas que la respuesta cargada en el banco es correcta. Primero procesá el enunciado, las opciones, el año y el tema. Verificá cuál sería la respuesta más correcta según criterio actual, bibliografía argentina y enfoque de examen. Si la clave cargada parece incorrecta, desactualizada o dudosa, marcá ALERTA.','','Devolvé en este formato exacto:','','0) Verificación de clave:','- Respuesta más probable:','- ¿Coincide con la clave cargada? Sí / No / Dudosa','- Motivo:','- Si depende de epidemiología, prevalencias, guías, criterios o calendarios, aclarar año/fuente probable y si pudo cambiar.','','1) Por qué es correcta:','2) Datos clave del enunciado:','3) Análisis de distractores: explicá por qué las opciones incorrectas no corresponden.','4) Regla de Oro: una regla corta para recordar en examen.','5) Alerta de actualización:','- ¿Requiere revisar guía, consenso o dato oficial vigente? Sí / No','',questionFullText(q)].join('\n');
    };
    copyContributionPrompt = function(id){
      const q = QUESTIONS.find(x=>x.id===id); if(!q) return;
      const text = aiPromptForQuestion(q) + '\n\nCuando termines, separá tu respuesta para pegarla en estos campos de ResidenciAPP: Por qué es correcta / Datos clave / Análisis de distractores / Regla de Oro / Bibliografía.';
      navigator.clipboard?.writeText(text).then(()=>alert('Prompt verificador copiado. La IA debe auditar la clave antes de justificarla.')).catch(()=>prompt('Copiá este prompt:', text));
    };




    /* === ResidenciAPP v2.3 · Imágenes aprobadas visibles para todos ===
       Permite que una imagen enviada desde el panel colaborativo aparezca en la pregunta
       cuando la fila correspondiente esté marcada como "aprobado" en Google Sheets.
    */
    function contributionImageDisplayUrl(item){
      if(!item) return '';
      const image = item.image || {};
      const fileId = item.imageFileId || image.fileId || image.id || '';
      if(fileId) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1600';
      return item.imageUrl || image.url || image.data || '';
    }

    function contributionImageOriginalUrl(item){
      if(!item) return '';
      const image = item.image || {};
      return item.imageUrl || image.url || '';
    }

    function contributionHasImage(item){
      return !!contributionImageDisplayUrl(item);
    }

    function approvedQuestionImageHtml(q){
      const a = (typeof collabFeedbackStatus === 'function') ? collabFeedbackStatus(q.id) : null;
      if(!contributionHasImage(a)) return '';
      const displayUrl = contributionImageDisplayUrl(a);
      const originalUrl = contributionImageOriginalUrl(a);
      const label = a.source === 'remote-approved' || a.source === 'local-over-remote'
        ? 'Imagen aprobada / visible para todos'
        : 'Imagen colaborativa local';
      const openLink = originalUrl
        ? '<a class="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800" href="'+esc(originalUrl)+'" target="_blank" rel="noopener noreferrer">Abrir original</a>'
        : '';
      return '<figure class="mt-5 overflow-hidden rounded-[1.5rem] border border-medical-200 bg-white shadow-soft dark:border-medical-900/60 dark:bg-slate-950">'
        + '<div class="flex flex-wrap items-center justify-between gap-3 border-b border-medical-100 bg-medical-50 px-4 py-3 dark:border-medical-900/60 dark:bg-medical-950/30">'
        + '<div><p class="text-[11px] font-black uppercase tracking-[.16em] text-medical-700 dark:text-medical-300">'+label+'</p>'
        + '<p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Adjunta desde aportes colaborativos y validada desde la hoja de revisión.</p></div>'
        + openLink
        + '</div>'
        + '<img src="'+esc(displayUrl)+'" alt="Imagen asociada a la pregunta '+esc(q.id)+'" loading="lazy" class="max-h-[520px] w-full object-contain bg-slate-50 p-2 dark:bg-slate-900" />'
        + '</figure>';
    }

    const __v23NormalizeRemoteApprovedRecord = normalizeRemoteApprovedRecord;
    normalizeRemoteApprovedRecord = function(record){
      const item = __v23NormalizeRemoteApprovedRecord(record);
      if(!item) return null;
      const c = record.contribution || record.analysis || record || {};
      const imageUrl = c.imageUrl || c.image_url || c['Imagen URL Drive'] || record.imageUrl || record.image_url || '';
      const imageFileId = c.imageFileId || c.image_file_id || c['Imagen File ID'] || record.imageFileId || record.image_file_id || '';
      const imageName = c.imageName || c.image_name || c['Imagen nombre'] || record.imageName || '';
      const imageMimeType = c.imageMimeType || c.image_mime || c['Imagen MIME'] || record.imageMimeType || '';
      if(imageUrl || imageFileId){
        item.imageUrl = imageUrl;
        item.imageFileId = imageFileId;
        item.image = Object.assign({}, item.image || {}, {
          url: imageUrl,
          fileId: imageFileId,
          name: imageName,
          mimeType: imageMimeType
        });
      }
      return item;
    };

    const __v23CollabFeedbackStatus = collabFeedbackStatus;
    collabFeedbackStatus = function(id){
      const local = (typeof getCollabAnalysis === 'function') ? getCollabAnalysis(id) : {};
      const remote = remoteApprovedMap()[id] || null;
      const fields = ['whyCorrect','keyData','distractors','goldenRule','bibliography'];
      const localHasAny = fields.some(k => collabHasText(local?.[k])) || contributionHasImage(local);
      if(!remote) return localHasAny ? local : null;
      const merged = Object.assign({}, remote);
      fields.forEach(k => { if(collabHasText(local?.[k])) merged[k] = local[k]; });
      ['contributorName','confidence','contributionType','image','imageUrl','imageFileId'].forEach(k => { if(local?.[k]) merged[k] = local[k]; });
      merged.source = localHasAny ? 'local-over-remote' : 'remote-approved';
      return merged;
    };

    const __v23QuestionTemplate = questionTemplate;
    questionTemplate = function(q, selected, showExplanation){
      let html = __v23QuestionTemplate(q, selected, showExplanation);
      const imageHtml = approvedQuestionImageHtml(q);
      if(imageHtml && !html.includes('Imagen aprobada / visible para todos') && !html.includes('Imagen colaborativa local')){
        html = html.replace('</h3>', '</h3>' + imageHtml);
      }
      return html;
    };

    const __v23RevengeQuestionTemplate = revengeQuestionTemplate;
    revengeQuestionTemplate = function(q, selected){
      let html = __v23RevengeQuestionTemplate(q, selected);
      const imageHtml = approvedQuestionImageHtml(q);
      if(imageHtml && !html.includes('Imagen aprobada / visible para todos') && !html.includes('Imagen colaborativa local')){
        html = html.replace('</h3>', '</h3>' + imageHtml);
      }
      return html;
    };



    /* === ResidenciAPP Tutor v2.4 · Mini-apuntes locales + Regla de Oro fija + D1/D2/D4 === */
    /* === ResidenciAPP Tutor v2.6 · Pizarrón avanzado: pantalla completa, selección, texto limpio y trazos editables === */
    function ensureQuestionNotebookState(){ state.questionNotebooks ||= {}; }
    function normalizeQuestionNotebook(nb){
      nb = nb || {};
      nb.textBoxes ||= [];
      nb.strokes ||= [];
      nb.canvasBg ||= '';
      if(nb.canvasData && !nb.canvasBg && !nb.strokes.length){ nb.canvasBg = nb.canvasData; nb.canvasData = ''; }
      nb.fontSize ||= 16;
      nb.tool ||= 'pen';
      nb.drawColor ||= '#2563eb';
      nb.textColor ||= '#0f172a';
      nb.textBg ||= 'transparent';
      nb.textBorderColor ||= '#2563eb';
      nb.textBorderWidth ||= 1;
      nb.strokeWidth ||= 4;
      nb.eraserWidth ||= 26;
      nb.selectedStrokeId ||= '';
      if(nb.html && !nb.__migratedToBoard && !nb.textBoxes.length){
        nb.textBoxes.push({id:'legacy_'+Date.now(), left:4, top:5, width:34, height:30, html:nb.html, fontSize:nb.fontSize||16, color:'#0f172a', bg:'transparent', border:false, borderColor:'#2563eb', borderWidth:1});
        nb.__migratedToBoard = true;
      }
      return nb;
    }
    function getQuestionNotebook(id){ ensureQuestionNotebookState(); return normalizeQuestionNotebook(state.questionNotebooks[id] || {}); }
    function saveQuestionNotebook(id, patch={}){
      ensureQuestionNotebookState();
      state.questionNotebooks[id] = Object.assign(getQuestionNotebook(id), patch, {updatedAt:Date.now()});
      saveState();
      const saved = $('#notebookSaved_'+id);
      if(saved){ saved.textContent='Guardado · '+new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}); }
    }
    function notebookSetTool(id, tool){
      saveQuestionNotebook(id, {tool});
      document.querySelectorAll('[data-note-tool="'+id+'"]').forEach(btn=>btn.classList.toggle('is-active', btn.dataset.tool === tool));
      const board = $('#noteBoard_'+id);
      if(board) board.dataset.tool = tool;
    }
    function notebookSetColor(id, color, kind='draw'){
      const patch = kind === 'text' ? {textColor:color} : (kind === 'border' ? {textBorderColor:color} : {drawColor:color});
      saveQuestionNotebook(id, patch);
      const selected = getSelectedNoteBox(id);
      if(kind === 'text' && selected){ selected.style.color = color; saveNotebookTextBoxes(id); }
      if(kind === 'border'){
        const wrap = getSelectedNoteWrap(id);
        if(wrap){ wrap.dataset.bordered='1'; wrap.style.borderColor=color; saveNotebookTextBoxes(id); }
      }
      const preview = $('#noteColorPreview_'+id);
      if(preview && kind === 'draw') preview.style.background = color;
      redrawNotebookCanvas(id);
    }
    function notebookSetStroke(id, value){ saveQuestionNotebook(id, {strokeWidth:Math.max(1, Math.min(22, Number(value)||4))}); }
    function notebookSetEraser(id, value){ saveQuestionNotebook(id, {eraserWidth:Math.max(8, Math.min(90, Number(value)||26))}); }
    function getSelectedNoteWrap(id){ return document.querySelector('#noteTextLayer_'+id+' .note-textbox-wrap.is-selected'); }
    function getSelectedNoteBox(id){ const w = getSelectedNoteWrap(id); return w ? w.querySelector('.note-textbox') : null; }
    function selectNoteBox(id, boxId){
      document.querySelectorAll('#noteTextLayer_'+id+' .note-textbox-wrap').forEach(el=>el.classList.toggle('is-selected', el.dataset.boxId===boxId));
      saveQuestionNotebook(id, {selectedStrokeId:''});
      redrawNotebookCanvas(id);
    }
    function noteBoxDataFromDom(id){
      const layer = $('#noteTextLayer_'+id);
      if(!layer) return [];
      return Array.from(layer.querySelectorAll('.note-textbox-wrap')).map(wrap=>{
        const box = wrap.querySelector('.note-textbox');
        return {
          id: wrap.dataset.boxId,
          left: parseFloat(wrap.style.left)||4,
          top: parseFloat(wrap.style.top)||4,
          width: parseFloat(wrap.style.width)||30,
          height: parseFloat(wrap.style.height)||18,
          html: box ? box.innerHTML : '',
          fontSize: box ? parseInt(box.style.fontSize||'16',10) : 16,
          color: box ? box.style.color || '#0f172a' : '#0f172a',
          bg: box ? box.style.background || 'transparent' : 'transparent',
          border: wrap.dataset.bordered === '1',
          borderColor: wrap.style.borderColor || '#2563eb',
          borderWidth: parseInt(wrap.dataset.borderWidth||'1',10) || 1
        };
      });
    }
    function saveNotebookTextBoxes(id){ saveQuestionNotebook(id, {textBoxes:noteBoxDataFromDom(id)}); }
    function notebookFont(id, delta){
      const nb = getQuestionNotebook(id);
      const selected = getSelectedNoteBox(id);
      const size = Math.max(11, Math.min(42, (selected ? parseInt(selected.style.fontSize||nb.fontSize||16,10) : (nb.fontSize||16)) + delta));
      if(selected){ selected.style.fontSize = size+'px'; saveNotebookTextBoxes(id); }
      saveQuestionNotebook(id, {fontSize:size});
    }
    function notebookTextBg(id, color){
      saveQuestionNotebook(id, {textBg:color});
      const selected = getSelectedNoteBox(id);
      if(selected){ selected.style.background = color; saveNotebookTextBoxes(id); }
    }
    function notebookHighlightText(id){
      const selected = getSelectedNoteBox(id);
      if(!selected) return alert('Seleccioná un cuadro y marcá las palabras que querés resaltar.');
      selected.focus();
      try { document.execCommand('backColor', false, '#fef08a'); } catch(e) { document.execCommand('hiliteColor', false, '#fef08a'); }
      saveNotebookTextBoxes(id);
    }
    function notebookClearTextHighlight(id){
      const selected = getSelectedNoteBox(id);
      if(!selected) return;
      selected.focus();
      try { document.execCommand('removeFormat', false, null); } catch(e) {}
      saveNotebookTextBoxes(id);
    }
    function notebookToggleBoxBorder(id){
      const wrap = getSelectedNoteWrap(id);
      if(!wrap) return alert('Seleccioná un cuadro de texto.');
      const on = wrap.dataset.bordered !== '1';
      const nb = getQuestionNotebook(id);
      wrap.dataset.bordered = on ? '1' : '0';
      wrap.style.borderColor = nb.textBorderColor || '#2563eb';
      wrap.style.borderWidth = (nb.textBorderWidth || 1)+'px';
      saveNotebookTextBoxes(id);
    }
    function notebookSetBoxBorderWidth(id, value){
      const n = Math.max(1, Math.min(8, Number(value)||1));
      saveQuestionNotebook(id, {textBorderWidth:n});
      const wrap = getSelectedNoteWrap(id);
      if(wrap){ wrap.dataset.bordered='1'; wrap.dataset.borderWidth=String(n); wrap.style.borderWidth=n+'px'; saveNotebookTextBoxes(id); }
    }
    function toggleNotebookFullscreen(id){
      const sec = document.querySelector('[data-question-notebook="'+id+'"]');
      if(!sec) return;
      const on = !sec.classList.contains('note-fullscreen');
      document.querySelectorAll('.note-fullscreen').forEach(el=>el.classList.remove('note-fullscreen'));
      document.body.classList.toggle('note-fullscreen-active', on);
      sec.classList.toggle('note-fullscreen', on);
      const btn = $('#noteFullscreenBtn_'+id);
      if(btn) btn.textContent = on ? 'Salir de pantalla completa' : 'Pantalla completa';
      setTimeout(()=>redrawNotebookCanvas(id), 120);
    }
    function clearNotebookBoard(id){
      if(!confirm('¿Borrar TODO el pizarrón local de esta pregunta?')) return;
      const layer = $('#noteTextLayer_'+id); if(layer) layer.innerHTML='';
      saveQuestionNotebook(id, {canvasData:'', canvasBg:'', strokes:[], selectedStrokeId:'', textBoxes:[]});
      redrawNotebookCanvas(id);
    }
    function clearNotebookCanvas(id){
      if(!confirm('¿Borrar solo el dibujo del pizarrón? Los cuadros de texto quedan guardados.')) return;
      saveQuestionNotebook(id, {canvasData:'', canvasBg:'', strokes:[], selectedStrokeId:''});
      redrawNotebookCanvas(id);
    }
    function deleteSelectedTextBox(id){
      const selectedWrap = getSelectedNoteWrap(id);
      if(!selectedWrap) return alert('Seleccioná un cuadro de texto para eliminarlo.');
      selectedWrap.remove(); saveNotebookTextBoxes(id);
    }
    function renderNoteTextBox(id, box){
      const safeId = esc(String(box.id || ('box_'+Date.now())));
      const html = box.html || '';
      const bordered = !!box.border;
      const borderColor = box.borderColor || '#2563eb';
      const borderWidth = box.borderWidth || 1;
      const style = 'left:'+(box.left||4)+'%;top:'+(box.top||5)+'%;width:'+(box.width||30)+'%;height:'+(box.height||18)+'%;--note-border:'+borderColor+';border-color:'+borderColor+';border-width:'+borderWidth+'px;';
      return '<div class="note-textbox-wrap" data-box-id="'+safeId+'" data-bordered="'+(bordered?'1':'0')+'" data-border-width="'+borderWidth+'" style="'+style+'">'
        + '<button type="button" title="Eliminar texto" class="note-box-delete" onclick="event.stopPropagation();this.closest(\'.note-textbox-wrap\').remove();saveNotebookTextBoxes(\''+esc(id)+'\')">×</button>'
        + '<div class="note-textbox" contenteditable="true" oninput="saveNotebookTextBoxes(\''+esc(id)+'\')" onblur="saveNotebookTextBoxes(\''+esc(id)+'\')" style="font-size:'+(box.fontSize||16)+'px;color:'+(box.color||'#0f172a')+';background:'+(box.bg||'transparent')+'">'+html+'</div>'
        + '</div>';
    }
    function questionNotebookTemplate(q){
      const nb = getQuestionNotebook(q.id);
      const colors = ['#2563eb','#0f172a','#dc2626','#16a34a','#f59e0b','#9333ea','#db2777','#06b6d4','#84cc16','#facc15','#ffffff'];
      return '<section class="mt-5 rounded-[1.65rem] border border-violet-200 bg-white/90 p-4 shadow-soft dark:border-violet-900/60 dark:bg-slate-900/80" data-question-notebook="'+esc(q.id)+'">'
        + '<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-violet-600 dark:text-violet-300">Mini hoja personal</p><h5 class="mt-1 font-display text-xl font-extrabold">Pizarrón local de esta pregunta</h5><p class="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">Se revela después de responder. Dibujá, seleccioná trazos, mové textos, resaltá ideas y guardá tu mini esquema local.</p></div><div class="flex flex-wrap items-center gap-2"><span id="notebookSaved_'+esc(q.id)+'" class="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">Local</span><button id="noteFullscreenBtn_'+esc(q.id)+'" class="note-tool is-ghost" onclick="toggleNotebookFullscreen(\''+esc(q.id)+'\')">Pantalla completa</button></div></div>'
        + '<div class="note-ribbon mt-4">'
        + '<div class="note-toolgroup"><span>Herramienta</span><button data-note-tool="'+esc(q.id)+'" data-tool="pen" class="note-tool '+((nb.tool||'pen')==='pen'?'is-active':'')+'" onclick="notebookSetTool(\''+esc(q.id)+'\',\'pen\')">Birome</button><button data-note-tool="'+esc(q.id)+'" data-tool="eraser" class="note-tool '+(nb.tool==='eraser'?'is-active':'')+'" onclick="notebookSetTool(\''+esc(q.id)+'\',\'eraser\')">Borrador</button><button data-note-tool="'+esc(q.id)+'" data-tool="text" class="note-tool '+(nb.tool==='text'?'is-active':'')+'" onclick="notebookSetTool(\''+esc(q.id)+'\',\'text\')">Texto</button><button data-note-tool="'+esc(q.id)+'" data-tool="move" class="note-tool '+(nb.tool==='move'?'is-active':'')+'" onclick="notebookSetTool(\''+esc(q.id)+'\',\'move\')">Seleccionar</button></div>'
        + '<div class="note-toolgroup note-colors"><span>Birome</span>'+colors.map(c=>'<button class="note-color" style="background:'+c+'" onclick="notebookSetColor(\''+esc(q.id)+'\',\''+c+'\',\'draw\')" title="'+c+'"></button>').join('')+'<input class="note-color-input" type="color" value="'+esc(nb.drawColor||'#2563eb')+'" onchange="notebookSetColor(\''+esc(q.id)+'\',this.value,\'draw\')"><span id="noteColorPreview_'+esc(q.id)+'" class="note-color-preview" style="background:'+(nb.drawColor||'#2563eb')+'"></span></div>'
        + '<div class="note-toolgroup"><span>Trazo</span><select class="note-select" onchange="notebookSetStroke(\''+esc(q.id)+'\',this.value)"><option value="2">Fino</option><option value="4" '+((nb.strokeWidth||4)==4?'selected':'')+'>Normal</option><option value="8" '+((nb.strokeWidth||4)==8?'selected':'')+'>Grueso</option><option value="14" '+((nb.strokeWidth||4)==14?'selected':'')+'>Marcador</option></select><span>Borrador</span><select class="note-select" onchange="notebookSetEraser(\''+esc(q.id)+'\',this.value)"><option value="16">Chico</option><option value="28" '+((nb.eraserWidth||26)>=24&&(nb.eraserWidth||26)<40?'selected':'')+'>Medio</option><option value="52" '+((nb.eraserWidth||26)>=40?'selected':'')+'>Grande</option></select></div>'
        + '<div class="note-toolgroup"><span>Texto</span><button class="note-tool" onclick="notebookFont(\''+esc(q.id)+'\',-1)">A−</button><button class="note-tool" onclick="notebookFont(\''+esc(q.id)+'\',1)">A+</button><input class="note-color-input" type="color" value="'+esc(nb.textColor||'#0f172a')+'" title="Color del texto" onchange="notebookSetColor(\''+esc(q.id)+'\',this.value,\'text\')"><button class="note-tool" onclick="notebookHighlightText(\''+esc(q.id)+'\')">Resaltar letras</button><button class="note-tool" onclick="notebookTextBg(\''+esc(q.id)+'\',\'transparent\')">Fondo limpio</button><button class="note-tool" onclick="deleteSelectedTextBox(\''+esc(q.id)+'\')">Eliminar texto</button></div>'
        + '<div class="note-toolgroup"><span>Recuadro</span><button class="note-tool" onclick="notebookToggleBoxBorder(\''+esc(q.id)+'\')">Borde sí/no</button><input class="note-color-input" type="color" value="'+esc(nb.textBorderColor||'#2563eb')+'" title="Color del borde" onchange="notebookSetColor(\''+esc(q.id)+'\',this.value,\'border\')"><select class="note-select" onchange="notebookSetBoxBorderWidth(\''+esc(q.id)+'\',this.value)"><option value="1">1 px</option><option value="2">2 px</option><option value="4">4 px</option><option value="6">6 px</option></select></div>'
        + '<div class="note-toolgroup"><button class="note-tool danger" onclick="clearNotebookCanvas(\''+esc(q.id)+'\')">Limpiar dibujo</button><button class="note-tool danger" onclick="clearNotebookBoard(\''+esc(q.id)+'\')">Limpiar todo</button></div>'
        + '</div>'
        + '<div class="note-board-shell mt-3"><div id="noteBoard_'+esc(q.id)+'" class="note-board" data-tool="'+esc(nb.tool||'pen')+'"><canvas id="noteCanvas_'+esc(q.id)+'" class="note-canvas" width="1400" height="820"></canvas><div id="noteTextLayer_'+esc(q.id)+'" class="note-text-layer">'+(nb.textBoxes||[]).map(b=>renderNoteTextBox(q.id,b)).join('')+'</div><div class="note-board-hint">Seleccionar: mové cuadros y trazos · Texto: click para insertar · Borrador: borra partes del dibujo</div></div></div>'
        + '</section>';
    }
    function redrawNotebookCanvas(id){
      const canvas = $('#noteCanvas_'+id); if(!canvas) return;
      const ctx = canvas.getContext('2d'); const nb = getQuestionNotebook(id);
      ctx.clearRect(0,0,canvas.width,canvas.height); ctx.lineCap='round'; ctx.lineJoin='round';
      const drawStrokes = () => {
        (nb.strokes||[]).forEach(st=>{
          if(!st.points || st.points.length<2) return;
          ctx.save(); ctx.strokeStyle=st.color||'#2563eb'; ctx.lineWidth=st.width||4; ctx.globalCompositeOperation='source-over';
          ctx.beginPath(); ctx.moveTo(st.points[0].x, st.points[0].y);
          for(let i=1;i<st.points.length;i++) ctx.lineTo(st.points[i].x, st.points[i].y);
          ctx.stroke();
          if(nb.selectedStrokeId && st.id===nb.selectedStrokeId){
            const b = strokeBounds(st); if(b){ ctx.setLineDash([10,8]); ctx.lineWidth=2; ctx.strokeStyle='rgba(37,99,235,.85)'; ctx.strokeRect(b.minX-10,b.minY-10,(b.maxX-b.minX)+20,(b.maxY-b.minY)+20); }
          }
          ctx.restore();
        });
      };
      if(nb.canvasBg){ const img=new Image(); img.onload=()=>{ ctx.drawImage(img,0,0,canvas.width,canvas.height); drawStrokes(); }; img.src=nb.canvasBg; } else drawStrokes();
    }
    function strokeBounds(st){ if(!st.points?.length) return null; const xs=st.points.map(p=>p.x), ys=st.points.map(p=>p.y); return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}; }
    function distToSeg(p,a,b){ const dx=b.x-a.x, dy=b.y-a.y; if(dx===0&&dy===0) return Math.hypot(p.x-a.x,p.y-a.y); let t=((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy); t=Math.max(0,Math.min(1,t)); return Math.hypot(p.x-(a.x+t*dx), p.y-(a.y+t*dy)); }
    function hitTestStroke(id,p){ const nb=getQuestionNotebook(id); let hit=null, best=1e9; (nb.strokes||[]).forEach(st=>{ for(let i=1;i<(st.points||[]).length;i++){ const d=distToSeg(p,st.points[i-1],st.points[i]); const threshold=Math.max(12,(st.width||4)+8); if(d<threshold && d<best){ best=d; hit=st; } } }); return hit; }
    function eraseNotebookStrokes(id,p,radius){
      const nb=getQuestionNotebook(id); const out=[];
      (nb.strokes||[]).forEach(st=>{
        let seg=[];
        (st.points||[]).forEach(pt=>{
          if(Math.hypot(pt.x-p.x, pt.y-p.y) <= radius){ if(seg.length>1) out.push(Object.assign({},st,{id:st.id+'_'+out.length,points:seg})); seg=[]; }
          else seg.push(pt);
        });
        if(seg.length>1) out.push(Object.assign({},st,{id:st.id+'_'+out.length,points:seg}));
      });
      saveQuestionNotebook(id,{strokes:out,selectedStrokeId:''}); redrawNotebookCanvas(id);
    }
    function setupQuestionNotebook(id){
      const canvas = $('#noteCanvas_'+id); const board = $('#noteBoard_'+id); const layer = $('#noteTextLayer_'+id);
      if(!canvas || !board || !layer || canvas.dataset.ready === '1') return;
      canvas.dataset.ready = '1';
      const ctx = canvas.getContext('2d'); canvas._ctx = ctx; redrawNotebookCanvas(id);
      const posCanvas = (ev) => { const rect = canvas.getBoundingClientRect(); const p = ev.touches ? ev.touches[0] : ev; return {x:(p.clientX-rect.left)*(canvas.width/rect.width), y:(p.clientY-rect.top)*(canvas.height/rect.height)}; };
      const posBoardPct = (ev) => { const rect = board.getBoundingClientRect(); const p = ev.touches ? ev.touches[0] : ev; return {x:((p.clientX-rect.left)/rect.width)*100, y:((p.clientY-rect.top)/rect.height)*100}; };
      let drawing=false, currentStroke=null, dragStroke=null, lastPoint=null;
      const startDraw = (ev) => {
        const tool = getQuestionNotebook(id).tool || 'pen';
        if(tool === 'text') { if(ev.target === canvas || ev.target === layer || ev.target === board){ createNotebookTextBoxAt(id, posBoardPct(ev)); ev.preventDefault(); } return; }
        const p = posCanvas(ev);
        if(tool === 'move'){
          const st=hitTestStroke(id,p);
          if(st){ saveQuestionNotebook(id,{selectedStrokeId:st.id}); dragStroke={id:st.id,start:p,orig:st.points.map(pt=>({x:pt.x,y:pt.y}))}; redrawNotebookCanvas(id); ev.preventDefault(); }
          return;
        }
        if(tool === 'eraser'){ drawing=true; lastPoint=p; eraseNotebookStrokes(id,p,getQuestionNotebook(id).eraserWidth||26); ev.preventDefault(); return; }
        if(tool !== 'pen') return;
        const nb=getQuestionNotebook(id);
        currentStroke={id:'stroke_'+Date.now(), color:nb.drawColor||'#2563eb', width:nb.strokeWidth||4, points:[p]};
        drawing=true; ev.preventDefault();
      };
      const moveDraw = (ev) => {
        const tool = getQuestionNotebook(id).tool || 'pen'; const p=posCanvas(ev);
        if(dragStroke){
          const nb=getQuestionNotebook(id); const dx=p.x-dragStroke.start.x, dy=p.y-dragStroke.start.y;
          const strokes=(nb.strokes||[]).map(st=>st.id===dragStroke.id?Object.assign({},st,{points:dragStroke.orig.map(pt=>({x:pt.x+dx,y:pt.y+dy}))}):st);
          state.questionNotebooks[id]=Object.assign(nb,{strokes}); redrawNotebookCanvas(id); ev.preventDefault(); return;
        }
        if(!drawing) return;
        if(tool === 'eraser'){ eraseNotebookStrokes(id,p,getQuestionNotebook(id).eraserWidth||26); lastPoint=p; ev.preventDefault(); return; }
        if(tool === 'pen' && currentStroke){ currentStroke.points.push(p); ctx.save(); ctx.strokeStyle=currentStroke.color; ctx.lineWidth=currentStroke.width; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(currentStroke.points[currentStroke.points.length-2].x,currentStroke.points[currentStroke.points.length-2].y); ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.restore(); ev.preventDefault(); }
      };
      const endDraw = () => {
        if(dragStroke){ const nb=getQuestionNotebook(id); saveQuestionNotebook(id,{strokes:nb.strokes||[]}); dragStroke=null; redrawNotebookCanvas(id); return; }
        if(!drawing) return; drawing=false;
        if(currentStroke && currentStroke.points.length>1){ const nb=getQuestionNotebook(id); const strokes=(nb.strokes||[]).concat([currentStroke]); saveQuestionNotebook(id,{strokes,selectedStrokeId:''}); currentStroke=null; redrawNotebookCanvas(id); }
      };
      canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', moveDraw); window.addEventListener('mouseup', endDraw);
      canvas.addEventListener('touchstart', startDraw, {passive:false}); canvas.addEventListener('touchmove', moveDraw, {passive:false}); canvas.addEventListener('touchend', endDraw);
      board.addEventListener('click', (ev)=>{ if((getQuestionNotebook(id).tool||'pen')==='text' && (ev.target===layer || ev.target===board)){ createNotebookTextBoxAt(id,posBoardPct(ev)); } });
      setupNotebookTextBoxEvents(id);
    }
    function createNotebookTextBoxAt(id, pt){
      const nb = getQuestionNotebook(id);
      const box = {id:'box_'+Date.now(), left:Math.max(1, Math.min(82, pt.x)), top:Math.max(1, Math.min(82, pt.y)), width:28, height:12, html:'Escribí acá…', fontSize:nb.fontSize||16, color:nb.textColor||'#0f172a', bg:nb.textBg||'transparent', border:false, borderColor:nb.textBorderColor||'#2563eb', borderWidth:nb.textBorderWidth||1};
      const layer = $('#noteTextLayer_'+id); if(!layer) return;
      layer.insertAdjacentHTML('beforeend', renderNoteTextBox(id, box)); setupNotebookTextBoxEvents(id); selectNoteBox(id, box.id);
      const el = layer.querySelector('[data-box-id="'+box.id+'"] .note-textbox');
      if(el){ el.focus(); document.execCommand && document.execCommand('selectAll', false, null); }
      saveNotebookTextBoxes(id);
    }
    function setupNotebookTextBoxEvents(id){
      const layer = $('#noteTextLayer_'+id); if(!layer || layer.dataset.ready === '1') return;
      layer.dataset.ready = '1';
      let drag=null;
      const startDrag = (ev)=>{
        const wrap = ev.target.closest('.note-textbox-wrap'); if(!wrap) return;
        selectNoteBox(id, wrap.dataset.boxId);
        if((getQuestionNotebook(id).tool||'pen') !== 'move') return;
        const p = ev.touches ? ev.touches[0] : ev;
        const rect = layer.getBoundingClientRect();
        drag = {wrap, rect, sx:p.clientX, sy:p.clientY, left:parseFloat(wrap.style.left)||0, top:parseFloat(wrap.style.top)||0};
        ev.preventDefault();
      };
      const moveDrag = (ev)=>{
        if(!drag) return;
        const p = ev.touches ? ev.touches[0] : ev;
        const dx = (p.clientX-drag.sx)/drag.rect.width*100; const dy = (p.clientY-drag.sy)/drag.rect.height*100;
        drag.wrap.style.left = Math.max(0, Math.min(88, drag.left+dx))+'%'; drag.wrap.style.top = Math.max(0, Math.min(88, drag.top+dy))+'%'; ev.preventDefault();
      };
      const endDrag = ()=>{ if(drag){ saveNotebookTextBoxes(id); drag=null; } };
      layer.addEventListener('mousedown', startDrag); window.addEventListener('mousemove', moveDrag); window.addEventListener('mouseup', endDrag);
      layer.addEventListener('touchstart', startDrag, {passive:false}); window.addEventListener('touchmove', moveDrag, {passive:false}); window.addEventListener('touchend', endDrag);
      layer.addEventListener('mouseup', ()=>setTimeout(()=>saveNotebookTextBoxes(id), 50)); layer.addEventListener('touchend', ()=>setTimeout(()=>saveNotebookTextBoxes(id), 50));
      layer.addEventListener('input', ()=>saveNotebookTextBoxes(id)); layer.addEventListener('click', (ev)=>{ const wrap = ev.target.closest('.note-textbox-wrap'); if(wrap) selectNoteBox(id, wrap.dataset.boxId); });
    }
    function goldenRuleDefaultHint(q){
      const hasAns = q.ans && q.opts?.[q.ans];
      if(!hasAns) return '<p>Regla de Oro pendiente: primero revisá la clave correcta de esta pregunta.</p>';
      if(/conducta|tratamiento|manejo|indica|solicita|realizar|a seguir/i.test(q.q)) return '<p><strong>Regla de examen:</strong> identificá gravedad, urgencia y dato bisagra; la opción correcta debe cambiar la conducta con menos supuestos.</p>';
      if(/diagn[oó]stico|sospecha|presuntivo/i.test(q.q)) return '<p><strong>Regla de examen:</strong> edad + síntoma cardinal + laboratorio/imagen mandan sobre distractores aislados.</p>';
      if(/prevalencia|porcentaje|incidencia|mortalidad|edad|calendario|criterio|gu[ií]a/i.test(q.q)) return '<p><strong>Dato actualizable:</strong> convertir en flashcard y verificar contra fuente vigente antes de validar feedback oficial.</p>';
      return '<p><strong>Regla de examen:</strong> transformá el dato clave en una frase corta que puedas recuperar sin mirar opciones.</p>';
    }
    function goldenRuleExperienceBlock(q){
      const a = (typeof collabFeedbackStatus === 'function') ? collabFeedbackStatus(q.id) : null;
      const body = a && collabHasText(a.goldenRule)
        ? collabOfficialBadge() + '<div class="mt-3">'+textToParagraphs(a.goldenRule)+'</div>'
        : '<div id="feedback_goldenRule_'+esc(q.id)+'">'+goldenRuleDefaultHint(q)+'<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Cuando cargues una Regla de Oro en el aporte colaborativo, reemplazará esta guía local.</p></div>';
      return '<div data-v24-golden-rule>'+learningPanelItem('Regla de Oro', body, 'emerald')+'</div>';
    }
    const __v24ExplanationTemplate = explanationTemplate;
    explanationTemplate = function(q, selected){
      let html = __v24ExplanationTemplate(q, selected);
      if(!html.includes('data-v24-golden-rule')){
        html = html.replace('<div class="mt-4 flex flex-wrap gap-2">', '<div class="mt-3">'+goldenRuleExperienceBlock(q)+'</div><div class="mt-4 flex flex-wrap gap-2">');
      }
      if(!html.includes('data-question-notebook="'+esc(q.id)+'"')){
        html = html.replace('</section>', questionNotebookTemplate(q) + '</section>');
      }
      return html;
    };
    const __v24RenderQuestion = renderQuestion;
    renderQuestion = function(){
      __v24RenderQuestion();
      try {
        if(session){ const q=getSessionQuestions()[session.idx]; const selected = q ? questionSessionSelection(q) : ''; if(q && selected && session.mode !== 'exam' && session.mode !== 'revenge') setupQuestionNotebook(q.id); }
      } catch(e) {}
    };


    /* === ResidenciAPP v2.7 · NeuroPREP adaptive layer ===
       Sección nueva: diagnóstico cognitivo, razonamiento antes de opciones,
       interleaving automático y examen predictivo. Funciona localmente sobre
       el banco y el progreso actual, sin requerir backend ni IA privada.
    */
    function ensureNeuroState(){ state.neuroprep ||= {reasoning:{}, confidence:{}, diagnosticHistory:[], lastPlan:null}; }
    function neuroQuestionScore(q){
      const ans = answerFor(q); const mistake = state.mistakes?.[q.id]; const scheduled = state.scheduled?.[q.id] || state.retention?.[q.id];
      let score = 0;
      if(mistake) score += 9;
      if(scheduled && scheduled.due <= todayKey()) score += 6;
      if(!ans) score += 2;
      if(ans && ans.selected !== q.ans) score += 5;
      if(isUpdatableQuestion?.(q)) score += 1;
      const temaStats = topicAccuracy(q.tema);
      if(temaStats.answered && temaStats.acc < 60) score += 4;
      if(temaStats.answered && temaStats.acc < 80) score += 2;
      return score + Math.random();
    }
    function topicAccuracy(tema){
      const qs = QUESTIONS.filter(q=>q.tema===tema); const answered = qs.filter(q=>answerFor(q)).length; const correct = qs.filter(q=>isCorrect(q)).length;
      return {answered, total:qs.length, correct, acc: answered ? Math.round(correct/answered*100) : 0};
    }
    function weakestTopics(limit=6){
      const temas = [...new Set(QUESTIONS.map(q=>q.tema).filter(Boolean))];
      return temas.map(t=>Object.assign({tema:t},topicAccuracy(t))).filter(x=>x.answered>0).sort((a,b)=>a.acc-b.acc || b.answered-a.answered).slice(0,limit);
    }
    function activeMistakeReasonSummary(){
      const counts = {};
      Object.values(state.mistakes||{}).forEach(m=>{ const r=m.reason||m.errorReason||m.category||'sin_clasificar'; counts[r]=(counts[r]||0)+1; });
      return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({id:k,label:ERROR_REASONS.find(r=>r.id===k)?.label || label(k), count:v}));
    }
    function pickDistinctQuestions(count=10, opts={}){
      const usedTema = new Set(); const usedEje = new Set();
      const sorted = QUESTIONS.slice().sort((a,b)=>neuroQuestionScore(b)-neuroQuestionScore(a));
      const out=[];
      sorted.forEach(q=>{
        if(out.length>=count) return;
        if(opts.distinctEje && usedEje.has(q.eje)) return;
        if(opts.distinctTema && usedTema.has(q.tema) && out.length < Math.min(count, 8)) return;
        out.push(q); usedTema.add(q.tema); usedEje.add(q.eje);
      });
      if(out.length<count){
        sorted.forEach(q=>{ if(out.length<count && !out.some(x=>x.id===q.id)) out.push(q); });
      }
      return out.slice(0,count);
    }
    function startNeuroDiagnostic(){
      ensureNeuroState();
      const qs = pickDistinctQuestions(3,{distinctEje:true});
      if(!qs.length) return alert('No hay preguntas disponibles para diagnóstico.');
      state.neuroprep.lastPlan = {type:'diagnostic', at:Date.now(), ids:qs.map(q=>q.id)}; saveState();
      setSession(qs, 'NeuroPREP · Diagnóstico rápido', '3 preguntas · razonamiento sin opciones + confianza', 'razonamiento', true, {mode:'practice'});
      session.neuroprepType = 'diagnostic'; state.session=session; saveState();
    }
    function startNeuroReasoning(){
      ensureNeuroState(); const qs = pickDistinctQuestions(10,{distinctTema:true});
      setSession(qs, 'NeuroPREP · Razonamiento guiado', '10 preguntas · primero hipótesis, después ABCD', 'razonamiento', true, {mode:'practice'});
      session.neuroprepType = 'reasoning'; state.session=session; saveState();
    }
    function startNeuroInterleaving(){
      ensureNeuroState(); const qs = pickDistinctQuestions(15,{distinctTema:true});
      setSession(qs, 'NeuroPREP · Interleaving automático', '15 preguntas mezcladas por ejes y temas', 'preguntas', true, {mode:'practice'});
      session.neuroprepType = 'interleaving'; state.session=session; saveState();
    }
    function startNeuroPredictiveExam(){
      ensureNeuroState(); const qs = pickDistinctQuestions(Math.min(40, QUESTIONS.length),{distinctTema:true});
      setSession(qs, 'NeuroPREP · Examen predictivo', qs.length+' preguntas · timer 1:30 por pregunta', 'simulacro', true, {mode:'exam', secondsPerQuestion:90});
      session.neuroprepType = 'predictive_exam'; state.session=session; saveState();
    }
    function startNeuroRecommended(){
      const mistakes = Object.keys(state.mistakes||{}).length; const due = dueReviewItems ? dueReviewItems().length : dueQuestions().length;
      if(due >= 8) return startDueSession();
      if(mistakes >= 8) return startMistakesRevengeSession ? startMistakesRevengeSession() : startMistakesSession();
      return startNeuroReasoning();
    }
    function renderNeuroprep(){
      const root = $('#neuroprepView'); if(!root) return; ensureNeuroState();
      const answered = globalAnsweredQuestions().length; const acc = globalAccuracy(); const avg = formatDuration(averageQuestionTime());
      const mistakes = Object.keys(state.mistakes||{}).length; const due = dueReviewItems ? dueReviewItems().length : dueQuestions().length;
      const weak = weakestTopics(4); const reasons = activeMistakeReasonSummary();
      const stateLabel = answered < 20 ? 'Exploración inicial' : acc >= 80 && mistakes < 8 ? 'Afilado' : due > 10 ? 'Necesita consolidación' : mistakes > 10 ? 'Reparar errores' : 'Entrenamiento mixto';
      const recommendation = due > 10 ? 'Repaso espaciado vencido' : mistakes > 10 ? 'Revancha de errores' : weak.length ? 'Razonamiento guiado en temas débiles' : 'Interleaving automático';
      const stateCard = $('#neuroStateCard');
      if(stateCard) stateCard.innerHTML = '<p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Estado cognitivo estimado</p><h4 class="mt-2 font-display text-3xl font-extrabold">'+esc(stateLabel)+'</h4><div class="mt-4 grid grid-cols-2 gap-3 text-sm">'
        + '<div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Precisión</p><p class="text-2xl font-black">'+acc+'%</p></div>'
        + '<div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Tiempo medio</p><p class="text-2xl font-black">'+esc(avg)+'</p></div>'
        + '<div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Errores</p><p class="text-2xl font-black">'+mistakes+'</p></div>'
        + '<div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><p class="text-xs font-black uppercase text-slate-400">Vencidas</p><p class="text-2xl font-black">'+due+'</p></div></div>'
        + '<p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400"><strong>Recomendación:</strong> '+esc(recommendation)+'.</p>';
      const rec = $('#neuroRecommendation');
      if(rec) rec.innerHTML = '<div class="rounded-3xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20"><p class="text-sm font-black text-indigo-800 dark:text-indigo-200">Próximo bloque sugerido</p><h4 class="mt-1 font-display text-2xl font-extrabold">'+esc(recommendation)+'</h4><p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">El algoritmo prioriza esfuerzo de recuperación por encima de relectura. Si estás cansado, elegí diagnóstico rápido; si estás afilado, examen predictivo.</p><button class="mt-4 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white" onclick="startNeuroRecommended()">Iniciar recomendado</button></div>'
        + '<div class="mt-4 grid gap-3">'+(reasons.length?reasons.slice(0,4).map(r=>'<div class="flex items-center justify-between rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><span class="text-sm font-bold">'+esc(r.label)+'</span><span class="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">'+r.count+'</span></div>').join(''):'<p class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700">Todavía no hay patrón de error suficiente. Hacé un diagnóstico rápido.</p>')+'</div>';
      const graph = $('#neuroGraph');
      if(graph){
        const topics = weak.length ? weak : SPRINTS.slice(0,6).map(s=>({tema:s.tema, acc:topicAccuracy(s.tema).acc, answered:topicAccuracy(s.tema).answered,total:topicAccuracy(s.tema).total}));
        graph.innerHTML = '<div class="neuro-graph-canvas">'+topics.slice(0,6).map((t,i)=>{ const size = 92 + Math.min(50, (t.total||10)); const color = !t.answered ? 'slate' : t.acc>=80?'emerald':t.acc>=60?'amber':'rose'; return '<button class="neuro-node neuro-node-'+color+'" style="--x:'+(8+(i%3)*31)+'%;--y:'+(14+Math.floor(i/3)*42)+'%;--s:'+Math.min(142,size)+'px" onclick="focusSprintByTema(\''+esc(t.tema).replace(/'/g,'&#039;')+'\')"><span>'+esc(t.tema)+'</span><b>'+(t.answered?t.acc+'%':'nuevo')+'</b></button>'; }).join('')+'<svg class="neuro-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M20 25 C40 10 56 42 78 25 M20 68 C38 48 58 88 78 68 M20 25 C25 42 25 54 20 68 M50 25 C50 42 50 54 50 68 M78 25 C72 42 72 54 78 68"/></svg></div>';
      }
    }
    function focusSprintByTema(tema){ showView('dashboard'); const tf=$('#temaFilter'); if(tf){ const eje = SPRINTS.find(s=>s.tema===tema)?.eje || ''; if($('#ejeFilter')){ $('#ejeFilter').value=eje; updateTemaFilter(); } tf.value=tema; renderSprints(); } }
    function saveNeuroReasoning(qid){
      ensureNeuroState(); if(!session) return;
      const txt = $('#neuroHypothesis_'+qid)?.value || '';
      const conf = document.querySelector('input[name="neuroConf_'+qid+'"]:checked')?.value || 'sin_calibrar';
      state.neuroprep.reasoning[qid] = {text:txt, confidence:conf, at:Date.now()};
      session.reasoningUnlocked ||= {}; session.reasoningUnlocked[qid]=true; state.session=session; saveState(); renderQuestion();
    }
    const __v27QuestionTemplate = questionTemplate;
    function neuroReasoningGateTemplate(q){
      const prev = state.neuroprep?.reasoning?.[q.id] || {};
      return '<div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div class="flex flex-wrap gap-2"><span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">NeuroPREP</span><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">Razonamiento antes de opciones</span></div><span class="text-xs font-black uppercase tracking-[.16em] text-indigo-500">sin ABCD todavía</span></div>'
        + '<h3 class="font-display text-2xl font-extrabold leading-tight sm:text-3xl">'+highlightTriggerWords(q.q)+'</h3>' + (dataUpdateWarning?.(q) || '')
        + '<div class="mt-5 rounded-[1.75rem] border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/20"><p class="text-xs font-black uppercase tracking-[.18em] text-indigo-700 dark:text-indigo-300">Paso 1 · recuperación activa</p><h4 class="mt-1 font-display text-xl font-extrabold">Antes de ver opciones, escribí tu hipótesis</h4><textarea id="neuroHypothesis_'+esc(q.id)+'" class="mt-4 min-h-32 w-full rounded-2xl border border-indigo-200 bg-white p-4 text-sm font-semibold leading-6 outline-none focus:border-indigo-400 dark:border-indigo-800 dark:bg-slate-950" placeholder="Diagnóstico/conducta probable, dato clave y por qué…">'+esc(prev.text||'')+'</textarea><div class="mt-4 grid gap-2 sm:grid-cols-3"><label class="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm font-black dark:border-slate-700 dark:bg-slate-900"><input type="radio" name="neuroConf_'+esc(q.id)+'" value="seguro" '+(prev.confidence==='seguro'?'checked':'')+'> Seguro</label><label class="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm font-black dark:border-slate-700 dark:bg-slate-900"><input type="radio" name="neuroConf_'+esc(q.id)+'" value="dudaba" '+(prev.confidence==='dudaba'?'checked':'')+'> Dudaba</label><label class="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm font-black dark:border-slate-700 dark:bg-slate-900"><input type="radio" name="neuroConf_'+esc(q.id)+'" value="adivine" '+(prev.confidence==='adivine'?'checked':'')+'> Adiviné</label></div><button class="mt-4 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-indigo-700" onclick="saveNeuroReasoning(\''+esc(q.id)+'\')">Guardar hipótesis y mostrar opciones</button></div>'
        + '<div class="mt-6 flex flex-wrap justify-between gap-3"><button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" '+(session.idx===0?'disabled':'')+' onclick="prevQuestion()">← Anterior</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="nextQuestion()">Saltar →</button></div>';
    }
    questionTemplate = function(q, selected, showExplanation){
      ensureNeuroState();
      if(session?.method === 'razonamiento' && session?.mode !== 'exam' && !selected && !session?.reasoningUnlocked?.[q.id]) return neuroReasoningGateTemplate(q);
      let html = __v27QuestionTemplate(q, selected, showExplanation);
      const r = state.neuroprep?.reasoning?.[q.id];
      if(session?.method === 'razonamiento' && r && !html.includes('data-neuro-reasoning-summary')){
        const box = '<div data-neuro-reasoning-summary class="mb-5 rounded-3xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-950 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-indigo-100"><p class="text-xs font-black uppercase tracking-[.16em] text-indigo-700 dark:text-indigo-300">Tu hipótesis previa · confianza: '+esc(label(r.confidence||'sin calibrar'))+'</p><p class="mt-2 whitespace-pre-wrap">'+esc(r.text||'Sin texto guardado')+'</p></div>';
        html = html.replace('<h3 class="font-display', box+'<h3 class="font-display');
      }
      return html;
    };


    /* === ResidenciAPP Tutor v2.8 · Pizarrón avanzado consolidado + NeuroPREP funcional ===
       Consolida lo pedido: pizarrón con pantalla completa robusta, texto sin rebordes por defecto,
       selección/movimiento de textos y trazos, y NeuroPREP operativo con diagnóstico, reflexión
       post-respuesta, plan correctivo y registro local de sesiones.
    */
    function neuroTodayHistory(){ ensureNeuroState(); const day=todayKey(); return (state.neuroprep.diagnosticHistory||[]).filter(x=>String(x.date||'').slice(0,10)===day || String(new Date(x.at||0).toISOString()).slice(0,10)===day); }
    function neuroDueQuestions(){ return (typeof dueReviewItems === 'function' ? dueReviewItems() : dueQuestions()).map(x=>x.question || x).filter(Boolean); }
    function neuroMistakeQuestions(){ return Object.keys(state.mistakes||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean); }
    function neuroConfidenceStats(ids){
      ensureNeuroState();
      const out={seguro:{total:0,ok:0},dudaba:{total:0,ok:0},adivine:{total:0,ok:0},sin_calibrar:{total:0,ok:0}};
      (ids||[]).forEach(id=>{
        const q=QUESTIONS.find(x=>x.id===id); if(!q) return;
        const r=state.neuroprep?.reasoning?.[id]||{};
        const c=r.confidence||'sin_calibrar';
        const s=state.answers?.[id]?.selected || session?.selected?.[id] || '';
        if(!out[c]) out[c]={total:0,ok:0};
        out[c].total++; if(s && s===q.ans) out[c].ok++;
      });
      return out;
    }
    function neuroCalibrationText(stats){
      const segura=stats.seguro||{total:0,ok:0};
      if(segura.total>=2){ const pct=Math.round(segura.ok/segura.total*100); if(pct<70) return 'Sobreconfianza: marcaste “seguro” pero fallaste más de lo esperado. Próximo bloque: razonamiento lento y distractores.'; if(pct>=90) return 'Buena calibración: cuando marcás “seguro”, tu respuesta suele ser correcta. Podés subir dificultad.'; }
      const dudosa=stats.dudaba||{total:0,ok:0};
      if(dudosa.total>=2 && Math.round(dudosa.ok/dudosa.total*100)>=70) return 'Duda productiva: aunque dudabas, acertaste. Conviene entrenar confianza y velocidad.';
      return 'Aún falta muestra para calibrar. Seguí usando “Seguro / Dudaba / Adiviné” antes de ver opciones.';
    }
    function neuroBuildTrainingPlan(failed=[], skipped=0, acc=0){
      const mistakes = neuroMistakeQuestions(); const due = neuroDueQuestions(); const weak = weakestTopics(4); const reasons = activeMistakeReasonSummary();
      const items=[];
      if(due.length) items.push({icon:'🔁',title:'Repaso espaciado vencido',body:'Resolver '+Math.min(due.length,12)+' preguntas vencidas antes de sumar contenido nuevo.',action:'startDueSession()'});
      if(mistakes.length) items.push({icon:'🥊',title:'Revancha de errores',body:'Hacer revancha sin feedback. Si acertás, el error sale de la bandeja.',action:'startMistakesRevengeSession()'});
      if(weak.length) items.push({icon:'🧬',title:'Razonamiento guiado focal',body:'Entrenar hipótesis previa en: '+weak.slice(0,2).map(x=>x.tema).join(' · ')+'.',action:'startNeuroReasoning()'});
      if(acc>=75 && failed.length<=3) items.push({icon:'🔀',title:'Interleaving automático',body:'Mezclar temas para reforzar discriminación clínica y evitar comodidad por bloque.',action:'startNeuroInterleaving()'});
      if(!items.length) items.push({icon:'⏱️',title:'Examen predictivo',body:'Simulacro de 40 preguntas con timer para medir rendimiento real.',action:'startNeuroPredictiveExam()'});
      const pattern = reasons[0] ? ('Patrón dominante: '+reasons[0].label+' ('+reasons[0].count+').') : 'Todavía no hay patrón dominante de error.';
      return {items:items.slice(0,4), pattern};
    }
    function neuroPlanHtml(plan){
      return '<div class="mt-6 rounded-[2rem] border border-indigo-200 bg-indigo-50 p-5 shadow-soft dark:border-indigo-900/60 dark:bg-indigo-950/20"><p class="text-xs font-black uppercase tracking-[.18em] text-indigo-700 dark:text-indigo-300">NeuroPREP · plan correctivo</p><h4 class="mt-1 font-display text-2xl font-extrabold">Próximos 7 días: reparar el circuito, no solo hacer más preguntas</h4><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">'+esc(plan.pattern)+'</p><div class="mt-4 grid gap-3 md:grid-cols-2">'+plan.items.map(it=>'<button class="rounded-3xl border border-white/70 bg-white/80 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80" onclick="'+it.action+'"><p class="text-2xl">'+it.icon+'</p><h5 class="mt-2 font-display text-lg font-extrabold">'+esc(it.title)+'</h5><p class="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">'+esc(it.body)+'</p></button>').join('')+'</div></div>';
    }
    function neuroSaveReflection(qid){ ensureNeuroState(); const val=$('#neuroReflection_'+qid)?.value||''; state.neuroprep.reflections ||= {}; state.neuroprep.reflections[qid]={text:val,at:Date.now()}; saveState(); const b=$('#neuroReflectionSaved_'+qid); if(b) b.textContent='Guardado'; }
    function neuroPostAnswerPanel(q){
      if(session?.method !== 'razonamiento' || session?.mode === 'exam') return '';
      const r=state.neuroprep?.reasoning?.[q.id]||{};
      const refl=state.neuroprep?.reflections?.[q.id]?.text||'';
      return '<div class="mt-5 rounded-[1.75rem] border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-900/60 dark:from-indigo-950/30 dark:to-slate-900"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-indigo-700 dark:text-indigo-300">Paso 3 · interrogación elaborativa</p><h4 class="mt-1 font-display text-xl font-extrabold">Ahora explicá por qué tu razonamiento funcionó o falló</h4><p class="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">Esto obliga a comparar hipótesis, opciones y distractores. Es el corazón del modo NeuroPREP.</p></div><span class="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 dark:bg-slate-900 dark:text-indigo-300">Confianza previa: '+esc(label(r.confidence||'sin calibrar'))+'</span></div><div class="mt-4 grid gap-4 lg:grid-cols-2"><div class="rounded-2xl bg-white/75 p-4 dark:bg-slate-950/50"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Hipótesis previa</p><p class="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6">'+esc(r.text||'Sin hipótesis guardada')+'</p></div><div><textarea id="neuroReflection_'+esc(q.id)+'" class="min-h-36 w-full rounded-2xl border border-indigo-200 bg-white p-4 text-sm font-semibold leading-6 outline-none focus:border-indigo-400 dark:border-indigo-800 dark:bg-slate-950" placeholder="¿Qué dato clave decidía la pregunta? ¿Qué distractor era más peligroso? ¿Qué regla usarías la próxima vez?">'+esc(refl)+'</textarea><div class="mt-2 flex items-center justify-between"><span id="neuroReflectionSaved_'+esc(q.id)+'" class="text-xs font-black uppercase tracking-[.12em] text-slate-400">local</span><button class="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-black text-white" onclick="neuroSaveReflection(\''+esc(q.id)+'\')">Guardar reflexión</button></div></div></div></div>';
    }
    const __v28QuestionTemplate = questionTemplate;
    questionTemplate = function(q, selected, showExplanation){
      let html = __v28QuestionTemplate(q, selected, showExplanation);
      if(selected && session?.method === 'razonamiento' && session?.mode !== 'exam' && !html.includes('Paso 3 · interrogación elaborativa')){
        html = html.replace('<div class="mt-6 flex flex-wrap justify-between gap-3">', neuroPostAnswerPanel(q)+'<div class="mt-6 flex flex-wrap justify-between gap-3">');
      }
      return html;
    };
    const __v28FinishSession = finishSession;
    finishSession = function(reason='manual'){
      const oldSession = session ? JSON.parse(JSON.stringify(session)) : null;
      __v28FinishSession(reason);
      try{
        if(oldSession && oldSession.neuroprepType){
          ensureNeuroState();
          const qs = (oldSession.questions||[]).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
          const answered = qs.filter(q=>oldSession.selected?.[q.id] || answerFor(q)).length;
          const correct = qs.filter(q=>{ const s=oldSession.selected?.[q.id] || answerFor(q)?.selected; return s && s===q.ans; }).length;
          const failed = qs.filter(q=>{ const s=oldSession.selected?.[q.id] || answerFor(q)?.selected; return s && q.ans && s!==q.ans; });
          const skipped = qs.length-answered; const acc=answered?Math.round(correct/answered*100):0;
          const conf=neuroConfidenceStats(qs.map(q=>q.id));
          const record={type:oldSession.neuroprepType, at:Date.now(), date:todayKey(), ids:qs.map(q=>q.id), answered, correct, failed:failed.map(q=>q.id), skipped, acc, confidence:conf};
          state.neuroprep.diagnosticHistory ||= []; state.neuroprep.diagnosticHistory.push(record); state.neuroprep.diagnosticHistory=state.neuroprep.diagnosticHistory.slice(-40);
          state.neuroprep.lastPlan = neuroBuildTrainingPlan(failed, skipped, acc);
          saveState();
          const content=$('#resultsContent'); if(content){ content.insertAdjacentHTML('beforeend','<div class="mt-6 rounded-[2rem] border border-indigo-200 bg-white p-5 shadow-soft dark:border-indigo-900/60 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Calibración NeuroPREP</p><h4 class="mt-1 font-display text-2xl font-extrabold">'+esc(neuroCalibrationText(conf))+'</h4><div class="mt-4 grid gap-3 sm:grid-cols-3">'+Object.entries(conf).map(([k,v])=>'<div class="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/50"><p class="text-xs font-black uppercase text-slate-400">'+esc(label(k))+'</p><p class="text-xl font-black">'+(v.total?Math.round(v.ok/v.total*100)+'%':'—')+'</p><p class="text-xs font-bold text-slate-500">'+v.ok+'/'+v.total+'</p></div>').join('')+'</div></div>'+neuroPlanHtml(state.neuroprep.lastPlan)); }
        }
      }catch(e){ console.warn('NeuroPREP finish hook', e); }
    };
    const __v28RenderNeuroprep = renderNeuroprep;
    renderNeuroprep = function(){
      __v28RenderNeuroprep();
      ensureNeuroState();
      const today=neuroTodayHistory(); const last=(state.neuroprep.diagnosticHistory||[]).slice(-1)[0]; const plan=state.neuroprep.lastPlan || neuroBuildTrainingPlan([],0,globalAccuracy());
      const root=$('#neuroprepView'); if(!root || root.querySelector('[data-neuro-v28-panel]')) return;
      const block='<section data-neuro-v28-panel class="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]"><article class="rounded-[2rem] border border-indigo-200 bg-white p-5 shadow-soft dark:border-indigo-900/60 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Método NeuroPREP operativo</p><h3 class="mt-1 font-display text-2xl font-extrabold">Secuencia obligatoria: hipótesis → confianza → opciones → reflexión</h3><ol class="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300"><li><strong>1.</strong> Recuperás desde memoria antes de ver ABCD.</li><li><strong>2.</strong> Declarás confianza para medir calibración.</li><li><strong>3.</strong> Recién ahí respondés.</li><li><strong>4.</strong> Después explicás el distractor y la regla que usarías en examen.</li></ol><div class="mt-5 flex flex-wrap gap-2"><button class="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black text-white" onclick="startNeuroDiagnostic()">Hacer diagnóstico</button><button class="rounded-2xl border border-indigo-200 px-4 py-3 text-sm font-black text-indigo-700 dark:border-indigo-900/60 dark:text-indigo-300" onclick="startNeuroReasoning()">Entrenar razonamiento</button></div></article><article class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Historial y plan</p><h3 class="mt-1 font-display text-2xl font-extrabold">Hoy: '+today.length+' bloques · Último: '+(last?last.acc+'%':'sin datos')+'</h3><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">'+esc(plan.pattern||'El plan se actualizará al terminar un bloque NeuroPREP.')+'</p><div class="mt-4 grid gap-2">'+(plan.items||[]).map(it=>'<button class="rounded-2xl border border-slate-200 p-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="'+it.action+'"><span class="text-lg">'+it.icon+'</span> <strong>'+esc(it.title)+'</strong><br><span class="text-xs font-semibold text-slate-500">'+esc(it.body)+'</span></button>').join('')+'</div></article></section>';
      const after=root.querySelector('.mt-6.grid.gap-6'); if(after) after.insertAdjacentHTML('beforebegin', block); else root.insertAdjacentHTML('beforeend', block);
    };
    function exitNotebookFullscreen(){ document.querySelectorAll('.note-fullscreen').forEach(el=>el.classList.remove('note-fullscreen')); document.body.classList.remove('note-fullscreen-active'); document.querySelectorAll('[id^="noteFullscreenBtn_"]').forEach(b=>b.textContent='Pantalla completa'); }
    document.addEventListener('keydown', (ev)=>{ if(ev.key==='Escape' && document.body.classList.contains('note-fullscreen-active')) exitNotebookFullscreen(); });
    const __v28NotebookHighlight = notebookHighlightText;
    notebookHighlightText = function(id){
      const selected = getSelectedNoteBox(id); if(!selected) return alert('Seleccioná un cuadro y marcá letras o palabras para resaltar.');
      selected.focus();
      try { document.execCommand('hiliteColor', false, '#fef08a'); } catch(e) { try{ document.execCommand('backColor', false, '#fef08a'); }catch(_){} }
      saveNotebookTextBoxes(id);
    };



    /* === ResidenciAPP Tutor v2.9 · navegación superior + pizarrón desplegable estable ===
       Ajustes solicitados:
       - Botones Anterior/Siguiente arriba en sesiones libres, revancha, NeuroPREP y simulacros.
       - La pregunta y las opciones quedan como foco principal; el pizarrón queda plegado y se abre solo si el usuario lo desea.
       - Pantalla completa del pizarrón más estable, con scroll interno y sin bloquear navegación vertical.
    */
    function sessionNavigationTemplate(){
      if(!session) return '';
      const arr = getSessionQuestions();
      if(!arr.length) return '';
      const isLast = session.idx >= arr.length - 1;
      const modeLabel = session.method === 'simulacro' || session.mode === 'exam' ? 'Modo simulacro' : session.mode === 'revenge' ? 'Modo revancha' : session.method === 'razonamiento' ? 'NeuroPREP' : 'Práctica libre';
      return '<div class="session-top-nav mb-4 rounded-[1.55rem] border border-slate-200 bg-white/92 p-3 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">'
        + '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">'
        + '<div class="flex items-center gap-2"><span class="rounded-full bg-medical-50 px-3 py-1 text-xs font-black text-medical-700 dark:bg-medical-950/40 dark:text-medical-300">'+esc(modeLabel)+'</span><span class="text-xs font-black uppercase tracking-[.14em] text-slate-400">'+(session.idx+1)+'/'+arr.length+'</span></div>'
        + '<div class="flex flex-wrap gap-2"><button class="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-black hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" '+(session.idx===0?'disabled':'')+' onclick="prevQuestion()">← Anterior</button><button class="rounded-2xl bg-medical-600 px-4 py-2.5 text-xs font-black text-white hover:bg-medical-700" onclick="nextQuestion()">'+(isLast?'Terminar':'Siguiente →')+'</button></div>'
        + '</div></div>';
    }
    function removeBottomSessionNavigation(html){
      return String(html||'').replace(/<div class="mt-6 flex flex-wrap justify-between gap-3"><button[\s\S]*?onclick="prevQuestion\(\)"[\s\S]*?onclick="nextQuestion\(\)"[\s\S]*?<\/button><\/div>/g, '');
    }
    const __v29QuestionTemplate = questionTemplate;
    questionTemplate = function(q, selected, showExplanation){
      let html = __v29QuestionTemplate(q, selected, showExplanation);
      html = removeBottomSessionNavigation(html);
      return sessionNavigationTemplate() + html;
    };

    const __v29QuestionNotebookTemplate = questionNotebookTemplate;
    questionNotebookTemplate = function(q){
      let html = __v29QuestionNotebookTemplate(q);
      const id = esc(q.id);
      if(!html.includes('data-v29-notebook-toggle')){
        html = html.replace('<div class="note-ribbon mt-4">', '<div data-v29-notebook-toggle class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-violet-100 bg-violet-50/70 p-3 dark:border-violet-900/60 dark:bg-violet-950/20"><div><p class="text-xs font-black uppercase tracking-[.14em] text-violet-700 dark:text-violet-300">Pizarrón opcional</p><p class="text-xs font-semibold text-slate-500 dark:text-slate-400">La pregunta y las opciones quedan primero. Abrí este espacio solo cuando quieras esquematizar.</p></div><button id="notebookToggleBtn_'+id+'" class="rounded-2xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white hover:bg-violet-700" onclick="toggleNotebookPanel(\''+id+'\')">Abrir pizarrón</button></div><div id="notebookBody_'+id+'" class="note-panel-body hidden"><div class="note-ribbon mt-4">');
        html = html.replace(/<\/section>\s*$/, '</div></section>');
      }
      return html;
    };
    function toggleNotebookPanel(id){
      const body = $('#notebookBody_'+id);
      if(!body) return;
      const open = body.classList.toggle('hidden') === false;
      const btn = $('#notebookToggleBtn_'+id);
      if(btn) btn.textContent = open ? 'Ocultar pizarrón' : 'Abrir pizarrón';
      if(open){
        try { setupQuestionNotebook(id); redrawNotebookCanvas(id); } catch(e) { console.warn('notebook open', e); }
        setTimeout(()=>redrawNotebookCanvas(id), 120);
      }
    }
    const __v29ToggleNotebookFullscreen = toggleNotebookFullscreen;
    toggleNotebookFullscreen = function(id){
      const body = $('#notebookBody_'+id);
      if(body && body.classList.contains('hidden')) toggleNotebookPanel(id);
      const sec = document.querySelector('[data-question-notebook="'+id+'"]');
      if(!sec) return;
      const on = !sec.classList.contains('note-fullscreen');
      document.querySelectorAll('.note-fullscreen').forEach(el=>el.classList.remove('note-fullscreen'));
      document.body.classList.toggle('note-fullscreen-active', on);
      sec.classList.toggle('note-fullscreen', on);
      const btn = $('#noteFullscreenBtn_'+id);
      if(btn) btn.textContent = on ? 'Salir de pantalla completa' : 'Pantalla completa';
      if(on) sec.scrollTop = 0;
      setTimeout(()=>{ try{ setupQuestionNotebook(id); redrawNotebookCanvas(id); }catch(e){} }, 140);
    };


    /* === ResidenciAPP Tutor v3.0 · pizarrón redimensionable + feedback plegable ===
       - Reemplaza pantalla completa por modo ampliar/compactar estable: evita bloquear scroll de la página.
       - Pizarrón redimensionable desde esquina inferior derecha, guardando tamaño por pregunta.
       - Texto sin borde por defecto, editable en el centro; se mueve desde bordes/zonas de arrastre.
       - Cuadros de texto redimensionables, borrables con Delete/Backspace cuando están seleccionados.
       - Feedback de aprendizaje plegado por defecto: el usuario decide abrir/cerrar.
    */
    const NOTEBOARD_PRESETS = {
      compact:{w:860,h:520,label:'Compacto'},
      wide:{w:1180,h:680,label:'Amplio'},
      focus:{w:1380,h:820,label:'Foco'}
    };
    function applyNotebookBoardSize(id){
      const nb = getQuestionNotebook(id);
      const shell = document.querySelector('#noteBoard_'+id)?.closest('.note-board-shell');
      const board = $('#noteBoard_'+id);
      if(!shell || !board) return;
      const w = Number(nb.boardWidth)||0;
      const h = Number(nb.boardHeight)||0;
      if(w){ shell.style.width = Math.max(520, Math.min(1800,w))+'px'; shell.style.maxWidth='100%'; }
      if(h){ board.style.minHeight = Math.max(380, Math.min(1200,h))+'px'; board.style.height = Math.max(380, Math.min(1200,h))+'px'; }
      setTimeout(()=>{ try{ redrawNotebookCanvas(id); }catch(e){} }, 50);
    }
    function setNotebookBoardPreset(id, preset='wide'){
      const p = NOTEBOARD_PRESETS[preset] || NOTEBOARD_PRESETS.wide;
      saveQuestionNotebook(id, {boardWidth:p.w, boardHeight:p.h});
      applyNotebookBoardSize(id);
    }
    function resetNotebookBoardSize(id){
      saveQuestionNotebook(id, {boardWidth:'', boardHeight:''});
      const shell = document.querySelector('#noteBoard_'+id)?.closest('.note-board-shell');
      const board = $('#noteBoard_'+id);
      if(shell){ shell.style.width=''; shell.style.maxWidth=''; }
      if(board){ board.style.height=''; board.style.minHeight=''; }
      setTimeout(()=>{ try{ redrawNotebookCanvas(id); }catch(e){} }, 50);
    }
    toggleNotebookFullscreen = function(id){
      // v3.0: evita fullscreen real porque puede bloquear scroll. Usa un modo amplio persistente.
      const body = $('#notebookBody_'+id);
      if(body && body.classList.contains('hidden')) toggleNotebookPanel(id);
      const nb = getQuestionNotebook(id);
      const isFocus = (Number(nb.boardWidth)||0) >= NOTEBOARD_PRESETS.focus.w - 10;
      if(isFocus){ setNotebookBoardPreset(id,'wide'); }
      else { setNotebookBoardPreset(id,'focus'); }
      const btn = $('#noteFullscreenBtn_'+id);
      if(btn) btn.textContent = isFocus ? 'Expandir pizarra' : 'Volver a tamaño amplio';
      const sec = document.querySelector('[data-question-notebook="'+id+'"]');
      if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
    }
    function notebookResizeControls(id){
      return '<div class="note-toolgroup"><span>Tamaño</span>'
        + '<button class="note-tool" onclick="setNotebookBoardPreset(\''+esc(id)+'\',\'compact\')">Compacto</button>'
        + '<button class="note-tool" onclick="setNotebookBoardPreset(\''+esc(id)+'\',\'wide\')">Amplio</button>'
        + '<button class="note-tool" onclick="setNotebookBoardPreset(\''+esc(id)+'\',\'focus\')">Foco</button>'
        + '<button class="note-tool" onclick="resetNotebookBoardSize(\''+esc(id)+'\')">Centrar</button>'
        + '</div>';
    }
    const __v30QuestionNotebookTemplate = questionNotebookTemplate;
    questionNotebookTemplate = function(q){
      let html = __v30QuestionNotebookTemplate(q);
      const id = esc(q.id);
      html = html.replace(/Pantalla completa/g, 'Expandir pizarra');
      if(!html.includes('data-v30-note-size')){
        html = html.replace('<div class="note-toolgroup"><span>Herramienta</span>', '<div data-v30-note-size>'+notebookResizeControls(q.id)+'</div><div class="note-toolgroup"><span>Herramienta</span>');
      }
      if(!html.includes('note-board-resize-handle')){
        html = html.replace('<div class="note-board-hint">', '<button type="button" class="note-board-resize-handle" title="Arrastrá para agrandar o achicar el pizarrón" onmousedown="startNotebookBoardResize(event,\''+id+'\')" ontouchstart="startNotebookBoardResize(event,\''+id+'\')"></button><div class="note-board-hint">');
      }
      return html;
    };
    function startNotebookBoardResize(ev, id){
      ev.preventDefault(); ev.stopPropagation();
      const board = $('#noteBoard_'+id); const shell = board?.closest('.note-board-shell');
      if(!board || !shell) return;
      const p0 = ev.touches ? ev.touches[0] : ev;
      const start = {x:p0.clientX, y:p0.clientY, w:shell.getBoundingClientRect().width, h:board.getBoundingClientRect().height};
      const move = (e)=>{
        const p = e.touches ? e.touches[0] : e;
        const w = Math.max(520, Math.min(1800, start.w + (p.clientX-start.x)));
        const h = Math.max(380, Math.min(1200, start.h + (p.clientY-start.y)));
        shell.style.width = w+'px'; shell.style.maxWidth='100%';
        board.style.height = h+'px'; board.style.minHeight = h+'px';
        e.preventDefault();
      };
      const end = ()=>{
        const w = Math.round(shell.getBoundingClientRect().width);
        const h = Math.round(board.getBoundingClientRect().height);
        saveQuestionNotebook(id,{boardWidth:w, boardHeight:h});
        try{ redrawNotebookCanvas(id); }catch(e){}
        window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', end);
        window.removeEventListener('touchmove', move); window.removeEventListener('touchend', end);
      };
      window.addEventListener('mousemove', move, {passive:false}); window.addEventListener('mouseup', end);
      window.addEventListener('touchmove', move, {passive:false}); window.addEventListener('touchend', end);
    }
    const __v30ToggleNotebookPanel = toggleNotebookPanel;
    toggleNotebookPanel = function(id){
      __v30ToggleNotebookPanel(id);
      setTimeout(()=>{ applyNotebookBoardSize(id); setupNotebookTextBoxEventsV30(id); }, 80);
    };
    const __v30SetupQuestionNotebook = setupQuestionNotebook;
    setupQuestionNotebook = function(id){
      __v30SetupQuestionNotebook(id);
      applyNotebookBoardSize(id);
      setupNotebookTextBoxEventsV30(id);
    };
    const __v30RenderNoteTextBox = renderNoteTextBox;
    renderNoteTextBox = function(id, box){
      const safeId = esc(String(box.id || ('box_'+Date.now())));
      const html = box.html || '';
      const bordered = !!box.border;
      const borderColor = box.borderColor || '#2563eb';
      const borderWidth = box.borderWidth || 1;
      const style = 'left:'+(box.left||4)+'%;top:'+(box.top||5)+'%;width:'+(box.width||30)+'%;height:'+(box.height||18)+'%;--note-border:'+borderColor+';border-color:'+borderColor+';border-width:'+borderWidth+'px;';
      return '<div class="note-textbox-wrap" tabindex="0" data-box-id="'+safeId+'" data-bordered="'+(bordered?'1':'0')+'" data-border-width="'+borderWidth+'" style="'+style+'">'
        + '<span class="note-box-edge note-edge-top" title="Arrastrar cuadro"></span><span class="note-box-edge note-edge-right" title="Arrastrar cuadro"></span><span class="note-box-edge note-edge-bottom" title="Arrastrar cuadro"></span><span class="note-box-edge note-edge-left" title="Arrastrar cuadro"></span>'
        + '<button type="button" title="Eliminar texto" class="note-box-delete" onclick="event.stopPropagation();this.closest(\'.note-textbox-wrap\').remove();saveNotebookTextBoxes(\''+esc(id)+'\')">×</button>'
        + '<div class="note-textbox" contenteditable="true" spellcheck="false" oninput="saveNotebookTextBoxes(\''+esc(id)+'\')" onblur="saveNotebookTextBoxes(\''+esc(id)+'\')" style="font-size:'+(box.fontSize||16)+'px;color:'+(box.color||'#0f172a')+';background:'+(box.bg||'transparent')+'">'+html+'</div>'
        + '<span class="note-box-resize-handle" title="Cambiar tamaño"></span>'
        + '</div>';
    };
    function setupNotebookTextBoxEventsV30(id){
      const layer = $('#noteTextLayer_'+id); if(!layer || layer.dataset.readyV30 === '1') return;
      layer.dataset.readyV30 = '1';
      let drag=null, resize=null;
      const pct = (value, total)=> (value/total)*100;
      const start = (ev)=>{
        const wrap = ev.target.closest('.note-textbox-wrap'); if(!wrap) return;
        selectNoteBox(id, wrap.dataset.boxId);
        const tool = getQuestionNotebook(id).tool || 'pen';
        if(tool !== 'move') return;
        const p = ev.touches ? ev.touches[0] : ev;
        const rect = layer.getBoundingClientRect();
        if(ev.target.closest('.note-box-resize-handle')){
          resize = {wrap, rect, sx:p.clientX, sy:p.clientY, w:parseFloat(wrap.style.width)||30, h:parseFloat(wrap.style.height)||18};
          ev.preventDefault(); ev.stopPropagation(); return;
        }
        if(ev.target.closest('.note-box-edge') || ev.target === wrap){
          drag = {wrap, rect, sx:p.clientX, sy:p.clientY, left:parseFloat(wrap.style.left)||0, top:parseFloat(wrap.style.top)||0};
          ev.preventDefault(); ev.stopPropagation(); return;
        }
      };
      const move = (ev)=>{
        if(!drag && !resize) return;
        const p = ev.touches ? ev.touches[0] : ev;
        if(drag){
          const dx = pct(p.clientX-drag.sx, drag.rect.width); const dy = pct(p.clientY-drag.sy, drag.rect.height);
          drag.wrap.style.left = Math.max(0, Math.min(96, drag.left+dx))+'%';
          drag.wrap.style.top = Math.max(0, Math.min(96, drag.top+dy))+'%';
        }
        if(resize){
          const dw = pct(p.clientX-resize.sx, resize.rect.width); const dh = pct(p.clientY-resize.sy, resize.rect.height);
          resize.wrap.style.width = Math.max(10, Math.min(92, resize.w+dw))+'%';
          resize.wrap.style.height = Math.max(6, Math.min(90, resize.h+dh))+'%';
        }
        ev.preventDefault();
      };
      const end = ()=>{ if(drag || resize){ saveNotebookTextBoxes(id); } drag=null; resize=null; };
      layer.addEventListener('mousedown', start); window.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
      layer.addEventListener('touchstart', start, {passive:false}); window.addEventListener('touchmove', move, {passive:false}); window.addEventListener('touchend', end);
    }
    document.addEventListener('keydown', (ev)=>{
      if(!(ev.key === 'Delete' || ev.key === 'Backspace')) return;
      const active = document.activeElement;
      if(active && active.closest && active.closest('.note-textbox')) return;
      const selected = document.querySelector('.note-textbox-wrap.is-selected');
      if(!selected) return;
      const layer = selected.closest('.note-text-layer');
      const id = layer ? layer.id.replace('noteTextLayer_','') : '';
      if(!id) return;
      selected.remove(); saveNotebookTextBoxes(id); ev.preventDefault();
    });
    const __v30NotebookSetColor = notebookSetColor;
    notebookSetColor = function(id, color, kind='draw'){
      const selected = getSelectedNoteBox(id);
      if(kind==='text' && selected){
        selected.focus();
        const sel = window.getSelection();
        if(sel && !sel.isCollapsed && selected.contains(sel.anchorNode)){
          try{ document.execCommand('foreColor', false, color); }catch(e){}
          saveQuestionNotebook(id,{textColor:color}); saveNotebookTextBoxes(id); return;
        }
      }
      __v30NotebookSetColor(id,color,kind);
    };
    const __v30NotebookHighlightText = notebookHighlightText;
    notebookHighlightText = function(id){
      const selected = getSelectedNoteBox(id); if(!selected) return alert('Seleccioná un cuadro y marcá letras o palabras para resaltar.');
      selected.focus();
      const sel = window.getSelection();
      if(!sel || sel.isCollapsed || !selected.contains(sel.anchorNode)) return alert('Marcá primero las letras o palabras dentro del cuadro.');
      try { document.execCommand('hiliteColor', false, '#fef08a'); } catch(e) { try{ document.execCommand('backColor', false, '#fef08a'); }catch(_){} }
      saveNotebookTextBoxes(id);
    };
    function toggleLearningFeedback(id){
      const body = $('#learningFeedbackBody_'+id); const btn = $('#learningFeedbackBtn_'+id);
      if(!body) return;
      const open = body.classList.toggle('hidden') === false;
      if(btn) btn.textContent = open ? 'Cerrar feedback' : 'Abrir feedback';
      if(open){ setTimeout(()=>{ try{ setupQuestionNotebook(id); }catch(e){} }, 80); }
    }
    const __v30ExplanationTemplate = explanationTemplate;
    explanationTemplate = function(q, selected){
      const raw = __v30ExplanationTemplate(q, selected);
      const id = esc(q.id);
      if(raw.includes('data-v30-feedback-shell')) return raw;
      const ok = selected===q.ans;
      const selectedTxt = selected ? selected.toUpperCase()+') '+(q.opts?.[selected]||'') : 'Sin responder';
      return '<section data-v30-feedback-shell class="mt-5 rounded-[1.45rem] border '+(ok?'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20':'border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/20')+' p-4 animate-fadeUp">'
        + '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] '+(ok?'text-emerald-700 dark:text-emerald-300':'text-rose-700 dark:text-rose-300')+'">'+(ok?'Respuesta registrada · correcta':'Respuesta registrada · incorrecta')+'</p><h4 class="mt-1 font-display text-xl font-extrabold">Feedback y pizarrón opcionales</h4><p class="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Tu respuesta: '+esc(selectedTxt)+' · abrí el feedback solo cuando quieras revisar la explicación.</p></div><button id="learningFeedbackBtn_'+id+'" class="rounded-2xl bg-white px-4 py-2.5 text-xs font-black shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="toggleLearningFeedback(\''+id+'\')">Abrir feedback</button></div>'
        + '<div id="learningFeedbackBody_'+id+'" class="hidden">'+raw+'</div>'
        + '</section>';
    };

    /* === ResidenciAPP v34 Premium Clean Dashboard ===
       Capa de UX: dashboard limpio, semáforo por área con cobertura y auditoría del banco.
       Respeta IDs, localStorage y todas las funciones existentes.
    */
    const V34_EXPECTED_TOTALS = { clinica:457, cirugia:63, pediatria:200, gineco_obstetricia:186, salud_publica:68 };
    const V34_EXPECTED_TOTAL = 974;
    const V34_EXPECTED_SPRINTS = 36;
    function v34Pct(num, den){ return den ? Math.round((num/den)*100) : 0; }
    function v34Status(acc, answered, total){
      if(!answered) return 'empty';
      const coverage = v34Pct(answered,total);
      if(coverage < 12) return 'amber';
      if(acc >= 85) return 'green';
      if(acc >= 60) return 'amber';
      return 'rose';
    }
    function v34StatusText(acc, answered, total){
      if(!answered) return 'Pendiente';
      const coverage = v34Pct(answered,total);
      if(coverage < 12) return 'Muestra inicial';
      if(acc >= 85) return 'Buen dominio';
      if(acc >= 60) return 'Revisar errores';
      return 'Prioridad alta';
    }
    function v34Bar(status){
      return status==='green' ? 'bg-emerald-500' : status==='amber' ? 'bg-amber-500' : status==='rose' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700';
    }
    function v34AreaCard(a){
      const coverage = v34Pct(a.answered, a.total);
      const status = v34Status(a.acc, a.answered, a.total);
      const bar = v34Bar(status);
      return '<article class="v34-area-card rounded-[1.45rem] border border-slate-200 p-4 dark:border-slate-800" data-status="'+status+'">'
        + '<div class="flex items-start justify-between gap-3"><div><p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-500 dark:text-slate-400">'+v34StatusText(a.acc,a.answered,a.total)+'</p><h4 class="mt-1 font-display text-lg font-extrabold leading-tight">'+esc(a.label)+'</h4></div><div class="text-right"><p class="font-display text-3xl font-extrabold">'+(a.answered?a.acc+'%':'—')+'</p><p class="text-[10px] font-black uppercase tracking-[.12em] text-slate-400">rend.</p></div></div>'
        + '<div class="mt-4 space-y-3">'
        + '<div class="v34-progress-row"><div class="flex justify-between text-[11px] font-black uppercase tracking-[.12em] text-slate-500 dark:text-slate-400"><span>Rendimiento</span><span>'+a.correct+'/'+a.answered+'</span></div><div class="v34-progress-track"><div class="v34-progress-fill '+bar+'" style="width:'+(a.answered?a.acc:0)+'%"></div></div></div>'
        + '<div class="v34-progress-row"><div class="flex justify-between text-[11px] font-black uppercase tracking-[.12em] text-slate-500 dark:text-slate-400"><span>Cobertura</span><span>'+a.answered+'/'+a.total+'</span></div><div class="v34-progress-track"><div class="v34-progress-fill bg-medical-600" style="width:'+coverage+'%"></div></div></div>'
        + '</div></article>';
    }
    function v34NextSprint(){
      const scored = SPRINTS.map(sp=>({sp, st:sprintStats(sp)})).filter(x=>x.st.answered < x.sp.total);
      scored.sort((a,b)=>{
        const aStarted = a.st.answered>0 ? 0 : 1;
        const bStarted = b.st.answered>0 ? 0 : 1;
        if(aStarted !== bStarted) return aStarted-bStarted;
        if(a.st.pct !== b.st.pct) return b.st.pct-a.st.pct;
        return a.sp.total-b.sp.total;
      });
      return scored[0]?.sp || SPRINTS[0];
    }
    function renderV34ContinueCard(){
      const box = $('#v34ContinueCard'); if(!box) return;
      const active = state.session && (state.session.questions||[]).length;
      const sp = v34NextSprint();
      const globalAnswered = globalAnsweredQuestions().length;
      const globalCoverage = v34Pct(globalAnswered, QUESTIONS.length);
      if(active){
        const total = state.session.questions.length;
        const idx = Math.min((state.session.idx||0)+1, total);
        const pct = v34Pct(idx-1,total);
        box.innerHTML = '<div class="relative z-[1]"><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Continuar donde dejaste</p><h3 class="mt-1 font-display text-2xl font-extrabold">'+esc(state.session.title||'Sesión activa')+'</h3><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">'+esc(state.session.meta||'Entrenamiento en curso')+'</p><div class="mt-5 rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/60"><div class="flex items-center justify-between text-xs font-black uppercase tracking-[.14em] text-slate-500"><span>Pregunta '+idx+' de '+total+'</span><span>'+pct+'%</span></div><div class="mt-2 h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-800"><div class="h-full rounded-full bg-medical-600" style="width:'+pct+'%"></div></div></div><div class="mt-5 flex flex-wrap gap-2"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-medical-700" onclick="resumeOrStart()">Retomar sesión</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="showView(\'review\')">Ver repaso</button></div></div>';
      } else {
        const st = sp ? sprintStats(sp) : {answered:0,total:0,pct:0,acc:0};
        box.innerHTML = '<div class="relative z-[1]"><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-medical-600 dark:text-medical-300">Plan de hoy</p><h3 class="mt-1 font-display text-2xl font-extrabold">'+(sp?'Siguiente sprint recomendado':'Banco listo')+'</h3><p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">Cobertura global actual: <strong>'+globalAnswered+'/'+QUESTIONS.length+'</strong> preguntas respondidas ('+globalCoverage+'%).</p>'
        + (sp?'<div class="mt-5 rounded-3xl bg-slate-50 p-4 dark:bg-slate-950/60"><p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">'+esc(sp.eje)+'</p><h4 class="mt-1 font-display text-xl font-extrabold">'+esc(sp.sprint)+'</h4><p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">'+esc(sp.tema)+' · '+st.answered+'/'+sp.total+' respondidas</p><div class="mt-3 h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-800"><div class="h-full rounded-full bg-medical-600" style="width:'+st.pct+'%"></div></div></div><div class="mt-5 flex flex-wrap gap-2"><button class="rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-medical-700" onclick="startSprint(\''+sp.id+'\', state.method||\'preguntas\')">Empezar recomendado</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startGlobalSession()">Entrenamiento global</button></div>':'')+'</div>';
      }
    }
    function renderV34AuditCard(){
      const box = $('#v34AuditCard'); if(!box) return;
      const ids = QUESTIONS.map(q=>q.id);
      const dupIds = ids.length - new Set(ids).size;
      const missingAns = QUESTIONS.filter(q=>!q.ans).length;
      const areas = getPerformanceAreas();
      const countOk = QUESTIONS.length===V34_EXPECTED_TOTAL;
      const sprintOk = SPRINTS.length===V34_EXPECTED_SPRINTS;
      const areaOk = Object.entries(V34_EXPECTED_TOTALS).every(([src,total]) => QUESTIONS.filter(q=>(q.source||'')===src).length===total);
      const ok = countOk && sprintOk && areaOk && dupIds===0;
      const badge = ok ? '<span class="v34-audit-ok rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[.14em]">Banco validado</span>' : '<span class="v34-audit-warn rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[.14em]">Revisar banco</span>';
      const mini = [
        ['Total', QUESTIONS.length, V34_EXPECTED_TOTAL],
        ['Sprints', SPRINTS.length, V34_EXPECTED_SPRINTS],
        ['IDs duplicados', dupIds, 0],
        ['Sin clave', missingAns, missingAns]
      ].map(x=>'<div class="v34-pill rounded-2xl p-3"><p class="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">'+x[0]+'</p><p class="mt-1 font-display text-2xl font-extrabold">'+x[1]+'</p></div>').join('');
      const areaRows = areas.map(a=>{
        const expected = V34_EXPECTED_TOTALS[a.src];
        const mark = expected===a.total ? '✓' : '⚠️';
        return '<div class="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm font-bold"><span>'+mark+' '+esc(a.label)+'</span><span>'+a.total+(expected?'/'+expected:'')+'</span></div>';
      }).join('');
      box.innerHTML = '<div class="flex items-start justify-between gap-3"><div><p class="v34-kicker text-xs font-black uppercase tracking-[.18em] text-slate-400">Control interno</p><h3 class="mt-1 font-display text-2xl font-extrabold">Auditoría v34</h3><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">Chequeo automático para evitar volver a 1003 por caché o metadata vieja.</p></div>'+badge+'</div><div class="mt-4 grid grid-cols-2 gap-3">'+mini+'</div><details class="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950/60"><summary class="cursor-pointer text-sm font-black">Ver distribución por área</summary><div class="mt-2">'+areaRows+'</div></details>';
    }
    function renderV34QuickActions(){
      const box = $('#v34QuickActions'); if(!box) return;
      const due = dueQuestions().length;
      const mistakes = QUESTIONS.filter(q=>state.mistakes?.[q.id]).length;
      const actions = [
        ['🧠','Sesión activa','Retomá o empezá un bloque sin buscar menús.','resumeOrStart()'],
        ['🔁','Repaso inteligente', due+' repasos vencidos para hoy.','showView(\'review\')'],
        ['🧾','Errores activos', mistakes+' preguntas para revancha.','startMistakesSession()'],
        ['⏱️','Simulacro global','Modo examen con feedback al final.','startGlobalSimulation()']
      ];
      box.innerHTML = actions.map(a=>'<button class="v34-action-btn rounded-[1.35rem] border border-slate-200 p-4 text-left dark:border-slate-800" onclick="'+a[3]+'"><div class="text-2xl">'+a[0]+'</div><h4 class="mt-2 font-display text-lg font-extrabold">'+a[1]+'</h4><p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+a[2]+'</p></button>').join('');
    }
    function renderV34Dashboard(){
      const areas = getPerformanceAreas();
      const areaBox = $('#v34AreaCards');
      if(areaBox) areaBox.innerHTML = areas.map(v34AreaCard).join('');
      const answered = globalAnsweredQuestions().length;
      const coverage = v34Pct(answered, QUESTIONS.length);
      if($('#v34GlobalCoverageLabel')) $('#v34GlobalCoverageLabel').textContent = coverage+'%';
      if($('#v34GlobalBar')) $('#v34GlobalBar').style.width = coverage+'%';
      renderV34ContinueCard();
      renderV34QuickActions();
    }
    const __v34RenderStats = renderStats;
    renderStats = function(){
      const answered = QUESTIONS.filter(q=>answerFor(q)).length;
      const correct = QUESTIONS.filter(q=>isCorrect(q)).length;
      const mistakes = QUESTIONS.filter(q=>state.mistakes?.[q.id]).length;
      const due = dueQuestions().length;
      const acc = answered ? Math.round(correct/answered*100) : 0;
      const pending = Math.max(QUESTIONS.length - answered, 0);
      const items = [
        ['Banco integrado', QUESTIONS.length, '36 sprints · 5 áreas', '🗂️'],
        ['Respondidas', answered, pending+' pendientes', '✅'],
        ['Precisión', answered?acc+'%':'—', correct+' correctas', '🎯'],
        ['Repaso', due, mistakes+' errores activos', '🔁']
      ];
      const target = $('#statCards');
      if(!target) return __v34RenderStats();
      target.innerHTML = items.map(([a,b,c,icon]) => '<div class="v34-clean-card rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div class="flex items-start justify-between gap-3"><p class="text-xs font-black uppercase tracking-[.17em] text-slate-400">'+a+'</p><span class="text-xl">'+icon+'</span></div><p class="mt-2 font-display text-4xl font-extrabold">'+b+'</p><p class="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">'+c+'</p></div>').join('');
    };
    const __v34RenderAll = renderAll;
    renderAll = function(){ __v34RenderAll(); renderV34Dashboard(); };
    const __v34SelectAnswer = selectAnswer;
    selectAnswer = function(id, selected){ __v34SelectAnswer(id, selected); renderV34Dashboard(); };
    const __v34NextQuestion = nextQuestion;
    nextQuestion = function(){ __v34NextQuestion(); renderV34Dashboard(); };
    const __v34PrevQuestion = prevQuestion;
    prevQuestion = function(){ __v34PrevQuestion(); renderV34Dashboard(); };


    /* === ResidenciAPP v34.1 · Clean UX + repaso espaciado claro ===
       - Inicio con menos ruido visual.
       - Sin módulo visible de auditoría ni exportación JSON de base.
       - Repasos vencidos desaparecen del bloque de hoy al responderse.
       - Revancha sin panel de rendimiento.
       - Retención avanzada sin botón Feynman redundante.
    */
    const __v341RenderDueTodayHero = renderDueTodayHero;
    renderDueTodayHero = function(){
      ensureAdvancedState?.();
      const el = $('#dueTodayHero'); if(!el) return;
      const due = dueReviewItems();
      if(!due.length){ el.innerHTML = ''; return; }
      const topics = dueTopicCount();
      const label = topics===1 ? 'tema' : 'temas';
      el.innerHTML = '<div class="micro-pop rounded-[1.5rem] border border-medical-200 bg-medical-50/80 p-4 dark:border-medical-900/60 dark:bg-medical-950/30">'
        + '<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p class="text-xs font-black uppercase tracking-[.18em] text-medical-700 dark:text-medical-300">Repaso espaciado de hoy</p><h4 class="mt-1 font-display text-xl font-extrabold">'+topics+' '+label+' pendientes</h4><p class="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">'+due.length+' preguntas vencidas. Al responderlas, salen automáticamente de este bloque.</p></div>'
        + '<button class="native-tap rounded-2xl bg-medical-600 px-5 py-3 text-sm font-black text-white shadow-glow hover:bg-medical-700" onclick="startDueSession()">Repasar ahora</button></div></div>';
    };

    function v341RepasoAutoMove(id, selected){
      if(!id) return;
      ensureAdvancedState?.();
      const q = QUESTIONS.find(x=>x.id===id); if(!q) return;
      const isCorrect = q.ans && selected === q.ans;
      const difficulty = isCorrect ? 'easy' : 'hard';
      const cfg = difficultyConfig(difficulty);
      const prev = state.retention?.[id] || {reps:0};
      const due = addDays(cfg.days);
      state.retention[id] = Object.assign({}, prev, {
        id, difficulty, label:cfg.label, ease:cfg.ease,
        reps:(prev.reps||0)+1,
        due, intervalDays:cfg.days,
        reviewedAt:Date.now(), updatedAt:Date.now(),
        tema:q.tema, sprint:q.sprint, eje:q.eje, source:q.source
      });
      state.scheduled[id] = {
        id, due, days:cfg.days, difficulty, label:cfg.label,
        at:Date.now(), reviewedAt:Date.now(), tema:q.tema, sprint:q.sprint, eje:q.eje
      };
    }

    const __v341SelectAnswer = selectAnswer;
    selectAnswer = function(id, selected){
      const wasDueReview = session?.method === 'repaso' || /repasos vencidos|repaso espaciado/i.test(String(session?.title||'')+' '+String(session?.meta||''));
      __v341SelectAnswer(id, selected);
      if(wasDueReview){
        v341RepasoAutoMove(id, selected);
        saveState();
        renderReview?.();
        renderDueTodayHero?.();
        renderAdvancedFlashcards?.();
        renderV34Dashboard?.();
      }
    };

    const __v341RenderPerformancePanel = renderPerformancePanel;
    renderPerformancePanel = function(){
      const panel = $('#performancePanel');
      if(session?.mode === 'revenge'){
        if(panel){ panel.innerHTML = ''; panel.classList.add('hidden'); }
        return;
      }
      if(panel) panel.classList.remove('hidden');
      __v341RenderPerformancePanel();
    };

    const __v341ExplanationTemplate = explanationTemplate;
    explanationTemplate = function(q, selected){
      let html = __v341ExplanationTemplate(q, selected);
      html = html.replace(/<button class="native-tap rounded-2xl border border-medical-200[\s\S]*?¿Podés explicarlo\?<\/button>/g, '');
      return html;
    };

    const __v341RenderReview = renderReview;
    renderReview = function(){
      const mistakes = Object.keys(state.mistakes||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const due = dueQuestions();
      const fav = Object.keys(state.favorites||{}).map(id=>QUESTIONS.find(q=>q.id===id)).filter(Boolean);
      const panel = (title, icon, qs, buttons, note='') => '<section class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900"><div class="flex items-start justify-between gap-3"><div><p class="text-2xl">'+icon+'</p><h4 class="mt-1 font-display text-xl font-extrabold">'+title+'</h4><p class="text-sm font-bold text-slate-500">'+qs.length+' preguntas</p>'+(note?'<p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+note+'</p>':'')+'</div></div><div class="mt-4 flex flex-wrap gap-2">'+buttons+'</div><div class="mt-4 space-y-2">'+qs.slice(0,5).map(q=>'<div class="rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 dark:bg-slate-950/60">'+esc(q.q.slice(0,130))+(q.q.length>130?'…':'')+'</div>').join('')+'</div></section>';
      const duePanel = due.length
        ? panel('Repasos vencidos','🔁',due,'<button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startDueSession()">Iniciar</button>','Al responder, la pregunta sale de vencidas. Correcta: vuelve en 4 días. Incorrecta: vuelve mañana. Si marcás dificultad, la app respeta esa dificultad.')
        : '<section class="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5 shadow-soft dark:border-emerald-900/60 dark:bg-emerald-950/20"><p class="text-2xl">🔁</p><h4 class="mt-1 font-display text-xl font-extrabold">Repaso espaciado al día</h4><p class="mt-1 text-sm font-semibold leading-6 text-emerald-800 dark:text-emerald-200">No hay preguntas vencidas para hoy. Cuando marques una pregunta como difícil, dudosa o fácil, aparecerá acá en la fecha correspondiente.</p></section>';
      $('#reviewPanels').innerHTML = panel('Errores activos','🧾',mistakes,'<button class="rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black text-white" onclick="startMistakesRevengeSession()">Revancha</button><button class="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="startMistakesSession()">Repaso guiado</button>','Revancha no muestra feedback. Si acertás, el error desaparece del listado.') + duePanel + panel('Favoritas','⭐',fav,'<button class="rounded-2xl bg-medical-600 px-3 py-2 text-xs font-black text-white" onclick="startFavoritesSession()">Iniciar</button>');
      renderAdvancedFlashcards?.();
    };

    const __v341RenderV34Dashboard = renderV34Dashboard;
    renderV34Dashboard = function(){
      const audit = $('#v34AuditCard');
      if(audit) audit.remove();
      __v341RenderV34Dashboard();
    };



    /* === ResidenciAPP v34.2 · Reporte PDF + Juegos + repaso más limpio === */
    const V34_2_VERSION = 'v34.2-premium-clean-ux';

    function v342FormatDate(d=new Date()){
      return d.toLocaleDateString('es-AR', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
    }
    function v342ShortDate(d=new Date()){
      const pad = n => String(n).padStart(2,'0');
      return pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+d.getFullYear();
    }
    function v342AreaSummary(){
      return getPerformanceAreas().map(a => ({
        area:a.label, total:a.total, respondidas:a.answered, correctas:a.correct,
        pendientes: Math.max(a.total - a.answered, 0), rendimiento:a.answered?a.acc:0, cobertura:v34Pct(a.answered, a.total)
      }));
    }
    function downloadProgressPDF(){
      const now = new Date();
      const areas = v342AreaSummary();
      const answered = globalAnsweredQuestions().length;
      const correct = globalCorrectCount();
      const acc = globalAccuracy();
      const due = dueQuestions().length;
      const mistakes = Object.keys(state.mistakes||{}).length;
      const coverage = v34Pct(answered, QUESTIONS.length);
      const makeTextReport = () => {
        const lines = [];
        lines.push('ResidenciAPP - Reporte de progreso');
        lines.push('Fecha de consulta: '+v342FormatDate(now));
        lines.push('Banco integrado: '+QUESTIONS.length+' preguntas · 36 sprints · 5 áreas');
        lines.push('');
        lines.push('Resumen general');
        lines.push('- Respondidas: '+answered+' / '+QUESTIONS.length+' ('+coverage+'% de cobertura)');
        lines.push('- Correctas: '+correct);
        lines.push('- Precisión global: '+(answered?acc+'%':'sin respuestas'));
        lines.push('- Errores activos: '+mistakes);
        lines.push('- Repasos vencidos hoy: '+due);
        lines.push('');
        lines.push('Progreso por área');
        areas.forEach(a=> lines.push('- '+a.area+': '+a.respondidas+'/'+a.total+' respondidas · '+a.correctas+' correctas · rendimiento '+(a.respondidas?a.rendimiento+'%':'sin muestra')+' · cobertura '+a.cobertura+'%'));
        lines.push('');
        lines.push('Nota: el rendimiento mide correctas/respondidas. La cobertura mide respondidas/total del área.');
        return lines.join('\n');
      };
      const fileName = 'ResidenciAPP_reporte_progreso_'+v342ShortDate(now)+'.pdf';
      try{
        const lib = window.jspdf || window.jsPDF;
        const jsPDF = lib?.jsPDF || lib;
        if(!jsPDF) throw new Error('jsPDF no disponible');
        const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 14;
        let y = 18;
        doc.setFont('helvetica','bold'); doc.setFontSize(18); doc.text('ResidenciAPP', margin, y);
        doc.setFontSize(12); doc.setTextColor(24,119,214); doc.text('Reporte de progreso por área', margin, y+7);
        doc.setTextColor(15,23,42); doc.setFont('helvetica','normal'); doc.setFontSize(9);
        doc.text('Fecha de consulta: '+v342FormatDate(now), margin, y+15);
        y += 27;
        const card = (x, title, value, caption) => {
          doc.setDrawColor(226,232,240); doc.setFillColor(248,250,252); doc.roundedRect(x, y, 42, 24, 3, 3, 'FD');
          doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(String(title).toUpperCase(), x+4, y+6);
          doc.setFontSize(15); doc.setTextColor(15,23,42); doc.text(String(value), x+4, y+15);
          doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(100,116,139); doc.text(String(caption), x+4, y+21);
        };
        card(margin, 'Banco', QUESTIONS.length, 'preguntas');
        card(margin+46, 'Respondidas', answered, coverage+'% cobertura');
        card(margin+92, 'Precisión', answered?acc+'%':'-', correct+' correctas');
        card(margin+138, 'Repaso', due, mistakes+' errores activos');
        y += 36;
        doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(15,23,42); doc.text('Progreso por área', margin, y); y += 7;
        doc.setFontSize(8); doc.setTextColor(100,116,139);
        doc.text('Área', margin, y); doc.text('Respondidas', 72, y); doc.text('Correctas', 108, y); doc.text('Rend.', 140, y); doc.text('Cobertura', 166, y); y += 3;
        doc.setDrawColor(226,232,240); doc.line(margin, y, pageW-margin, y); y += 6;
        areas.forEach(a=>{
          doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(15,23,42); doc.text(a.area, margin, y);
          doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text(a.respondidas+' / '+a.total, 76, y, {align:'center'});
          doc.text(String(a.correctas), 116, y, {align:'center'});
          doc.text(a.respondidas?a.rendimiento+'%':'-', 146, y, {align:'center'});
          doc.text(a.cobertura+'%', 176, y, {align:'center'});
          y += 6;
          const barX = margin, barY = y, barW = pageW - 2*margin;
          doc.setFillColor(226,232,240); doc.roundedRect(barX, barY, barW, 2.2, 1, 1, 'F');
          doc.setFillColor(24,119,214); doc.roundedRect(barX, barY, barW*(a.cobertura/100), 2.2, 1, 1, 'F');
          y += 8;
        });
        y += 4;
        doc.setDrawColor(226,232,240); doc.line(margin, y, pageW-margin, y); y += 8;
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(100,116,139);
        doc.text(doc.splitTextToSize('Lectura: rendimiento = correctas/respondidas; cobertura = respondidas/total. Un rendimiento alto con baja cobertura se interpreta como muestra inicial, no como dominio completo.', pageW-2*margin), margin, y);
        doc.save(fileName);
      }catch(err){
        const blob = new Blob([makeTextReport()], {type:'text/plain;charset=utf-8'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName.replace(/\.pdf$/,'.txt');
        a.click(); URL.revokeObjectURL(a.href);
        alert('No se pudo generar PDF en este navegador. Descargué un reporte TXT como respaldo.');
      }
    }

    const VACCINE_ROWS = [
      ['rn','Recién nacido'], ['2m','2 meses'], ['3m','3 meses'], ['4m','4 meses'], ['5m','5 meses'], ['6m','6 meses'],
      ['12m','12 meses'], ['15m','15 meses'], ['18m','18 meses'], ['24m','24 meses'], ['2021','Nacidos en 2021'], ['2015','Nacidos en 2015'],
      ['15plus','A partir de los 15 años'], ['adultos','Adultos'], ['embarazadas','Embarazadas'], ['puerperas','Puérperas'], ['salud','Personal de salud']
    ];
    const VACCINE_COLS = [
      ['bcg','BCG'], ['hepb','Hepatitis B'], ['neumo','Neumococo conjugada'], ['penta','Quíntuple / Pentavalente'], ['ipv','IPV'], ['rota','Rotavirus'],
      ['menacwy','Meningococo ACWY'], ['gripe','Antigripal'], ['hepa','Hepatitis A'], ['triviral','Triple viral'], ['varicela','Varicela'], ['dtpc','Triple bacteriana celular'],
      ['dtpa','Triple bacteriana acelular'], ['vph','VPH'], ['db','Doble bacteriana'], ['vsr','VSR'], ['fa','Fiebre amarilla'], ['fha','Fiebre hemorrágica arg.']
    ];
    const VACCINE_ANSWERS = {
      'rn|bcg':'única dosis', 'rn|hepb':'dosis neonatal',
      '2m|neumo':'1° dosis', '2m|penta':'1° dosis', '2m|ipv':'1° dosis', '2m|rota':'1° dosis',
      '3m|menacwy':'1° dosis',
      '4m|neumo':'2° dosis', '4m|penta':'2° dosis', '4m|ipv':'2° dosis', '4m|rota':'2° dosis',
      '5m|menacwy':'2° dosis',
      '6m|penta':'3° dosis', '6m|ipv':'3° dosis', '6m|gripe':'dosis anual',
      '12m|neumo':'refuerzo', '12m|gripe':'dosis anual', '12m|hepa':'única dosis', '12m|triviral':'1° dosis',
      '15m|menacwy':'refuerzo', '15m|gripe':'dosis anual', '15m|varicela':'1° dosis',
      '18m|penta':'1° refuerzo', '18m|gripe':'dosis anual', '18m|triviral':'2° dosis', '18m|fa':'1° dosis',
      '24m|gripe':'dosis anual',
      '2021|ipv':'refuerzo', '2021|triviral':'2° dosis', '2021|varicela':'2° dosis', '2021|dtpc':'2° refuerzo',
      '2015|menacwy':'única dosis', '2015|dtpa':'refuerzo', '2015|vph':'única dosis', '2015|fa':'refuerzo',
      '15plus|triviral':'iniciar/completar esquema', '15plus|fha':'única dosis',
      'adultos|hepb':'iniciar/completar esquema', 'adultos|neumo':'única dosis', 'adultos|gripe':'dosis anual', 'adultos|triviral':'iniciar/completar esquema', 'adultos|db':'refuerzo cada 10 años',
      'embarazadas|gripe':'una dosis', 'embarazadas|dtpa':'una dosis', 'embarazadas|vsr':'única dosis',
      'puerperas|gripe':'una dosis', 'puerperas|triviral':'iniciar/completar esquema',
      'salud|gripe':'dosis anual', 'salud|dtpa':'una dosis'
    };
    let vaccineGameFinished = false;
    function renderVaccineGame(){
      const board = $('#vaccineGameBoard'); if(!board) return;
      vaccineGameFinished = false;
      const head = '<thead><tr><th class="sticky left-0 z-10 bg-slate-100 p-2 text-left text-[11px] font-black uppercase tracking-[.08em] dark:bg-slate-800">Vacunas / Edad</th>'+VACCINE_COLS.map(c=>'<th class="min-w-[120px] p-2 text-center text-[10px] font-black uppercase tracking-[.05em]">'+esc(c[1])+'</th>').join('')+'</tr></thead>';
      const body = '<tbody>'+VACCINE_ROWS.map(r=>'<tr><th class="sticky left-0 z-10 bg-white p-2 text-left text-xs font-black dark:bg-slate-900">'+esc(r[1])+'</th>'+VACCINE_COLS.map(c=>{
        const key = r[0]+'|'+c[0];
        return '<td class="vaccine-cell border border-slate-200 p-1 align-top dark:border-slate-700" data-key="'+key+'"><textarea aria-label="'+esc(r[1]+' '+c[1])+'" class="vaccine-input h-16 w-full resize-none rounded-lg bg-transparent p-1 text-[11px] font-bold outline-none" placeholder=""></textarea></td>';
      }).join('')+'</tr>').join('')+'</tbody>';
      board.innerHTML = '<table class="min-w-[2200px] border-collapse text-slate-900 dark:text-slate-100">'+head+body+'</table>';
      updateVaccineGameCounter();
    }
    function updateVaccineGameCounter(){
      const counter = $('#vaccineGameCounter'); if(!counter) return;
      const marked = $$('.vaccine-input').filter(i=>i.value.trim()).length;
      counter.textContent = marked+' celdas marcadas · '+Object.keys(VACCINE_ANSWERS).length+' dosis correctas';
    }
    document.addEventListener('input', e => { if(e.target?.classList?.contains('vaccine-input')) updateVaccineGameCounter(); });
    function resetVaccineGame(){
      vaccineGameFinished = false;
      $$('.vaccine-cell').forEach(td=>{ td.classList.remove('vaccine-ok','vaccine-bad','vaccine-missed'); td.removeAttribute('title'); });
      $$('.vaccine-input').forEach(i=>{ i.value=''; i.readOnly=false; i.placeholder=''; });
      const score = $('#vaccineGameScore'); if(score){ score.classList.add('hidden'); score.innerHTML=''; }
      updateVaccineGameCounter();
    }
    function finishVaccineGame(){
      if(!$('#vaccineGameBoard table')) renderVaccineGame();
      vaccineGameFinished = true;
      let correctMarked=0, wrongMarked=0, missed=0;
      $$('.vaccine-cell').forEach(td=>{
        const key = td.dataset.key;
        const input = td.querySelector('.vaccine-input');
        const marked = !!input.value.trim();
        const expected = VACCINE_ANSWERS[key] || '';
        td.classList.remove('vaccine-ok','vaccine-bad','vaccine-missed');
        input.readOnly = true;
        if(marked && expected){ correctMarked++; td.classList.add('vaccine-ok'); input.value = expected; td.title = 'Correcta: '+expected; }
        else if(marked && !expected){ wrongMarked++; td.classList.add('vaccine-bad'); td.title = 'Acá no iba una dosis'; }
        else if(!marked && expected){ missed++; td.classList.add('vaccine-missed'); input.placeholder = expected; td.title = 'Faltó: '+expected; }
      });
      const total = Object.keys(VACCINE_ANSWERS).length;
      const errors = wrongMarked + missed;
      const scorePct = Math.max(0, Math.round((correctMarked / total) * 100));
      const errorPct = Math.round((errors / total) * 100);
      const score = $('#vaccineGameScore');
      if(score){
        score.classList.remove('hidden');
        score.innerHTML = '<p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Resultado</p><p class="mt-1 font-display text-4xl font-extrabold">'+scorePct+'%</p><p class="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">'+correctMarked+' ubicaciones correctas de '+total+' dosis. Errores totales: '+errors+' ('+errorPct+'%).</p><div class="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-3"><span class="rounded-xl bg-emerald-50 p-2 text-emerald-700">Verde: correcta</span><span class="rounded-xl bg-rose-50 p-2 text-rose-700">Rojo: no iba dosis</span><span class="rounded-xl bg-amber-50 p-2 text-amber-700">Amarillo: faltó dosis</span></div>';
      }
      updateVaccineGameCounter();
    }

    function renderTodayProposalStrip(){
      const box = $('#todayProposalStrip'); if(!box) return;
      const due = dueQuestions().length;
      const mistakes = Object.keys(state.mistakes||{}).length;
      const answered = globalAnsweredQuestions().length;
      const cards = [
        {k:'1', t: state.session ? 'Retomar sesión' : 'Empezar bloque', d: state.session ? 'Tenés una sesión abierta para continuar.' : 'Arrancá con el banco completo o elegí sprint abajo.', a:'resumeOrStart()'},
        {k:'2', t: due ? 'Repaso del día' : 'Repaso al día', d: due ? due+' preguntas vencidas para consolidar.' : 'No hay vencidas ahora. Podés repasar errores.', a: due ? 'startDueSession()' : 'showView(\'review\')'},
        {k:'3', t:'Juego rápido', d:'Entrená calendario de vacunación sin feedback hasta finalizar.', a:'showView(\'games\')'}
      ];
      box.innerHTML = cards.map(c=>'<button class="v342-proposal rounded-[1.25rem] border border-slate-200 bg-white/75 p-3 text-left shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:bg-slate-800" onclick="'+c.a+'"><span class="inline-grid h-7 w-7 place-items-center rounded-xl bg-medical-50 text-xs font-black text-medical-700 dark:bg-medical-950/50 dark:text-medical-200">'+c.k+'</span><h4 class="mt-2 font-display text-sm font-extrabold">'+esc(c.t)+'</h4><p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+esc(c.d)+'</p></button>').join('');
    }

    const __v342ShowView = showView;
    showView = function(name){
      __v342ShowView(name);
      if(name==='games') renderVaccineGame();
      const titles={games:'Juegos de memoria'};
      if(titles[name] && $('#viewTitle')) $('#viewTitle').textContent = titles[name];
    };

    const __v342RenderAll = renderAll;
    renderAll = function(){ __v342RenderAll(); renderTodayProposalStrip(); if(!$('#gamesView')?.classList.contains('hidden')) renderVaccineGame(); };

    const __v342RenderV34Dashboard = renderV34Dashboard;
    renderV34Dashboard = function(){ __v342RenderV34Dashboard(); renderTodayProposalStrip(); };

    const __v342RenderV34QuickActions = renderV34QuickActions;
    renderV34QuickActions = function(){
      const box = $('#v34QuickActions'); if(!box) return __v342RenderV34QuickActions?.();
      const due = dueQuestions().length;
      const mistakes = Object.keys(state.mistakes||{}).length;
      const actions = [
        ['🧠','Sesión activa','Retomá o empezá un bloque.','resumeOrStart()'],
        ['🔁','Repaso inteligente', due+' vencidas para hoy.','showView(\'review\')'],
        ['🎮','Juegos','Calendario de vacunas en blanco.','showView(\'games\')'],
        ['📄','Reporte PDF','Descargá tus métricas con fecha.','downloadProgressPDF()'],
        ['🧾','Errores activos', mistakes+' para revancha.','startMistakesSession()'],
        ['⏱️','Simulacro','Modo examen con feedback final.','startGlobalSimulation()']
      ];
      box.innerHTML = actions.map(a=>'<button class="v34-action-btn rounded-[1.35rem] border border-slate-200 p-4 text-left dark:border-slate-800" onclick="'+a[3]+'"><div class="text-2xl">'+a[0]+'</div><h4 class="mt-2 font-display text-lg font-extrabold">'+a[1]+'</h4><p class="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">'+a[2]+'</p></button>').join('');
    };

    const __v342QuestionSessionSelection = questionSessionSelection;
    questionSessionSelection = function(q){
      if(session?.mode === 'exam' || session?.mode === 'revenge' || session?.method === 'repaso') return session.selected?.[q.id] || '';
      return __v342QuestionSessionSelection(q);
    };
    const __v342SelectedForScoring = selectedForScoring;
    selectedForScoring = function(q, oldSession){
      if(oldSession?.mode === 'exam' || oldSession?.mode === 'revenge' || oldSession?.method === 'repaso') return oldSession.selected?.[q.id] || '';
      return __v342SelectedForScoring(q, oldSession);
    };

    const __v342FinishSession = finishSession;
    finishSession = function(reason='manual'){
      const old = session;
      __v342FinishSession(reason);
      if(old?.method === 'repaso'){
        renderReview?.(); renderDueTodayHero?.(); renderV34Dashboard?.();
      }
    };

    const __v342ToggleSidebar = toggleSidebar;
    toggleSidebar = function(){
      __v342ToggleSidebar();
      if(window.innerWidth >= 1024){ state.sidebarOpen = !document.body.classList.contains('sidebar-collapsed'); saveState(); }
    };
    const __v342OpenMobileMenu = openMobileMenu;
    openMobileMenu = function(){
      __v342OpenMobileMenu();
      if(window.innerWidth >= 1024){ state.sidebarOpen = true; saveState(); }
    };
    function applyInitialSidebarPreference(){
      if(window.innerWidth >= 1024){
        const open = state.sidebarOpen === true;
        document.body.classList.toggle('sidebar-collapsed', !open);
      }
    }
    window.addEventListener('resize', () => applyInitialSidebarPreference());

    function init(){
      initSelects();
      session = state.session || null;
      const preferredDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(state.theme || (preferredDark?'dark':'light'));
      ensureCollaborationState();
      mergeEmbeddedCollaborationData();
      loadApprovedCollaborationData();
      applyInitialSidebarPreference?.();
      renderAll();
      renderCollaborationControls();
      initAccessGate();
      $('#themeToggle').addEventListener('click',()=>applyTheme(document.documentElement.classList.contains('dark')?'light':'dark'));
      $('#themeToggleTop')?.addEventListener('click',()=>applyTheme(document.documentElement.classList.contains('dark')?'light':'dark'));
      $('#mobileMenuBtn').addEventListener('click',toggleSidebar); $('#closeMenuBtn').addEventListener('click',closeMobileMenu); $('#overlay').addEventListener('click',closeMobileMenu);
      $('#resetProgressBtn').addEventListener('click', resetGlobalProgress);
    }
    init();
