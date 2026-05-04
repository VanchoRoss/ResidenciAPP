/* === ResidenciAPP v35.1 · Juegos + MedQuiz 5 ejes + vacunas UX ===
   Integra el flujo de desafío por link/base64 del MedQuiz externo dentro de la estética ResidenciAPP.
   Mantiene: calendario, banco local, API key localStorage, links sin backend y comparación por resultados.
*/
(function(){
  'use strict';

  const LS_API_KEY = 'RESIDENCIAPP_ANTHROPIC_API_KEY';
  const LS_API_KEY_COMPAT = 'mq_key';
  const LS_MODEL = 'RESIDENCIAPP_ANTHROPIC_MODEL';
  const LS_PLAYER = 'RESIDENCIAPP_CHALLENGE_PLAYER_NAME';
  const VERSION = 14;
  const TIMER_SECONDS = 20;
  const LS_USED_MIXES = 'RESIDENCIAPP_MEDQUIZ_USED_MIXES_V34_13';
  const LS_MIX_COUNTERS = 'RESIDENCIAPP_MEDQUIZ_COUNTERS_V34_13';

  const AXES = [
    {id:1, key:'clinica', short:'CLI', long:'Clínica médica', total:457, color:'#1877d6', bg:'rgba(24,119,214,.10)', border:'rgba(24,119,214,.28)', text:'#1260ad'},
    {id:2, key:'pediatria', short:'PED', long:'Pediatría', total:200, color:'#38bdf8', bg:'rgba(56,189,248,.10)', border:'rgba(56,189,248,.28)', text:'#0284c7'},
    {id:3, key:'gineco_obstetricia', short:'GIN', long:'Gineco-Obstetricia', total:186, color:'#e879f9', bg:'rgba(232,121,249,.10)', border:'rgba(232,121,249,.28)', text:'#c026d3'},
    {id:4, key:'salud_publica', short:'SP', long:'Salud Pública', total:68, color:'#22c55e', bg:'rgba(34,197,94,.10)', border:'rgba(34,197,94,.28)', text:'#16a34a'},
    {id:5, key:'cirugia', short:'CX', long:'Cirugía', total:63, color:'#fb923c', bg:'rgba(251,146,60,.10)', border:'rgba(251,146,60,.28)', text:'#ea580c'}
  ];

  const S = {
    activeGame: 'vaccine',
    screen: 'home',
    challenge: null,
    role: null,
    playerName: localStorage.getItem(LS_PLAYER) || '',
    qi: 0,
    answers: [],
    score: 0,
    selected: false,
    timer: null,
    timeLeft: TIMER_SECONDS,
    currentResult: null,
    creatorMode: false
  };

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (value='') => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const shuffle = arr => arr.map(v=>[Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  const axisById = id => AXES.find(a => a.id === Number(id)) || AXES[0];
  const uid = () => 'MQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,8).toUpperCase();

  function b64Encode(obj){
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    bytes.forEach(b => bin += String.fromCharCode(b));
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function b64Decode(token){
    try{
      const normalized = String(token||'').trim().replace(/\s/g,'').replace(/-/g,'+').replace(/_/g,'/');
      const pad = normalized.length % 4 ? '='.repeat(4 - normalized.length % 4) : '';
      const bin = atob(normalized + pad);
      const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
      return expandChallengePayload(JSON.parse(new TextDecoder().decode(bytes)));
    }catch(err){
      // Compatibilidad con links base64 clásicos del archivo MedQuiz.
      try{return expandChallengePayload(JSON.parse(decodeURIComponent(escape(atob(String(token||'').trim())))));}
      catch(_){ throw new Error('No pude leer el link. Revisá que esté completo.'); }
    }
  }
  function questionIndexById(){
    const bank = (window.RESIDENCIAPP_DATA?.questions || []);
    const map = new Map();
    bank.forEach(q => { if(q?.id) map.set(q.id, q); });
    return map;
  }
  function hydrateQuestionsFromIds(ids){
    const map = questionIndexById();
    return (ids || []).map(id => {
      const q = map.get(id);
      if(!q) return null;
      return normalizeBankQuestion(q, axisFromBankQuestion(q));
    }).filter(Boolean);
  }
  function compactAnswers(ans){
    return (ans || []).map(a => [a?.selectedIndex ?? -1, !!a?.correct, Number(a?.axisId)||0]);
  }
  function expandAnswers(ans){
    return (ans || []).map(a => Array.isArray(a) ? {selectedIndex:a[0], correct:!!a[1], axisId:a[2]} : a);
  }
  function compactAIQuestion(q){
    return {x:q.axisId,n:q.axisName,q:q.question,o:q.options,c:q.correctIndex,e:q.explanation,t:q.topic};
  }
  function expandAIQuestion(q){
    if(!q) return null;
    if(q.question || q.options) return q;
    return {axisId:q.x, axisName:q.n, question:q.q, options:q.o, correctIndex:q.c, explanation:q.e, topic:q.t};
  }
  function compactChallengePayload(ch){
    if(!ch) return ch;
    const ids = (ch.questions || []).map(q => q.sourceId).filter(Boolean);
    const local = ids.length === (ch.questions || []).length;
    return {
      t:'mq', v:VERSION, i:ch.id || uid(), ca:ch.createdAt || new Date().toISOString(),
      cn:ch.creatorName || '', on:ch.opponentName || '', d:ch.difficulty || 'Examen', s:local ? 'local' : (ch.source || 'Anthropic'), m:ch.mixMode || '',
      qi: local ? ids : undefined,
      qs: local ? undefined : (ch.questions || []).map(compactAIQuestion),
      cs: ch.creatorScore ?? null, ce: compactAnswers(ch.creatorAnswers),
      hn: ch.challengerName || null, hs: ch.challengerScore ?? null, he: compactAnswers(ch.challengerAnswers)
    };
  }
  function expandChallengePayload(obj){
    if(!obj) return obj;
    if(obj.t !== 'mq') return obj;
    const questions = obj.qi ? hydrateQuestionsFromIds(obj.qi) : (obj.qs || []).map(expandAIQuestion).filter(Boolean);
    return {
      type:'medquiz_challenge', v:obj.v || VERSION, id:obj.i || uid(), createdAt:obj.ca || new Date().toISOString(),
      creatorName:obj.cn || '', opponentName:obj.on || '', topic:'Banco integrado', difficulty:obj.d || 'Examen', source:obj.s === 'local' ? 'Banco local' : (obj.s || 'Anthropic'), mixMode:obj.m || '',
      questions,
      creatorScore: obj.cs ?? null, creatorAnswers: expandAnswers(obj.ce),
      challengerName: obj.hn || null, challengerScore: obj.hs ?? null, challengerAnswers: expandAnswers(obj.he)
    };
  }
  function siteBase(){ return window.location.origin + window.location.pathname; }
  function makeChallengeLink(challenge){ return siteBase() + '#c=' + b64Encode(compactChallengePayload(challenge)); }
  function makeResultLink(challenge){ return siteBase() + '#c=' + b64Encode(compactChallengePayload(challenge)); }
  function readTokens(){
    const p = new URLSearchParams(window.location.search || '');
    const h = new URLSearchParams(String(window.location.hash||'').replace(/^#\??/,''));
    return {
      c: p.get('c') || h.get('c') || '',
      desafio: p.get('desafio') || h.get('desafio') || '',
      resultado: p.get('resultado') || h.get('resultado') || ''
    };
  }
  function getApiKey(){ return localStorage.getItem(LS_API_KEY) || localStorage.getItem(LS_API_KEY_COMPAT) || ''; }
  function setApiKey(value){ localStorage.setItem(LS_API_KEY, value); localStorage.setItem(LS_API_KEY_COMPAT, value); }

  function updateStaticLabels(){
    const nav = document.querySelector('[data-nav="games"]');
    if(nav) nav.innerHTML = '🎮 Juegos';
    $$('.v34-bottom-btn small').forEach(el => { if(el.textContent.trim().toLowerCase().includes('juego')) el.textContent = 'Juegos'; });
  }

  function renderGamesShell(){
    const view = $('#gamesView');
    if(!view) return;
    if(view.dataset.v3411Shell === '1') return;
    view.dataset.v3411Shell = '1';
    view.innerHTML = `
      <div class="space-y-6">
        <section class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p class="text-xs font-black uppercase tracking-[.18em] text-emerald-600 dark:text-emerald-300">Juegos</p>
              <h3 class="mt-1 font-display text-3xl font-extrabold">Entrenamiento activo</h3>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">Calendario de vacunación en blanco y desafíos médicos por link, sin backend, integrados con la estética de ResidenciAPP.</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="game-tab-btn rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-soft" data-game-tab="vaccine" onclick="openMemoryGame('vaccine')">💉 Calendario</button>
              <button class="game-tab-btn rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" data-game-tab="challenge" onclick="openMemoryGame('challenge')">⚔️ MedQuiz</button>
              <button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="openChallengeSettings()">⚙ API</button>
            </div>
          </div>
          <div id="challengeSettings" class="mt-5 hidden rounded-3xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"></div>
        </section>

        <section id="vaccineGamePanel" class="game-panel grid gap-4">
          <section class="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p class="text-xs font-black uppercase tracking-[.18em] text-emerald-600 dark:text-emerald-300">Juego 1 · Calendario Nacional 2026</p>
                <h3 class="font-display text-2xl font-extrabold">Calendario de vacunación en blanco</h3>
                <p class="mt-1 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">Tocá para marcar/desmarcar. Verde = correcta · rojo = no iba dosis · amarillo = dosis omitida.</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <p id="vaccineGameCounter" class="mr-2 text-xs font-black uppercase tracking-[.14em] text-slate-400"></p>
                <button class="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-soft hover:bg-emerald-700" onclick="finishVaccineGame()">Terminar</button>
                <button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="resetVaccineGame()">Reiniciar</button>
              </div>
            </div>
            <div id="vaccineGameScore" class="mb-4 hidden rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"></div>
            <div id="vaccineGameBoard" class="vaccine-game-board overflow-auto rounded-3xl border border-slate-200 dark:border-slate-700"></div>
          </section>
        </section>

        <section id="challengeGamePanel" class="game-panel hidden">
          <div id="medquizRoot"></div>
        </section>
      </div>`;
  }

  function setGameTab(name){
    renderGamesShell();
    S.activeGame = name === 'challenge' ? 'challenge' : 'vaccine';
    $('#vaccineGamePanel')?.classList.toggle('hidden', S.activeGame !== 'vaccine');
    $('#challengeGamePanel')?.classList.toggle('hidden', S.activeGame !== 'challenge');
    $$('.game-tab-btn').forEach(btn=>{
      const on = btn.dataset.gameTab === S.activeGame;
      btn.classList.toggle('bg-emerald-600', on && S.activeGame==='vaccine');
      btn.classList.toggle('bg-indigo-600', on && S.activeGame==='challenge');
      btn.classList.toggle('text-white', on);
      btn.classList.toggle('shadow-soft', on);
      btn.classList.toggle('border', !on);
      btn.classList.toggle('border-slate-200', !on);
    });
    if(S.activeGame === 'vaccine' && typeof window.renderVaccineGame === 'function') window.renderVaccineGame();
    if(S.activeGame === 'challenge') renderMedQuiz();
  }

  function renderChallengeSettings(forceOpen=false){
    renderGamesShell();
    const box = $('#challengeSettings');
    if(!box) return;
    if(forceOpen) box.classList.remove('hidden'); else box.classList.toggle('hidden');
    const key = getApiKey();
    const model = localStorage.getItem(LS_MODEL) || 'claude-3-5-haiku-latest';
    box.innerHTML = `
      <div class="grid gap-4 lg:grid-cols-[1fr_.62fr_auto] lg:items-end">
        <div>
          <p class="text-xs font-black uppercase tracking-[.16em] text-amber-700 dark:text-amber-300">Configuración local</p>
          <p class="mt-1 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">La API key es opcional. Se guarda en este navegador y solo se usa si elegís “Generar con IA”. Para links cortos, usá “Crear mix automático” con Banco 974.</p>
        </div>
        <label class="block text-xs font-black uppercase tracking-[.14em] text-slate-500">Anthropic API key
          <input id="anthropicKeyInput" type="password" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" placeholder="sk-ant-..." value="${esc(key)}" />
        </label>
        <label class="block text-xs font-black uppercase tracking-[.14em] text-slate-500">Modelo
          <input id="anthropicModelInput" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" value="${esc(model)}" />
        </label>
        <div class="flex gap-2 lg:flex-col">
          <button class="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white" onclick="saveChallengeSettings()">Guardar</button>
          <button class="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black dark:border-slate-700" onclick="deleteChallengeSettings()">Borrar</button>
        </div>
      </div>`;
  }
  function saveChallengeSettings(){
    const key = $('#anthropicKeyInput')?.value?.trim() || '';
    const model = $('#anthropicModelInput')?.value?.trim() || 'claude-3-5-haiku-latest';
    if(key && !key.startsWith('sk-')){ alert('La API key debería empezar con sk-.'); return; }
    if(key) setApiKey(key);
    localStorage.setItem(LS_MODEL, model);
    alert('Configuración guardada en este navegador.');
  }
  function deleteChallengeSettings(){
    localStorage.removeItem(LS_API_KEY); localStorage.removeItem(LS_API_KEY_COMPAT); localStorage.removeItem(LS_MODEL);
    renderChallengeSettings(true);
  }

  function setMedQuizScreen(screen){
    S.screen = screen;
    renderMedQuiz();
  }

  function renderMedQuiz(){
    const root = $('#medquizRoot');
    if(!root) return;
    const screens = {
      home: renderHomeScreen,
      create: renderCreateScreen,
      generating: renderGeneratingScreen,
      share: renderShareScreen,
      join: renderJoinScreen,
      reveal: renderRevealScreen,
      play: renderPlayScreen,
      wait: renderWaitScreen,
      results: renderResultsScreen
    };
    root.innerHTML = `<div class="medquiz-shell mx-auto max-w-5xl">${(screens[S.screen] || screens.home)()}</div>`;
    afterRender();
  }

  function worldCards(){
    return `<div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">${AXES.map(a=>`
      <article class="medquiz-world rounded-[1.45rem] border p-4" style="background:${a.bg};border-color:${a.border}">
        <div class="grid h-12 w-12 place-items-center rounded-2xl text-sm font-black" style="background:${a.color}1f;color:${a.text};border:1px solid ${a.border}">${a.short}</div>
        <h4 class="mt-3 text-sm font-black uppercase tracking-[.08em]" style="color:${a.text}">${a.long}</h4>
      </article>`).join('')}</div>`;
  }

  function renderHomeScreen(){
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">MedQuiz · Residencia Argentina 2026</p>
            <h3 class="mt-2 font-display text-4xl font-extrabold tracking-tight">Desafío médico por link</h3>
            <p class="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">Creá duelos con 5 ejes reales del banco: Clínica, Pediatría, Gineco-Obstetricia, Salud Pública y Cirugía. Los links del banco local viajan cortos porque solo guardan IDs.</p>
          </div>
          <div class="grid gap-2 sm:min-w-56">
            <button class="rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black text-white shadow-soft hover:bg-indigo-700" onclick="medquizGoCreate()">Crear desafío</button>
            <button class="rounded-2xl border border-slate-200 px-5 py-4 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="medquizShow('join')">Tengo un link</button>
          </div>
        </div>
        ${worldCards()}
      </section>`;
  }

  function renderCreateScreen(){
    const summary = getMixUsageSummary();
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <button class="mb-4 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black dark:border-slate-700" onclick="medquizShow('home')">← Volver</button>
        <p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Nuevo desafío</p>
        <h3 class="mt-1 font-display text-3xl font-extrabold">Crear MedQuiz</h3>
        <p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">El sistema arma el mix automáticamente, sin elegir tema. Cada universo usa grupos únicos para evitar repetir preguntas dentro de su propio catálogo.</p>
        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <label class="text-xs font-black uppercase tracking-[.14em] text-slate-400">Tu nombre
            <input id="mqCreator" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" placeholder="" value="" />
          </label>
          <label class="text-xs font-black uppercase tracking-[.14em] text-slate-400">A quién desafiás
            <input id="mqOpponent" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" placeholder="" value="" />
          </label>
        </div>

        <div class="mt-5 grid gap-3 lg:grid-cols-2">
          <article class="rounded-3xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <p class="text-xs font-black uppercase tracking-[.16em] text-indigo-700 dark:text-indigo-300">Universo 1 · ${summary.u1.used}/${summary.u1.total} usados</p>
            <h4 class="mt-1 font-display text-2xl font-extrabold">31 mixes de 10 preguntas</h4>
            <p class="mt-2 text-sm font-bold leading-6 text-indigo-900 dark:text-indigo-100">2 Clínica · 2 Pediatría · 2 Gineco-Obstetricia · 2 Salud Pública · 2 Cirugía.</p>
            <button class="mt-4 w-full rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black text-white shadow-soft hover:bg-indigo-700" onclick="medquizCreateUniverse('u1')">Crear Universo 1</button>
          </article>
          <article class="rounded-3xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20">
            <p class="text-xs font-black uppercase tracking-[.16em] text-cyan-700 dark:text-cyan-300">Universo 2 · ${summary.u2.used}/${summary.u2.total} usados</p>
            <h4 class="mt-1 font-display text-2xl font-extrabold">62 mixes de 6 preguntas</h4>
            <p class="mt-2 text-sm font-bold leading-6 text-cyan-900 dark:text-cyan-100">2 Clínica · 2 Pediatría · 2 Gineco-Obstetricia. Usa el segundo bloque de preguntas sin repetir.</p>
            <button class="mt-4 w-full rounded-2xl bg-cyan-600 px-5 py-4 text-sm font-black text-white shadow-soft hover:bg-cyan-700" onclick="medquizCreateUniverse('u2')">Crear Universo 2</button>
          </article>
        </div>

        <div class="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
          <p><strong>Cobertura planificada:</strong> Universo 1 usa 62 preguntas por eje. Universo 2 usa 124 preguntas extra de Clínica, Pediatría y Gineco-Obstetricia. Remanente final: Clínica 271 · Pediatría 14 · Salud Pública 6 · Cirugía 1.</p>
        </div>
        <div id="mqStatus" class="mt-4 text-sm font-bold text-slate-500"></div>
        <div class="mt-5 flex flex-wrap gap-2">
          <button class="rounded-2xl border border-slate-200 px-5 py-4 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="medquizCreateAI()">Generar con IA · 10 preguntas</button>
          <button class="rounded-2xl border border-amber-200 px-5 py-4 text-sm font-black text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-300 dark:hover:bg-amber-950/20" onclick="openChallengeSettings()">⚙ API</button>
          <button class="rounded-2xl border border-rose-200 px-5 py-4 text-sm font-black text-rose-700 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/20" onclick="medquizResetMixHistory()">Reiniciar historial de mixes</button>
        </div>
      </section>`;
  }

  function renderGeneratingScreen(){
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-300"></div>
        <h3 class="mt-5 font-display text-3xl font-extrabold">Generando desafío</h3>
        <p id="mqGenStatus" class="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">Consultando motor de preguntas…</p>
        <div class="mt-6 flex justify-center gap-2">${AXES.map((a,i)=>`<span class="h-3 w-3 animate-pulse rounded-full" style="background:${a.color};animation-delay:${i*.18}s"></span>`).join('')}</div>
      </section>`;
  }

  function renderShareScreen(){
    const link = S.challenge ? makeChallengeLink(S.challenge) : '';
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-black uppercase tracking-[.18em] text-emerald-600 dark:text-emerald-300">Desafío creado</p>
        <h3 class="mt-1 font-display text-3xl font-extrabold">Compartí el link</h3>
        <p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">El link compacto contiene solo los IDs de las preguntas y los datos mínimos del desafío. Al abrirlo, la otra persona verá “${esc((S.challenge?.creatorName||'').toUpperCase())} TE DESAFIO”.</p>
        <textarea id="mqShareLink" class="mt-5 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-5 dark:border-slate-700 dark:bg-slate-950" readonly>${esc(link)}</textarea>
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-900" onclick="medquizCopy('mqShareLink')">Copiar link</button>
          <button class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white" onclick="medquizStartOwn()">Jugar mi turno</button>
          <button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black dark:border-slate-700" onclick="medquizShow('home')">Nuevo</button>
        </div>
      </section>`;
  }

  function renderJoinScreen(){
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <button class="mb-4 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black dark:border-slate-700" onclick="medquizShow('home')">← Volver</button>
        <p class="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">Unirse o comparar</p>
        <h3 class="mt-1 font-display text-3xl font-extrabold">Pegá el link</h3>
        <p class="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">Acepta links de desafío, links de resultado o códigos base64 completos.</p>
        <textarea id="mqJoinLink" class="mt-5 min-h-28 w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 dark:border-slate-700 dark:bg-slate-950" placeholder="Pegá acá el link…"></textarea>
        <div id="mqJoinError" class="mt-3 hidden rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300"></div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white" onclick="medquizLoadPasted()">Abrir link</button>
          <button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black dark:border-slate-700" onclick="medquizComparePasted()">Ver comparación</button>
        </div>
      </section>`;
  }

  function renderRevealScreen(){
    const creator = S.challenge?.creatorName || S.challenge?.creator || 'Franco';
    const score = S.challenge?.creatorScore;
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-indigo-200 bg-indigo-50 font-display text-4xl font-extrabold text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">${esc(creator.charAt(0).toUpperCase())}</div>
        <h3 class="mt-5 font-display text-5xl font-extrabold leading-none tracking-tight">${esc(creator.toUpperCase())}<br>TE DESAFIO</h3>
        <p class="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">${score != null ? `Ya jugó: ${score}/${S.challenge.questions.length}` : 'Aceptá el desafío y resolvé el mismo set de preguntas.'}</p>
        <div class="mx-auto mt-6 max-w-md text-left">
          <label class="text-xs font-black uppercase tracking-[.14em] text-slate-400">Tu nombre
            <input id="mqPlayerName" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950" placeholder="" value="${esc(S.playerName || S.challenge?.opponentName || '')}" />
          </label>
        </div>
        <div class="mt-5 flex justify-center gap-2">
          <button class="rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black text-white" onclick="medquizAcceptChallenge()">Aceptar desafío</button>
          <button class="rounded-2xl border border-slate-200 px-5 py-4 text-sm font-black dark:border-slate-700" onclick="medquizShow('join')">Volver</button>
        </div>
      </section>`;
  }

  function renderPlayScreen(){
    const q = S.challenge?.questions?.[S.qi];
    if(!q) return `<section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">No hay pregunta activa.</section>`;
    const ax = axisById(q.axisId);
    const total = S.challenge.questions.length;
    const progressDots = S.challenge.questions.map((_,i)=>{
      let color = 'rgb(203 213 225)';
      if(i < S.answers.length) color = S.answers[i].correct ? axisById(S.challenge.questions[i].axisId).color : '#ef4444';
      if(i === S.qi) color = ax.color;
      return `<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:${color}"></span>`;
    }).join('');
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div class="flex items-center justify-between gap-3">
          <span class="rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[.12em]" style="background:${ax.bg};border-color:${ax.border};color:${ax.text}">${ax.short}</span>
          <span class="text-xs font-black uppercase tracking-[.14em] text-slate-400">${S.qi+1} / ${total}</span>
        </div>
        <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div id="mqTimerFill" class="h-full rounded-full transition-all duration-1000" style="width:100%;background:${ax.color}"></div></div>
        <div class="mt-3 flex justify-center gap-1.5">${progressDots}</div>
        <article class="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950/50">
          <p class="text-xs font-black uppercase tracking-[.18em]" style="color:${ax.text}">${esc(q.topic || q.axisName || ax.long)}</p>
          <p class="mt-3 text-base font-bold leading-7 text-slate-900 dark:text-slate-100">${esc(q.question || q.stem)}</p>
        </article>
        <div id="mqOptions" class="mt-4 grid gap-3">${(q.options||[]).map((opt,i)=>`
          <button id="mqOpt${i}" class="mq-option flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-bold leading-6 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onclick="medquizSelect(${i})">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 dark:bg-slate-800">${String.fromCharCode(65+i)}</span>
            <span>${esc(opt)}</span>
          </button>`).join('')}</div>
        <div id="mqExplanation" class="mt-4 hidden rounded-2xl border p-4 text-sm font-semibold leading-6"></div>
        <div id="mqNextWrap" class="mt-4 hidden"><button class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white" onclick="medquizNext()">Siguiente →</button></div>
      </section>`;
  }

  function renderWaitScreen(){
    const total = S.challenge?.questions?.length || 8;
    const resultLink = makeResultLink(S.challenge);
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs font-black uppercase tracking-[.18em] text-slate-400">Tu puntaje</p>
        <h3 class="mt-2 font-display text-6xl font-extrabold text-indigo-600 dark:text-indigo-300">${S.score}/${total}</h3>
        <p class="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">Copiá este link y mandáselo a la otra persona. Contiene tu puntaje y respuestas incorporadas.</p>
        <textarea id="mqResultLink" class="mt-5 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-5 dark:border-slate-700 dark:bg-slate-950" readonly>${esc(resultLink)}</textarea>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <button class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-900" onclick="medquizCopy('mqResultLink')">Copiar resultado</button>
          <button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black dark:border-slate-700" onclick="medquizShow('join')">Pegar link rival</button>
          <button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black dark:border-slate-700" onclick="medquizShow('home')">Nuevo desafío</button>
        </div>
      </section>`;
  }

  function renderResultsScreen(){
    const ch = S.challenge;
    const p1n = ch?.creatorName || 'Creador';
    const p2n = ch?.challengerName || ch?.opponentName || 'Rival';
    const p1s = typeof ch?.creatorScore === 'number' ? ch.creatorScore : null;
    const p2s = typeof ch?.challengerScore === 'number' ? ch.challengerScore : null;
    const total = ch?.questions?.length || 8;
    let headline = 'Comparación pendiente';
    if(p1s != null && p2s != null){
      if(p1s > p2s) headline = `Ganó ${p1n}`;
      else if(p2s > p1s) headline = `Ganó ${p2n}`;
      else headline = 'Empate';
    }
    const rows = AXES.map(a=>{
      const idxs = (ch?.questions||[]).map((q,i)=>Number(q.axisId)===a.id?i:-1).filter(i=>i>=0);
      if(!idxs.length) return '';
      const c1 = ch?.creatorAnswers ? idxs.filter(i=>ch.creatorAnswers[i]?.correct).length + '/' + idxs.length : '—/' + idxs.length;
      const c2 = ch?.challengerAnswers ? idxs.filter(i=>ch.challengerAnswers[i]?.correct).length + '/' + idxs.length : '—/' + idxs.length;
      return `<div class="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"><span class="h-3 w-3 rounded-full" style="background:${a.color}"></span><span class="flex-1 text-sm font-bold text-slate-600 dark:text-slate-300">${a.long}</span><span class="font-display text-lg font-extrabold" style="color:${a.color}">${c1}</span><span class="text-xs font-black text-slate-400">vs</span><span class="font-display text-lg font-extrabold" style="color:${a.color}">${c2}</span></div>`;
    }).join('');
    const detail = (ch?.questions||[]).map((q,i)=>{
      const ca = ch.creatorAnswers?.[i]; const oa = ch.challengerAnswers?.[i];
      return `<tr class="border-t border-slate-200 dark:border-slate-700"><td class="p-3 text-xs font-black">${i+1}</td><td class="p-3 text-xs font-semibold leading-5">${esc(q.question||q.stem)}</td><td class="p-3 text-xs font-bold ${ca?.correct?'text-emerald-600':ca?'text-rose-600':'text-slate-400'}">${esc(answerText(q, ca?.selectedIndex))}</td><td class="p-3 text-xs font-bold ${oa?.correct?'text-emerald-600':oa?'text-rose-600':'text-slate-400'}">${esc(answerText(q, oa?.selectedIndex))}</td><td class="p-3 text-xs font-bold text-slate-500">${esc(answerText(q, q.correctIndex))}</td></tr>`;
    }).join('');
    return `
      <section class="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        <p class="text-center text-xs font-black uppercase tracking-[.18em] text-slate-400">Resultado del desafío</p>
        <h3 class="mt-2 text-center font-display text-4xl font-extrabold">${esc(headline)}</h3>
        <div class="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <article class="rounded-3xl border border-slate-200 p-4 text-center dark:border-slate-700"><p class="truncate text-xs font-black uppercase tracking-[.14em] text-slate-400">${esc(p1n)}</p><p class="mt-1 font-display text-5xl font-extrabold">${p1s!=null?p1s+'/'+total:'—'}</p></article>
          <p class="font-display text-2xl font-extrabold text-slate-400">VS</p>
          <article class="rounded-3xl border border-slate-200 p-4 text-center dark:border-slate-700"><p class="truncate text-xs font-black uppercase tracking-[.14em] text-slate-400">${esc(p2n)}</p><p class="mt-1 font-display text-5xl font-extrabold">${p2s!=null?p2s+'/'+total:'—'}</p></article>
        </div>
        <div class="mt-5 grid gap-2">${rows}</div>
        <details class="mt-5 rounded-3xl border border-slate-200 p-4 dark:border-slate-700">
          <summary class="cursor-pointer text-sm font-black">Ver detalle pregunta por pregunta</summary>
          <div class="mt-4 overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700"><table class="min-w-[900px] w-full text-left"><thead class="bg-slate-50 dark:bg-slate-950"><tr><th class="p-3 text-xs font-black">#</th><th class="p-3 text-xs font-black">Pregunta</th><th class="p-3 text-xs font-black">${esc(p1n)}</th><th class="p-3 text-xs font-black">${esc(p2n)}</th><th class="p-3 text-xs font-black">Correcta</th></tr></thead><tbody>${detail}</tbody></table></div>
        </details>
        <div class="mt-5 flex flex-wrap justify-center gap-2"><button class="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white" onclick="medquizShow('home')">Nuevo desafío</button><button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black dark:border-slate-700" onclick="medquizShow('join')">Pegar otro link</button></div>
      </section>`;
  }

  function afterRender(){
    if(S.screen === 'play') startTimer();
    if(S.screen === 'create') setTimeout(()=>$('#mqCreator')?.focus(), 50);
    if(S.screen === 'join') setTimeout(()=>$('#mqJoinLink')?.focus(), 50);
    if(S.screen === 'reveal') setTimeout(()=>$('#mqPlayerName')?.focus(), 50);
  }

  function setStatus(msg, kind='info'){
    const el = $('#mqStatus');
    if(!el) return;
    el.textContent = msg || '';
    el.className = 'mt-4 text-sm font-bold ' + (kind==='error'?'text-rose-600':kind==='ok'?'text-emerald-600':'text-slate-500');
  }
  function medquizGoCreate(){ setMedQuizScreen('create'); }
  function goCreate(){ medquizGoCreate(); }

  async function createChallenge(useAI, mixMode='u1'){
    const creatorName = ($('#mqCreator')?.value || '').trim();
    const opponentName = ($('#mqOpponent')?.value || '').trim();
    const topic = '';
    const difficulty = useAI ? 'Examen IA' : (mixMode === 'u2' ? 'Universo 2 · 6 preguntas' : 'Universo 1 · 10 preguntas');
    if(!creatorName){ setStatus('Ingresá tu nombre para continuar.', 'error'); return; }
    S.playerName = creatorName; localStorage.setItem(LS_PLAYER, creatorName);
    S.creatorMode = true; S.role = 'creator';
    setMedQuizScreen('generating');
    try{
      const gen = $('#mqGenStatus');
      if(gen) gen.textContent = useAI ? 'Generando 10 preguntas con IA…' : (mixMode === 'u2' ? 'Armando Universo 2 desde Banco 974…' : 'Armando Universo 1 desde Banco 974…');
      const questions = useAI ? await genQuestionsAI({topic, difficulty}) : genQuestionsLocal({mixMode});
      S.challenge = {
        type:'medquiz_challenge', v:VERSION, id:uid(), createdAt:new Date().toISOString(),
        creatorName, opponentName, topic:'Banco integrado', difficulty, source:useAI?'Anthropic':'Banco local', mixMode,
        questions, creatorScore:null, creatorAnswers:null, challengerName:null, challengerScore:null, challengerAnswers:null
      };
      if(!useAI) markMixAsUsed(mixMode, questions);
      setMedQuizScreen('share');
    }catch(err){
      setMedQuizScreen('create');
      setStatus(err.message || 'No pude crear el desafío.', 'error');
    }
  }
  function medquizCreateAI(){ if(!getApiKey()){ openChallengeSettings(); setStatus('Primero pegá la Anthropic API key o usá banco local.', 'error'); return; } createChallenge(true, 'ia'); }
  function medquizCreateLocal(){ createChallenge(false, 'u1'); }
  function medquizCreateUniverse(mode){ createChallenge(false, mode === 'u2' ? 'u2' : 'u1'); }

  async function callAnthropic(system, user, maxTokens=3500){
    const key = getApiKey();
    if(!key) throw new Error('Falta configurar la API key en ⚙ API.');
    const model = localStorage.getItem(LS_MODEL) || 'claude-3-5-haiku-latest';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key':key,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body:JSON.stringify({model, max_tokens:maxTokens, system, messages:[{role:'user', content:user}]})
    });
    if(!res.ok){
      const e = await res.json().catch(()=>({}));
      throw new Error(e.error?.message || `Error Anthropic HTTP ${res.status}`);
    }
    const data = await res.json();
    return String(data.content?.[0]?.text || '').replace(/```json|```/g,'').trim();
  }

  async function genQuestionsAI({topic, difficulty}){
    const system = 'Eres un generador de preguntas de examen de residencia medica argentina CABA e Integrado 2026. Responde UNICAMENTE con JSON valido sin markdown.';
    const user = `Genera exactamente 10 preguntas multiple choice de residencia medica argentina CABA/Integrado 2026, balanceadas: 2 preguntas por cada eje.

Ejes obligatorios:
1 Clínica médica: cardiología, neumonología, infectología, endocrinología, nefrología, hematología, gastroenterología, neurología, psiquiatría, toxicología y geriatría clínica.
2 Pediatría: vacunas, neonatología, crecimiento/desarrollo, diarrea, neumonía pediátrica, anemia, lactancia, adolescencia y maltrato.
3 Gineco-Obstetricia: control prenatal, hemorragias, RPM, eclampsia, IVE/ILE, anticoncepción, PAP/colposcopía, infecciones perinatales, parto, puerperio, SOP y oncoginecología.
4 Salud Pública: APS, epidemiología, rastreos, prevención, inmunizaciones en adultos, factores de riesgo y programas sanitarios.
5 Cirugía: abdomen agudo, trauma, preoperatorio, postoperatorio, cirugía digestiva, torácica, vascular y oncología quirúrgica.

Dificultad: ${difficulty || 'Examen'}.

Formato JSON estricto:
{"questions":[{"axisId":1,"axisName":"Clínica médica","question":"Paciente de...","options":["opcion A","opcion B","opcion C","opcion D"],"correctIndex":0,"explanation":"La opcion A es correcta porque... Las otras son incorrectas porque...","topic":"Cardiología"}]}

OBLIGATORIO: exactamente 2 con axisId=1, 2 con axisId=2, 2 con axisId=3, 2 con axisId=4 y 2 con axisId=5. Casos clinicos breves. Distractores plausibles. Una sola respuesta correcta.`;
    const txt = await callAnthropic(system, user);
    const parsed = JSON.parse(txt);
    return normalizeGeneratedQuestions(parsed.questions || []);
  }

  function bankQuestions(){ return (window.RESIDENCIAPP_DATA?.questions || []).filter(q => q?.id && q?.q && q?.opts && q?.ans); }
  function sourceAxis(q){
    const src = String(q?.source || '').toLowerCase();
    if(src === 'clinica') return 1;
    if(src === 'pediatria') return 2;
    if(src === 'gineco_obstetricia') return 3;
    if(src === 'salud_publica') return 4;
    if(src === 'cirugia') return 5;
    const txt = [q?.eje,q?.source,q?.sprint,q?.tema].join(' ').toLowerCase();
    if(txt.includes('salud pública') || txt.includes('salud publica') || txt.includes('aps') || txt.includes('epidemi')) return 4;
    if(txt.includes('cirug')) return 5;
    if(txt.includes('gine') || txt.includes('obst') || txt.includes('mujer')) return 3;
    if(txt.includes('niñ') || txt.includes('ninez') || txt.includes('pediatr') || txt.includes('adolesc')) return 2;
    return 1;
  }
  function seededShuffle(arr, seed='residenciapp-medquiz-v34-13'){
    let h = 2166136261;
    const s = String(seed);
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    function rnd(){ h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    const out = arr.slice();
    for(let i=out.length-1;i>0;i--){ const j = Math.floor(rnd()*(i+1)); [out[i],out[j]] = [out[j],out[i]]; }
    return out;
  }
  function buildMixCatalog(){
    const bank = bankQuestions();
    const pools = {};
    AXES.forEach(ax => { pools[ax.id] = seededShuffle(bank.filter(q => sourceAxis(q) === ax.id).sort((a,b)=>String(a.id).localeCompare(String(b.id))), 'mix-'+ax.key+'-v34.13'); });
    const required = {1:457,2:200,3:186,4:68,5:63};
    for(const ax of AXES){ if((pools[ax.id]||[]).length < Math.min(required[ax.id], ax.total)){ console.warn('Pool menor a esperado', ax.long, pools[ax.id]?.length); } }
    const u1 = [];
    for(let i=0;i<31;i++){
      const qs = AXES.flatMap(ax => (pools[ax.id] || []).slice(i*2, i*2+2));
      if(qs.length === 10) u1.push({id:'U1-'+String(i+1).padStart(2,'0'), mode:'u1', label:'Universo 1', questions:qs});
    }
    const u2 = [];
    for(let i=0;i<62;i++){
      const qs = [1,2,3].flatMap(axisId => (pools[axisId] || []).slice(62 + i*2, 62 + i*2 + 2));
      if(qs.length === 6) u2.push({id:'U2-'+String(i+1).padStart(2,'0'), mode:'u2', label:'Universo 2', questions:qs});
    }
    const remnant = {
      clinica: (pools[1] || []).slice(186),
      pediatria: (pools[2] || []).slice(186),
      gineco_obstetricia: (pools[3] || []).slice(186),
      salud_publica: (pools[4] || []).slice(62),
      cirugia: (pools[5] || []).slice(62)
    };
    return {u1,u2,remnant,pools};
  }
  function getMixState(){
    try{return JSON.parse(localStorage.getItem(LS_USED_MIXES) || '{}') || {};}
    catch(_){return {};}
  }
  function setMixState(state){ localStorage.setItem(LS_USED_MIXES, JSON.stringify(state || {})); }
  function getMixUsageSummary(){
    const catalog = buildMixCatalog();
    const used = getMixState();
    return {
      u1:{total:catalog.u1.length, used:Object.keys(used.u1 || {}).length},
      u2:{total:catalog.u2.length, used:Object.keys(used.u2 || {}).length}
    };
  }
  function pickMix(mode='u1'){
    const catalog = buildMixCatalog();
    const list = mode === 'u2' ? catalog.u2 : catalog.u1;
    if(!list.length) throw new Error('No pude construir el catálogo de mixes desde el banco local.');
    const used = getMixState();
    used[mode] = used[mode] || {};
    const next = list.find(m => !used[mode][m.id]);
    if(!next) throw new Error('Ya se usaron todos los mixes de este universo en este navegador. Reiniciá el historial de mixes para volver a empezar.');
    return next;
  }
  function markMixAsUsed(mode, questions){
    if(!questions?.length) return;
    const catalog = buildMixCatalog();
    const list = mode === 'u2' ? catalog.u2 : catalog.u1;
    const ids = questions.map(q=>q.sourceId).join('|');
    const found = list.find(m => m.questions.map(q=>q.id).join('|') === ids);
    if(!found) return;
    const used = getMixState();
    used[mode] = used[mode] || {};
    used[mode][found.id] = new Date().toISOString();
    setMixState(used);
  }
  function medquizResetMixHistory(){
    if(confirm('¿Reiniciar el historial local de mixes usados? No afecta progreso, métricas ni respuestas del banco.')){
      localStorage.removeItem(LS_USED_MIXES);
      setMedQuizScreen('create');
    }
  }
  function genQuestionsLocal({mixMode='u1'}={}){
    const mix = pickMix(mixMode);
    const questions = mix.questions.map(q => normalizeBankQuestion(q, sourceAxis(q)));
    if(questions.length < (mixMode === 'u2' ? 6 : 10)) throw new Error('No pude armar el mix solicitado desde el banco local.');
    return questions;
  }
  function axisFromBankQuestion(q){ return sourceAxis(q); }
  function normalizeBankQuestion(q, axisId){
    const keys = ['a','b','c','d'];
    const options = keys.map(k => q.opts?.[k] || '').filter(Boolean);
    const correctIndex = Math.max(0, keys.indexOf(String(q.ans||'').toLowerCase()));
    return {axisId, axisName:axisById(axisId).long, question:q.q || '', options, correctIndex, explanation:`Respuesta correcta: ${String(q.ans||'').toUpperCase()}. ${q.tema ? 'Tema: '+q.tema+'.' : ''}`, topic:q.tema || q.sprint_id || axisById(axisId).long, sourceId:q.id};
  }
  function normalizeGeneratedQuestions(qs){
    const list = (qs || []).map((q,i)=>({
      axisId: Number(q.axisId) || axisFromText(q.axisName || q.topic || ''),
      axisName: q.axisName || axisById(q.axisId).long,
      question: q.question || q.stem || '',
      options: Array.isArray(q.options) ? q.options.slice(0,4) : [],
      correctIndex: Math.max(0, Math.min(3, Number(q.correctIndex)||0)),
      explanation: q.explanation || '',
      topic: q.topic || ''
    })).filter(q => q.question && q.options.length === 4);
    for(const ax of AXES){
      if(list.filter(q=>q.axisId===ax.id).length < 2) throw new Error('La IA no devolvió 2 preguntas por cada uno de los 5 ejes. Probá de nuevo o usá banco local.');
    }
    return AXES.flatMap(ax => list.filter(q=>q.axisId===ax.id).slice(0,2));
  }
  function axisFromText(txt){
    txt = String(txt||'').toLowerCase();
    if(txt.includes('pedi') || txt.includes('niñ') || txt.includes('ninez') || txt.includes('adolesc')) return 2;
    if(txt.includes('gine') || txt.includes('obst') || txt.includes('mujer')) return 3;
    if(txt.includes('public') || txt.includes('aps') || txt.includes('epidemi')) return 4;
    if(txt.includes('cirug') || txt.includes('trauma') || txt.includes('quir')) return 5;
    return 1;
  }

  function medquizStartOwn(){ S.creatorMode = true; S.role = 'creator'; startQuiz(); }
  function medquizAcceptChallenge(){
    const name = ($('#mqPlayerName')?.value || '').trim();
    if(!name){ alert('Ingresá tu nombre para continuar.'); return; }
    S.playerName = name; localStorage.setItem(LS_PLAYER, name);
    S.role = 'challenger'; S.creatorMode = false; startQuiz();
  }
  function startQuiz(){
    if(!S.challenge?.questions?.length){ alert('No hay desafío cargado.'); return; }
    S.qi = 0; S.answers = []; S.score = 0; S.selected = false; clearInterval(S.timer); setMedQuizScreen('play');
  }
  function startTimer(){
    clearInterval(S.timer); S.timeLeft = TIMER_SECONDS; S.selected = false;
    const fill = $('#mqTimerFill'); if(fill) fill.style.width = '100%';
    S.timer = setInterval(()=>{
      if(S.selected){ clearInterval(S.timer); return; }
      S.timeLeft--;
      const pct = Math.max(0, (S.timeLeft / TIMER_SECONDS) * 100);
      const f = $('#mqTimerFill'); if(f){ f.style.width = pct + '%'; if(S.timeLeft <= 5) f.style.background = '#ef4444'; }
      if(S.timeLeft <= 0){ clearInterval(S.timer); medquizSelect(-1); }
    },1000);
  }
  function medquizSelect(idx){
    if(S.selected) return;
    const q = S.challenge.questions[S.qi]; if(!q) return;
    S.selected = true; clearInterval(S.timer);
    const ok = idx === Number(q.correctIndex);
    if(ok) S.score++;
    S.answers.push({selectedIndex:idx, correct:ok, axisId:Number(q.axisId), at:new Date().toISOString()});
    (q.options||[]).forEach((_,i)=>{
      const b = $('#mqOpt'+i); if(!b) return;
      b.disabled = true;
      if(i === Number(q.correctIndex)) b.classList.add('mq-correct');
      else if(i === idx) b.classList.add('mq-wrong');
    });
    const exp = $('#mqExplanation');
    if(exp){
      exp.classList.remove('hidden');
      exp.className = 'mt-4 rounded-2xl border p-4 text-sm font-semibold leading-6 ' + (ok?'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200':'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200');
      exp.innerHTML = `<strong>${ok?'Correcta':'Incorrecta'}.</strong> ${esc(q.explanation || 'Sin explicación cargada.')}`;
    }
    $('#mqNextWrap')?.classList.remove('hidden');
  }
  function medquizNext(){
    S.qi++;
    if(S.qi >= S.challenge.questions.length){ finishQuiz(); return; }
    setMedQuizScreen('play');
  }
  function finishQuiz(){
    const result = {player:S.playerName || (S.creatorMode ? S.challenge.creatorName : S.challenge.opponentName), role:S.creatorMode?'creator':'challenger', score:S.score, total:S.challenge.questions.length, answers:S.answers, finishedAt:new Date().toISOString()};
    if(S.creatorMode){
      S.challenge.creatorName = result.player;
      S.challenge.creatorScore = result.score;
      S.challenge.creatorAnswers = result.answers;
    }else{
      S.challenge.challengerName = result.player;
      S.challenge.challengerScore = result.score;
      S.challenge.challengerAnswers = result.answers;
    }
    if(S.challenge.creatorScore != null && S.challenge.challengerScore != null) setMedQuizScreen('results');
    else setMedQuizScreen('wait');
  }

  function answerText(q, idx){
    if(idx == null || idx < 0) return 'Sin responder';
    return String.fromCharCode(65+idx) + '. ' + (q.options?.[idx] || '');
  }
  function medquizCopy(id){
    const el = $('#'+id); if(!el){ alert('No encontré el link.'); return; }
    const text = el.value || el.textContent || '';
    navigator.clipboard?.writeText(text).then(()=>alert('Link copiado.')).catch(()=>{ el.select?.(); document.execCommand('copy'); alert('Link copiado.'); });
  }

  function parseAnyLink(raw){
    raw = String(raw||'').trim();
    if(!raw) throw new Error('Pegá un link primero.');
    let token='', kind='c';
    try{
      const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, siteBase());
      const p = new URLSearchParams(url.search || '');
      const h = new URLSearchParams(String(url.hash||'').replace(/^#\??/,''));
      token = p.get('c') || h.get('c') || p.get('desafio') || h.get('desafio') || p.get('resultado') || h.get('resultado') || '';
      if(p.get('resultado') || h.get('resultado')) kind = 'resultado';
    }catch(_){ token = raw.replace(/^c=/,'').replace(/^desafio=/,'').replace(/^resultado=/,''); }
    if(!token) throw new Error('No encontré datos dentro del link.');
    let obj = b64Decode(token);
    if(obj?.type === 'residenciapp_result' && obj.challenge){ obj = mergeLegacyResult(obj); }
    if(obj?.questions && obj?.creatorName) return {kind, obj};
    throw new Error('El link no parece ser un desafío válido.');
  }
  function mergeLegacyResult(payload){
    const ch = payload.challenge || {};
    const r = payload.result || {};
    if(r.role === 'creator'){ ch.creatorScore = r.score ?? r.correct; ch.creatorAnswers = r.answers; ch.creatorName = r.player || ch.creatorName || ch.creator; }
    else { ch.challengerScore = r.score ?? r.correct; ch.challengerAnswers = r.answers; ch.challengerName = r.player || ch.challengerName || ch.opponentName; }
    return ch;
  }
  function medquizLoadPasted(){
    try{
      const parsed = parseAnyLink($('#mqJoinLink')?.value || '');
      S.challenge = parsed.obj;
      S.currentResult = null;
      // Si el link ya tiene ambos resultados, ir directo a comparación.
      if(S.challenge.creatorScore != null && S.challenge.challengerScore != null){ setMedQuizScreen('results'); return; }
      setMedQuizScreen('reveal');
    }catch(err){ showJoinError(err.message); }
  }
  function medquizComparePasted(){
    try{
      const parsed = parseAnyLink($('#mqJoinLink')?.value || '');
      S.challenge = parsed.obj;
      setMedQuizScreen('results');
    }catch(err){ showJoinError(err.message); }
  }
  function showJoinError(msg){ const el=$('#mqJoinError'); if(el){ el.textContent=msg; el.classList.remove('hidden'); } else alert(msg); }

  function hydrateFromUrl(){
    const t = readTokens();
    const token = t.c || t.desafio || t.resultado;
    if(!token) return;
    try{
      let obj = b64Decode(token);
      if(obj?.type === 'residenciapp_result' && obj.challenge) obj = mergeLegacyResult(obj);
      if(!obj?.questions) return;
      S.challenge = obj;
      S.activeGame = 'challenge';
      if(typeof window.showView === 'function') window.showView('games');
      if(obj.creatorScore != null && obj.challengerScore != null) S.screen = 'results';
      else if(obj.challengerScore != null && obj.creatorScore == null) S.screen = 'results';
      else S.screen = 'reveal';
      renderGamesShell(); setGameTab('challenge');
    }catch(err){ console.warn(err); }
  }

  function resetChallenge(){ S.challenge=null; S.role=null; S.answers=[]; S.score=0; S.qi=0; S.screen='home'; renderMedQuiz(); }

  function initGamesPatch(){
    updateStaticLabels();
    const originalShowView = window.showView;
    if(typeof originalShowView === 'function' && !window.__residenciappGamesV3411Patched){
      window.showView = function(name){
        originalShowView(name);
        if(name === 'games'){
          const title = $('#viewTitle'); if(title) title.textContent = 'Juegos';
          renderGamesShell(); setGameTab(S.activeGame);
        }
      };
      window.__residenciappGamesV3411Patched = true;
    }
    if(!$('#gamesView')?.classList.contains('hidden')){ renderGamesShell(); setGameTab(S.activeGame); }
    hydrateFromUrl();
  }

  window.openMemoryGame = function(name){ renderGamesShell(); setGameTab(name); };
  window.openChallengeSettings = function(){ renderGamesShell(); renderChallengeSettings(true); };
  window.saveChallengeSettings = saveChallengeSettings;
  window.deleteChallengeSettings = deleteChallengeSettings;
  window.medquizShow = setMedQuizScreen;
  window.medquizGoCreate = medquizGoCreate;
  window.goCreate = goCreate;
  window.medquizCreateAI = medquizCreateAI;
  window.medquizCreateLocal = medquizCreateLocal;
  window.medquizCreateUniverse = medquizCreateUniverse;
  window.medquizResetMixHistory = medquizResetMixHistory;
  window.medquizStartOwn = medquizStartOwn;
  window.medquizAcceptChallenge = medquizAcceptChallenge;
  window.medquizSelect = medquizSelect;
  window.medquizNext = medquizNext;
  window.medquizCopy = medquizCopy;
  window.medquizLoadPasted = medquizLoadPasted;
  window.medquizComparePasted = medquizComparePasted;
  window.resetChallenge = resetChallenge;
  // Compatibilidad con nombres de v34.10
  window.createAIChallenge = medquizCreateAI;
  window.createLocalChallenge = medquizCreateLocal;
  window.copyChallengeLink = medquizCopy;
  window.openPastedChallengeLink = medquizLoadPasted;
  window.comparePastedResult = medquizComparePasted;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initGamesPatch);
  else initGamesPatch();
})();
