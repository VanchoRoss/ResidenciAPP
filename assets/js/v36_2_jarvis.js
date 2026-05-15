/* ═══════════════════════════════════════════════════════════════════
   ResidenciAPP v36.2 · JARVIS — Tutor IA por sprint
   ═══════════════════════════════════════════════════════════════════
   Motor: Google Gemini 1.5 Flash (gratis · 15 RPM · sin backend)
   La API key del usuario se guarda en localStorage del browser.
   Nunca sale del navegador hacia ningún servidor propio.
   Sistema adaptado al examen argentino de residencia 2026.
   ═══════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';
  if (window.__RESIDENCIAPP_V362__) return;
  window.__RESIDENCIAPP_V362__ = true;

  const $  = (s, r=document) => r.querySelector(s);
  const E  = (v='') => String(v ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ─── CONFIGURACIÓN ─────────────────────────────────────────────
  const API_KEY_STORAGE = 'jarvis_gemini_key';
  const HISTORY_STORAGE = 'jarvis_history';
  const MODEL = 'gemini-1.5-flash';
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  // ─── ESTADO ────────────────────────────────────────────────────
  let apiKey      = '';
  let currentSprint = null;
  let conversation  = [];   // [{role:'user'|'model', parts:[{text}]}]
  let isThinking    = false;

  function loadKey()    { return localStorage.getItem(API_KEY_STORAGE) || ''; }
  function saveKey(k)   { localStorage.setItem(API_KEY_STORAGE, k); }
  function loadHistory(){ try{ return JSON.parse(localStorage.getItem(HISTORY_STORAGE)||'[]'); }catch(_){ return []; }}
  function saveHistory(){ localStorage.setItem(HISTORY_STORAGE, JSON.stringify(conversation.slice(-40))); }

  // ─── SYSTEM PROMPT POR SPRINT ──────────────────────────────────
  function buildSystemPrompt(sprint) {
    const sprintQuestions = getSprintQuestions(sprint.id);
    const errorList       = getSprintErrors(sprint.id);
    const metrics         = getSprintMetrics(sprint.id);

    return `Sos JARVIS, el tutor de medicina de cabecera de Ivan, que está preparando el examen de residencia médica argentina 2026 (Integrador Nacional + CABA).

## Tu sprint activo: ${sprint.sprint}
Eje: ${sprint.eje} | Tema: ${sprint.tema}
Total de preguntas en el banco: ${metrics.total}
Preguntas respondidas: ${metrics.answered} (${metrics.cov}% cobertura)
Acierto actual: ${metrics.acc}%
Errores activos: ${metrics.mistakes}

## Tu misión
Ayudar a Ivan a dominar este sprint en profundidad usando razonamiento clínico, no memorización de listas. Él aprende mejor por conexiones, diferenciaciones y casos clínicos.

## Cómo enseñás
- Siempre desde la lógica fisiopatológica, no desde la lista.
- Usás analogías cuando el concepto es abstracto.
- Cuando él falla, no le das la respuesta directa — hacés una pregunta socrática para que él lo deduzca.
- Cuando termina de explicar algo, le hacés una pregunta de retrieval activo para verificar consolidación.
- Adaptás la profundidad según cuánto sepa: si explica bien lo básico, profundizás.
- Siempre orientado al examen: priorizás lo que realmente pregunta el banco histórico 2016-2025.

## Errores recientes que cometió en este sprint
${errorList.length ? errorList.map(e => `- ${E(e)}`).join('\n') : 'Sin errores registrados en este sprint todavía.'}

## Preguntas de muestra del banco en este sprint
${sprintQuestions.slice(0,5).map((q,i) => `${i+1}. ${q.q?.slice(0,120)}...`).join('\n')}

## Acciones que podés hacer
Cuando Ivan te pide algo, identificá qué modo activar:
1. **EXPLICAR**: Explicás el tema desde cero en capas (esencia → diferenciación → conducta → detalles).
2. **QUIZ**: Le hacés preguntas orales tipo examen, esperás su respuesta, corregís con razonamiento.
3. **DIFERENCIAL**: Armás tabla comparativa entre diagnósticos similares de este sprint.
4. **CASO**: Presentás un caso clínico progresivo (revelás datos de a uno) orientado a este sprint.
5. **NEMOTECNIA**: Creás una frase absurda, visual o narrativa para anclar el dato más difícil.
6. **TRAMPA**: Le mostrás las 3 trampas más frecuentes del banco en este tema y por qué confunden.

## Reglas no negociables
- Siempre respondés en español rioplatense (vos, acá, etc.)
- Nunca das listas sin razonamiento — cada punto tiene su "por qué"
- Si él comete un error de concepto, lo señalás con calidez pero sin rodeos
- Recordás el contexto de la conversación — si cometió un error antes, lo retomás
- Usás markdown para organizar: **negrita** para lo importante, tablas cuando corresponde, bloques de código para ECGs o criterios
- Máximo 3-4 párrafos por respuesta a menos que sea una explicación estructurada solicitada

Empezá saludando a Ivan por nombre y preguntando qué quiere hacer hoy con este sprint.`;
  }

  function getSprintQuestions(sprintId) {
    try {
      const qs = window.QUESTIONS || window.RESIDENCIAPP_DATA?.questions || [];
      return qs.filter(q =>
        q.sprint_id === sprintId ||
        q.sprint?.includes(sprintId) ||
        sprintId?.includes(q.sprint_id)
      ).slice(0, 10);
    } catch(_){ return []; }
  }

  function getSprintErrors(sprintId) {
    try {
      const st = JSON.parse(localStorage.getItem('residenciapp_integrada_state')||'{}');
      const mistakes = st.mistakes || {};
      const qs = getSprintQuestions(sprintId);
      return qs
        .filter(q => mistakes[q.id])
        .map(q => q.q?.slice(0,100) + '...');
    } catch(_){ return []; }
  }

  function getSprintMetrics(sprintId) {
    try {
      const st  = JSON.parse(localStorage.getItem('residenciapp_integrada_state')||'{}');
      const qs  = getSprintQuestions(sprintId);
      const total    = qs.length;
      const answered = qs.filter(q => st.answers?.[q.id]).length;
      const ok       = qs.filter(q => { const a = st.answers?.[q.id]; return a && a.selected === q.ans; }).length;
      const mistakes = qs.filter(q => st.mistakes?.[q.id]).length;
      return {
        total,
        answered,
        ok,
        mistakes,
        cov: total ? Math.round(answered/total*100) : 0,
        acc: answered ? Math.round(ok/answered*100) : 0
      };
    } catch(_){ return { total:0, answered:0, ok:0, mistakes:0, cov:0, acc:0 }; }
  }

  // ─── SPRINTS DISPONIBLES ───────────────────────────────────────
  function getSprintList() {
    try {
      if (typeof SPRINTS !== 'undefined') return SPRINTS;
      // Construir desde questions
      const qs = window.QUESTIONS || window.RESIDENCIAPP_DATA?.questions || [];
      const map = {};
      qs.forEach(q => {
        const id = q.sprint_id || q.sprint || '?';
        if (!map[id]) map[id] = { id, sprint: q.sprint || id, eje: q.eje || '', tema: q.tema || '', total: 0 };
        map[id].total++;
      });
      return Object.values(map).sort((a,b) => b.total - a.total);
    } catch(_){ return []; }
  }

  // ─── LLAMADA A GEMINI ──────────────────────────────────────────
  async function callGemini(userMessage, sprintObj) {
    const key = loadKey();
    if (!key) throw new Error('NO_KEY');

    conversation.push({ role: 'user', parts: [{ text: userMessage }] });

    const body = {
      system_instruction: { parts: [{ text: buildSystemPrompt(sprintObj) }] },
      contents: conversation,
      generationConfig: {
        temperature:      0.7,
        maxOutputTokens:  1200,
        topP:             0.9,
      }
    };

    const res = await fetch(`${API_URL}?key=${key}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!reply) throw new Error('Respuesta vacía del modelo');

    conversation.push({ role: 'model', parts: [{ text: reply }] });
    saveHistory();
    return reply;
  }

  // ─── RENDER MARKDOWN BÁSICO ────────────────────────────────────
  function mdToHtml(text) {
    return text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/`([^`]+)`/g,'<code class="jarvis-code">$1</code>')
      .replace(/^#{3} (.+)$/gm,'<h4 class="jarvis-h4">$1</h4>')
      .replace(/^#{2} (.+)$/gm,'<h3 class="jarvis-h3">$1</h3>')
      .replace(/^#{1} (.+)$/gm,'<h2 class="jarvis-h2">$1</h2>')
      .replace(/^\|(.+)\|$/gm, row => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        return '<tr>' + cells.map(c => `<td class="jarvis-td">${c.trim()}</td>`).join('') + '</tr>';
      })
      .replace(/(<tr>[\s\S]*?<\/tr>)+/g, t => `<table class="jarvis-table">${t}</table>`)
      .replace(/^- (.+)$/gm,'<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, l => `<ul class="jarvis-ul">${l}</ul>`)
      .replace(/\n\n/g,'</p><p class="jarvis-p">')
      .replace(/\n/g,'<br>')
      .replace(/^(?!<)(.+)$/gm, t => `<p class="jarvis-p">${t}</p>`);
  }

  // ─── CONSTRUIR VISTA ───────────────────────────────────────────
  function buildView() {
    if ($('#jarvisView')) return;
    const section = document.createElement('section');
    section.id = 'jarvisView';
    section.className = 'view hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8';
    section.style.cssText = 'display:none';
    section.innerHTML = `
      <!-- ONBOARDING: configurar API key -->
      <div id="jarvisOnboarding" class="max-w-2xl mx-auto">
        <div class="rounded-[2rem] border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-6 mb-6">
          <p class="text-xs font-black uppercase tracking-[.16em] text-amber-700 dark:text-amber-300 mb-1">Configuración única</p>
          <h2 class="font-display text-2xl font-extrabold mb-2">Conectar JARVIS con Gemini</h2>
          <p class="text-sm leading-6 text-slate-600 dark:text-slate-400 mb-4">
            JARVIS usa <strong>Gemini 1.5 Flash</strong> — el modelo de Google que tiene capa gratuita (15 consultas/minuto, sin tarjeta).
            Tu clave se guarda solo en este navegador, nunca sale a ningún servidor.
          </p>
          <ol class="text-sm leading-7 text-slate-600 dark:text-slate-400 mb-5 space-y-1">
            <li><span class="font-bold text-slate-800 dark:text-slate-200">1.</span> Ir a <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" class="text-amber-700 dark:text-amber-300 underline font-bold">aistudio.google.com/apikey</a></li>
            <li><span class="font-bold text-slate-800 dark:text-slate-200">2.</span> Crear clave → copiar</li>
            <li><span class="font-bold text-slate-800 dark:text-slate-200">3.</span> Pegala acá → ya tenés JARVIS</li>
          </ol>
          <div class="flex gap-3">
            <input id="jarvisKeyInput" type="password"
              class="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-mono outline-none focus:border-amber-400"
              placeholder="AIza...">
            <button class="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white hover:bg-amber-700"
              onclick="jarvisSetKey()">Conectar</button>
          </div>
          <p id="jarvisKeyError" class="text-xs text-rose-500 mt-2 hidden"></p>
        </div>
      </div>

      <!-- APP PRINCIPAL -->
      <div id="jarvisApp" class="hidden max-w-3xl mx-auto flex flex-col" style="height:calc(100vh - 140px)">

        <!-- Header con selector de sprint -->
        <div class="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-lg">🤖</span>
              <p class="text-xs font-black uppercase tracking-[.14em] text-amber-600 dark:text-amber-300">JARVIS · Tutor IA</p>
              <span id="jarvisStatus" class="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">Online</span>
            </div>
            <h2 id="jarvisSprintTitle" class="font-display text-xl font-extrabold truncate">Seleccioná un sprint</h2>
          </div>
          <div class="flex gap-2 flex-wrap">
            <button class="text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800" onclick="jarvisNewChat()">Nueva sesión</button>
            <button class="text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 font-bold hover:bg-slate-50 dark:hover:bg-slate-800" onclick="jarvisChangeKey()">Cambiar clave</button>
          </div>
        </div>

        <!-- Selector de sprint -->
        <div id="jarvisSprintSelector" class="mb-4">
          <p class="text-xs font-bold text-slate-400 mb-2">¿Qué sprint querés estudiar hoy?</p>
          <div id="jarvisSprintGrid" class="grid gap-2 grid-cols-1 sm:grid-cols-2 max-h-64 overflow-y-auto pr-1"></div>
        </div>

        <!-- Chat -->
        <div id="jarvisChat" class="hidden flex flex-col" style="flex:1; min-height:0">
          <!-- Sprint activo -->
          <div class="flex items-center gap-2 mb-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
            <span class="text-sm">📚</span>
            <span id="jarvisActiveSprint" class="text-xs font-bold text-amber-700 dark:text-amber-300 flex-1 truncate"></span>
            <button class="text-xs text-slate-400 hover:text-slate-600 font-bold" onclick="jarvisChangeSprint()">Cambiar</button>
          </div>

          <!-- Acciones rápidas -->
          <div class="flex gap-2 overflow-x-auto pb-2 mb-3 flex-shrink-0">
            <button class="jarvis-quick shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap" onclick="jarvisQuick('Explicame el tema desde cero, por capas')">🧠 Explicar desde cero</button>
            <button class="jarvis-quick shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap" onclick="jarvisQuick('Haceme preguntas tipo examen sobre este sprint')">❓ Quiz examen</button>
            <button class="jarvis-quick shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap" onclick="jarvisQuick('Simulame un caso clínico progresivo de este sprint, revelá los datos de a uno')">🏥 Caso clínico</button>
            <button class="jarvis-quick shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap" onclick="jarvisQuick('Armame una tabla comparativa con los diagnósticos diferenciales más importantes de este sprint')">📊 Diferencial</button>
            <button class="jarvis-quick shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap" onclick="jarvisQuick('Creame una nemotecnia absurda o visual para el dato más difícil de este sprint')">🧩 Nemotecnia</button>
            <button class="jarvis-quick shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap" onclick="jarvisQuick('Cuáles son las 3 trampas más frecuentes del banco histórico en este sprint y por qué confunden')">⚠️ Trampas del banco</button>
            <button class="jarvis-quick shrink-0 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 dark:hover:border-amber-700 whitespace-nowrap" onclick="jarvisQuick('Haceme las 5 preguntas de recuperación activa más importantes de este sprint para cuando tenga 5 minutos libres')">⚡ 5 preguntas rápidas</button>
          </div>

          <!-- Mensajes -->
          <div id="jarvisMessages"
            class="flex-1 overflow-y-auto space-y-4 mb-4 pr-1"
            style="min-height:0; max-height:calc(100vh - 400px)">
          </div>

          <!-- Input -->
          <div class="flex gap-3 items-end flex-shrink-0">
            <textarea id="jarvisInput"
              class="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm resize-none outline-none focus:border-amber-400 dark:focus:border-amber-600"
              rows="2"
              placeholder="Preguntale lo que quieras a JARVIS…"
              onkeydown="jarvisKeydown(event)"></textarea>
            <button id="jarvisSendBtn"
              class="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              onclick="jarvisSend()">
              Enviar
            </button>
          </div>
          <p class="text-xs text-slate-400 mt-1.5 text-center">Enter = nueva línea · Ctrl+Enter = enviar</p>
        </div>

      </div>
    `;

    const mainEl = $('main');
    if (mainEl) mainEl.appendChild(section);
    else document.body.appendChild(section);
  }

  // ─── LÓGICA DE ONBOARDING / KEY ───────────────────────────────
  function checkState() {
    apiKey = loadKey();
    const onboarding = $('#jarvisOnboarding');
    const app = $('#jarvisApp');
    if (!onboarding || !app) return;
    if (apiKey) {
      onboarding.classList.add('hidden');
      app.classList.remove('hidden');
      app.style.removeProperty('display');
      renderSprintSelector();
    } else {
      onboarding.classList.remove('hidden');
      app.classList.add('hidden');
    }
  }

  window.jarvisSetKey = function() {
    const input = $('#jarvisKeyInput');
    const errorEl = $('#jarvisKeyError');
    const key = input?.value?.trim() || '';
    if (!key.startsWith('AIza') || key.length < 30) {
      if (errorEl) { errorEl.textContent = 'La clave no parece válida. Debe empezar con "AIza".'; errorEl.classList.remove('hidden'); }
      return;
    }
    saveKey(key);
    apiKey = key;
    if (errorEl) errorEl.classList.add('hidden');
    checkState();
  };

  window.jarvisChangeKey = function() {
    saveKey('');
    apiKey = '';
    currentSprint = null;
    conversation = [];
    checkState();
  };

  // ─── SELECTOR DE SPRINT ────────────────────────────────────────
  function renderSprintSelector() {
    const grid = $('#jarvisSprintGrid');
    const selector = $('#jarvisSprintSelector');
    const chat = $('#jarvisChat');
    if (!grid) return;
    if (selector) selector.classList.remove('hidden');
    if (chat) chat.classList.add('hidden');

    const sprints = getSprintList();
    const st = (() => { try { return JSON.parse(localStorage.getItem('residenciapp_integrada_state')||'{}'); } catch(_){ return {}; }})();

    // Ordenar por mayor cantidad de errores primero
    const withMetrics = sprints.map(sp => {
      const m = getSprintMetrics(sp.id || sp.sprint);
      return { ...sp, ...m };
    }).sort((a, b) => (b.mistakes - a.mistakes) || (a.acc - b.acc));

    grid.innerHTML = withMetrics.map(sp => {
      const hasMistakes = sp.mistakes > 0;
      const isWeak      = sp.acc < 60 && sp.answered > 3;
      const badge = hasMistakes
        ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold">${sp.mistakes} errores</span>`
        : isWeak
          ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold">${sp.acc}% acierto</span>`
          : sp.cov > 0
            ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">${sp.cov}% cob.</span>`
            : '';
      const spId = E(sp.id || sp.sprint || '');
      return `
        <button class="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:border-amber-300 dark:hover:border-amber-700 transition"
          onclick="jarvisSelectSprint('${spId}')">
          <div class="flex items-start justify-between gap-2 mb-1">
            <p class="text-[10px] text-slate-400 font-bold">${E(sp.eje?.split(' ').slice(-2).join(' ') || '')}</p>
            ${badge}
          </div>
          <p class="text-sm font-bold leading-tight">${E(sp.sprint?.replace(/^[A-Z0-9-]+ · /,'') || sp.id)}</p>
        </button>`;
    }).join('');
  }

  window.jarvisSelectSprint = function(sprintId) {
    const sprints = getSprintList();
    const sp = sprints.find(s => (s.id || s.sprint) === sprintId) || sprints[0];
    if (!sp) return;

    currentSprint = sp;
    conversation  = [];

    const titleEl   = $('#jarvisSprintTitle');
    const activeEl  = $('#jarvisActiveSprint');
    const selector  = $('#jarvisSprintSelector');
    const chat      = $('#jarvisChat');

    if (titleEl)  titleEl.textContent  = sp.sprint?.replace(/^[A-Z0-9-]+ · /,'') || sp.id;
    if (activeEl) activeEl.textContent = sp.sprint || sp.id;
    if (selector) selector.classList.add('hidden');
    if (chat)     chat.classList.remove('hidden');

    const messagesEl = $('#jarvisMessages');
    if (messagesEl) messagesEl.innerHTML = '';

    // Mensaje inicial automático
    const metrics = getSprintMetrics(sp.id || sp.sprint);
    const intro = metrics.mistakes > 0
      ? `Hola Ivan! Veo que tenés **${metrics.mistakes} errores activos** en ${sp.sprint?.replace(/^[A-Z0-9-]+ · /,'') || sp.id}. Podemos arrancar trabajando exactamente esas preguntas que fallaste, o si preferís primero consolidar la base teórica y después ir a los errores. ¿Cómo lo arrancamos?`
      : `Hola Ivan! Arrancamos con **${sp.sprint?.replace(/^[A-Z0-9-]+ · /,'') || sp.id}**. Tenés ${metrics.cov}% de cobertura y ${metrics.acc}% de acierto. ¿Qué querés hacer — empezamos explicando el concepto central, hacemos un quiz, o simulamos un caso clínico?`;

    appendMessage('model', intro);
    conversation.push({ role: 'model', parts: [{ text: intro }] });
    saveHistory();
  };

  window.jarvisChangeSprint = function() {
    currentSprint = null;
    conversation  = [];
    renderSprintSelector();
  };

  // ─── CHAT ──────────────────────────────────────────────────────
  window.jarvisQuick = function(msg) {
    const input = $('#jarvisInput');
    if (input) input.value = msg;
    jarvisSend();
  };

  window.jarvisKeydown = function(e) {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); jarvisSend(); }
  };

  window.jarvisSend = async function() {
    const input   = $('#jarvisInput');
    const sendBtn = $('#jarvisSendBtn');
    if (!input || isThinking) return;

    const text = input.value.trim();
    if (!text) return;
    if (!currentSprint) { appendMessage('model','Primero seleccioná un sprint para que pueda ayudarte en ese tema.'); return; }

    input.value = '';
    isThinking  = true;
    if (sendBtn) sendBtn.disabled = true;
    setStatus('Pensando…', 'amber');

    appendMessage('user', text);

    const thinkingId = appendThinking();

    try {
      const reply = await callGemini(text, currentSprint);
      removeThinking(thinkingId);
      appendMessage('model', reply);
      setStatus('Online', 'emerald');
    } catch(err) {
      removeThinking(thinkingId);
      if (err.message === 'NO_KEY') {
        appendMessage('model', '⚠️ No encontré tu API key de Gemini. Usá el botón "Cambiar clave" para configurarla.');
      } else if (err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('429')) {
        appendMessage('model', '⏳ Llegaste al límite de consultas gratuitas por minuto (15 rpm). Esperá 60 segundos y reintentá. Es el límite del plan gratuito de Gemini.');
      } else if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('400')) {
        appendMessage('model', '❌ Tu API key no es válida. Verificá que la copiaste correctamente desde AI Studio.');
      } else {
        appendMessage('model', `❌ Error al conectar con Gemini: ${E(err.message)}. Verificá tu conexión a internet.`);
      }
      setStatus('Error', 'rose');
    }

    isThinking  = false;
    if (sendBtn) sendBtn.disabled = false;
    input.focus();
  };

  window.jarvisNewChat = function() {
    conversation = [];
    const messagesEl = $('#jarvisMessages');
    if (messagesEl) messagesEl.innerHTML = '';
    if (currentSprint) jarvisSelectSprint(currentSprint.id || currentSprint.sprint);
    else renderSprintSelector();
  };

  // ─── DOM HELPERS ───────────────────────────────────────────────
  function appendMessage(role, text) {
    const el = $('#jarvisMessages');
    if (!el) return;

    const isUser  = role === 'user';
    const div     = document.createElement('div');
    div.className = `flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`;

    if (isUser) {
      div.innerHTML = `
        <div class="max-w-[80%] rounded-[1.25rem] rounded-br-md bg-amber-600 text-white px-4 py-3 text-sm leading-6">
          ${E(text).replace(/\n/g,'<br>')}
        </div>`;
    } else {
      div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-base flex-shrink-0 mt-1">🤖</div>
        <div class="flex-1 min-w-0 rounded-[1.25rem] rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm leading-6 jarvis-bubble">
          ${mdToHtml(text)}
        </div>`;
    }

    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    return div;
  }

  function appendThinking() {
    const el  = $('#jarvisMessages');
    if (!el) return null;
    const id  = 'jarvis-thinking-' + Date.now();
    const div = document.createElement('div');
    div.id    = id;
    div.className = 'flex justify-start gap-3';
    div.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-base flex-shrink-0">🤖</div>
      <div class="rounded-[1.25rem] rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center gap-2">
        <span class="text-xs text-slate-400 font-bold">Pensando</span>
        <span class="flex gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style="animation-delay:0s"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style="animation-delay:.15s"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style="animation-delay:.3s"></span>
        </span>
      </div>`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
    return id;
  }

  function removeThinking(id) {
    if (id) $('#' + id)?.remove();
  }

  function setStatus(text, color) {
    const el = $('#jarvisStatus');
    if (!el) return;
    el.textContent = text;
    const cls = {
      emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      amber:   'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      rose:    'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    }[color] || '';
    el.className = `text-xs px-2 py-0.5 rounded-full font-bold ${cls}`;
  }

  // ─── ESTILOS ───────────────────────────────────────────────────
  function injectStyles() {
    if ($('#v362styles')) return;
    const s = document.createElement('style');
    s.id = 'v362styles';
    s.textContent = `
      .jarvis-bubble p.jarvis-p     { margin:.375rem 0; line-height:1.7; }
      .jarvis-bubble h2.jarvis-h2   { font-size:1.05rem; font-weight:800; margin:.875rem 0 .375rem; }
      .jarvis-bubble h3.jarvis-h3   { font-size:.95rem; font-weight:700; margin:.75rem 0 .25rem; }
      .jarvis-bubble h4.jarvis-h4   { font-size:.875rem; font-weight:700; margin:.625rem 0 .25rem; color:#92400e; }
      .dark .jarvis-bubble h4.jarvis-h4 { color:#fcd34d; }
      .jarvis-bubble ul.jarvis-ul   { margin:.375rem 0 .375rem 1rem; list-style:disc; }
      .jarvis-bubble li             { margin:.125rem 0; }
      .jarvis-bubble code.jarvis-code { background:rgba(0,0,0,.06); border-radius:4px; padding:1px 5px; font-size:.8rem; font-family:monospace; }
      .dark .jarvis-bubble code.jarvis-code { background:rgba(255,255,255,.08); }
      .jarvis-bubble table.jarvis-table { border-collapse:collapse; width:100%; margin:.5rem 0; font-size:.75rem; }
      .jarvis-bubble td.jarvis-td  { border:1px solid #e2e8f0; padding:5px 8px; vertical-align:top; }
      .dark .jarvis-bubble td.jarvis-td { border-color:#1e293b; }
      .jarvis-bubble tr:first-child td { background:#fef3e2; font-weight:700; }
      .dark .jarvis-bubble tr:first-child td { background:rgba(245,158,11,.12); }

      #jarvisMessages::-webkit-scrollbar { width:4px; }
      #jarvisMessages::-webkit-scrollbar-track { background:transparent; }
      #jarvisMessages::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:2px; }
      .dark #jarvisMessages::-webkit-scrollbar-thumb { background:#334155; }

      .jarvis-quick:hover { transform:translateY(-1px); }
      .jarvis-quick { transition: all .12s; }
    `;
    document.head.appendChild(s);
  }

  // ─── INTEGRAR AL SIDEBAR ───────────────────────────────────────
  function integrarSidebar() {
    const nav = $('aside nav.space-y-2') || $('nav.space-y-2');
    if (!nav || $('#jarvisNavBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'jarvisNavBtn';
    btn.type = 'button';
    btn.dataset.nav = 'jarvis';
    btn.className = 'navBtn w-full rounded-2xl px-4 py-3 text-left text-sm font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50';
    btn.textContent = '🤖 JARVIS · Tutor IA';
    btn.onclick = () => showView('jarvis');

    // Insertar después del botón de NeuroPREP
    const neuroprepBtn = $('[data-nav="neuroprep"]', nav);
    if (neuroprepBtn?.nextSibling) nav.insertBefore(btn, neuroprepBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // Parchear showView para incluir 'jarvis'
  function patchShowView() {
    const orig = window.showView;
    if (typeof orig !== 'function' || window.__v362_sv_patched__) return;
    window.__v362_sv_patched__ = true;
    window.showView = function(name) {
      orig(name);
      if (name === 'jarvis') {
        // Forzar visibilidad de la sección
        setTimeout(() => {
          const view = $('#jarvisView');
          if (view) {
            view.classList.remove('hidden');
            view.style.display = '';
            checkState();
          }
        }, 30);
      }
    };
  }

  // ─── INIT ──────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildView();
    integrarSidebar();
    patchShowView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 900));
  } else {
    setTimeout(init, 900);
  }

  console.log('%c[ResidenciAPP v36.2]', 'color:#d97706;font-weight:bold',
    'JARVIS Tutor IA · Gemini 1.5 Flash · activo');
})();
