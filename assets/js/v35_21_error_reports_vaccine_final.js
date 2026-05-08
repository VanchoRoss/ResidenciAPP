/* === ResidenciAPP v35.21 · reportes de errores + vacunas final ===
   Objetivos:
   - Agrega un reporte de error debajo de cada pregunta y lo envía al mismo endpoint de aportes.
   - Quita el botón público de configurar recepción del panel colaborativo.
   - Reinstala una única interacción final para el calendario de vacunas: tap = marcar/desmarcar, drag = desplazar.
   - No toca banco, IDs, progreso principal ni métricas históricas.
*/
(function(){
  'use strict';
  if(window.__RESIDENCIAPP_V3521__) return;
  window.__RESIDENCIAPP_V3521__ = true;

  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = (fn, fallback=null) => { try { return fn(); } catch(err){ console.warn('[v35.21]', err); return fallback; } };
  const REPORT_KEY = 'residenciapp_error_reports_v1';

  function getReportStore(){
    try {
      const raw = localStorage.getItem(REPORT_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.drafts ||= {};
      parsed.outbox ||= [];
      parsed.sent ||= [];
      return parsed;
    } catch(_) { return {drafts:{}, outbox:[], sent:[]}; }
  }
  function saveReportStore(store){
    try { localStorage.setItem(REPORT_KEY, JSON.stringify(store || {drafts:{},outbox:[],sent:[]})); } catch(_) {}
  }
  function questionById(id){ return safe(() => Array.isArray(QUESTIONS) ? QUESTIONS.find(q => String(q.id) === String(id)) : null, null); }
  function answerText(q){ return q?.ans ? String(q.ans).toUpperCase()+') '+(q.opts?.[q.ans] || '') : 'Sin clave cargada'; }
  function sourceName(q){ return (typeof sourceLabel === 'function') ? sourceLabel(q?.source) : (q?.source || ''); }
  function getEndpoint(){
    return safe(() => {
      if(typeof getContributionEndpoint === 'function') return getContributionEndpoint();
      const cfg = (window.RESIDENCIAPP_CONFIG && window.RESIDENCIAPP_CONFIG.contributions) || window.CONTRIBUTION_CONFIG || {};
      return String(localStorage.getItem('residenciapp_contribution_endpoint') || cfg.endpoint || '').trim();
    }, '');
  }

  const REPORT_OPTIONS = [
    ['respuesta_mal', 'La respuesta está mal'],
    ['feedback_incorrecto', 'El feedback es incorrecto'],
    ['pregunta_mal', 'La pregunta está mal']
  ];

  function reportStatusHtml(id){
    const store = getReportStore();
    const draft = store.drafts[id] || {};
    if(draft.submittedAt) return '<span class="report-status is-sent">Enviado para revisión</span>';
    if(draft.pendingUploadAt) return '<span class="report-status is-pending">Guardado localmente</span>';
    return '<span class="report-status">Nuevo reporte</span>';
  }

  function buildErrorReportPanel(q){
    if(!q || !q.id) return '';
    const store = getReportStore();
    const draft = store.drafts[q.id] || {};
    const qText = draft.questionText || q.q || '';
    const type = draft.issueType || '';
    const radios = REPORT_OPTIONS.map(([value,label]) => {
      const checked = type === value ? ' checked' : '';
      return '<label class="report-radio"><input type="radio" name="errorReportType_'+esc(q.id)+'" value="'+value+'"'+checked+' onchange="saveQuestionErrorReportField(\''+esc(q.id)+'\',\'issueType\',this.value)"><span>'+esc(label)+'</span></label>';
    }).join('');
    const endpointReady = !!getEndpoint();
    return '<section class="question-error-report mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50/55 p-4 shadow-soft dark:border-amber-900/60 dark:bg-amber-950/20" data-error-report-panel="'+esc(q.id)+'">'
      + '<div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div class="flex flex-wrap items-center gap-2"><p class="text-xs font-black uppercase tracking-[.18em] text-amber-700 dark:text-amber-300">Reportar error en la pregunta</p>'+reportStatusHtml(q.id)+'</div><h4 class="mt-1 font-display text-xl font-extrabold">Avisar un problema de banco o feedback</h4><p class="mt-1 max-w-2xl text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">Se envía a la misma bandeja de Google Sheets de los aportes. No modifica tu progreso ni la clave de la pregunta.</p></div><button class="rounded-2xl bg-amber-600 px-4 py-3 text-xs font-black text-white hover:bg-amber-700" onclick="sendQuestionErrorReport(\''+esc(q.id)+'\')">Enviar reporte</button></div>'
      + '<details class="mt-4 report-details"><summary class="cursor-pointer select-none text-sm font-black text-amber-800 dark:text-amber-200">Completar reporte</summary>'
      + '<div class="mt-4 grid gap-4 lg:grid-cols-2"><label class="block lg:col-span-2"><span class="report-label">Pregunta <em>(pegue el enunciado)</em></span><textarea class="report-input min-h-28" placeholder="Pegá o ajustá el enunciado" oninput="saveQuestionErrorReportField(\''+esc(q.id)+'\',\'questionText\',this.value)">'+esc(qText)+'</textarea></label>'
      + '<div class="rounded-2xl border border-amber-200 bg-white/70 p-4 dark:border-amber-900/50 dark:bg-slate-950/50"><p class="report-label">¿Qué está mal?</p><div class="mt-3 grid gap-2">'+radios+'</div></div>'
      + '<label class="block"><span class="report-label">Comentario adicional</span><textarea class="report-input min-h-32" placeholder="Ej: la opción correcta debería ser B porque..., el feedback contradice..., falta dato del enunciado..." oninput="saveQuestionErrorReportField(\''+esc(q.id)+'\',\'comment\',this.value)">'+esc(draft.comment || '')+'</textarea></label></div>'
      + '<div class="mt-3 rounded-2xl '+(endpointReady?'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200':'border border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100')+' p-3 text-xs font-bold leading-5">'+(endpointReady?'✅ Se enviará al endpoint configurado de aportes colaborativos.':'⚠️ No hay endpoint externo disponible en esta copia. El reporte quedará guardado localmente para exportar.')+'</div>'
      + '</details></section>';
  }

  window.saveQuestionErrorReportField = function(id, field, value){
    const q = questionById(id);
    const store = getReportStore();
    const prev = store.drafts[id] || {};
    const updated = Object.assign({}, prev, {
      id,
      updatedAt: new Date().toISOString(),
      questionText: field === 'questionText' ? value : (prev.questionText || q?.q || ''),
      eje: q?.eje || prev.eje || '',
      tema: q?.tema || prev.tema || '',
      sprint: q?.sprint || prev.sprint || '',
      source: q?.source || prev.source || '',
      [field]: value
    });
    if(field === 'issueType'){
      const found = REPORT_OPTIONS.find(x => x[0] === value);
      updated.issueLabel = found ? found[1] : '';
    }
    store.drafts[id] = updated;
    saveReportStore(store);
  };

  function buildErrorReportPayload(q, draft){
    const issue = REPORT_OPTIONS.find(x => x[0] === draft.issueType) || ['', ''];
    const questionText = draft.questionText || q.q || '';
    const comment = draft.comment || '';
    return {
      entryType: 'question_error_report',
      submissionId: 'resapp_report_'+q.id+'_'+Date.now(),
      app: 'ResidenciAPP',
      schemaVersion: 3,
      createdAt: new Date().toISOString(),
      status: 'pendiente',
      question: {
        id: q.id,
        source: q.source || '',
        sourceLabel: sourceName(q),
        year: q.year || '',
        eje: q.eje || '',
        tema: q.tema || '',
        sprint: q.sprint || '',
        text: q.q || '',
        reportedText: questionText,
        options: q.opts || {},
        answer: q.ans || '',
        correctAnswerText: answerText(q)
      },
      report: {
        questionText,
        issueType: draft.issueType || '',
        issueLabel: issue[1] || draft.issueLabel || '',
        additionalComment: comment,
        url: location.href,
        userAgent: navigator.userAgent
      },
      // Compatibilidad: si el endpoint viejo recibe esto, igualmente queda visible como aporte.
      contribution: {
        contributorName: '',
        contributionType: 'reporte_error',
        confidence: 'Medio',
        whyCorrect: '',
        keyData: issue[1] || draft.issueLabel || '',
        distractors: '',
        goldenRule: '',
        bibliography: comment,
        image: null
      }
    };
  }

  window.sendQuestionErrorReport = async function(id){
    const q = questionById(id);
    if(!q) return alert('No encontré la pregunta para reportar.');
    const store = getReportStore();
    const draft = Object.assign({questionText:q.q || ''}, store.drafts[id] || {});
    if(!draft.questionText || !String(draft.questionText).trim()) return alert('Pegá o dejá cargado el enunciado de la pregunta.');
    if(!draft.issueType) return alert('Elegí qué está mal: respuesta, feedback o pregunta.');
    const payload = buildErrorReportPayload(q, draft);
    const endpoint = getEndpoint();
    store.drafts[id] = Object.assign({}, draft, {lastPayload: payload, updatedAt: new Date().toISOString()});
    if(!endpoint){
      store.drafts[id].pendingUploadAt = new Date().toISOString();
      store.outbox.unshift(payload);
      store.outbox = store.outbox.slice(0, 300);
      saveReportStore(store);
      safe(() => typeof renderQuestion === 'function' && renderQuestion());
      return alert('Reporte guardado localmente. Falta configurar el endpoint externo en assets/js/config.js.');
    }
    try {
      await fetch(endpoint, { method:'POST', mode:'no-cors', body: JSON.stringify(payload) });
      store.drafts[id] = Object.assign({}, draft, {submittedAt:new Date().toISOString(), pendingUploadAt:'', lastPayload:payload});
      store.sent.unshift(payload.submissionId);
      store.sent = store.sent.slice(0, 300);
      saveReportStore(store);
      safe(() => typeof renderQuestion === 'function' && renderQuestion());
      alert('Reporte enviado para revisión. Gracias por ayudar a corregir el banco.');
    } catch(err){
      store.drafts[id].pendingUploadAt = new Date().toISOString();
      store.outbox.unshift(payload);
      store.outbox = store.outbox.slice(0, 300);
      saveReportStore(store);
      alert('No se pudo enviar ahora. Quedó guardado localmente. Detalle: '+(err.message || err));
    }
  };

  window.exportQuestionErrorReports = function(){
    const store = getReportStore();
    const blob = new Blob([JSON.stringify(store, null, 2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'residenciapp_reportes_errores_'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  function patchQuestionTemplate(){
    if(typeof window.questionTemplate !== 'function' || window.__v3521QuestionTemplatePatched) return;
    const base = window.questionTemplate;
    window.questionTemplate = function(q, selected, showExplanation){
      let html = base.apply(this, arguments);
      if(!q || !q.id || html.includes('data-error-report-panel="'+q.id+'"')) return html;
      const panel = buildErrorReportPanel(q);
      const marker = '<div class="mt-6 flex flex-wrap justify-between gap-3">';
      if(html.includes(marker)) return html.replace(marker, panel + marker);
      return html + panel;
    };
    window.__v3521QuestionTemplatePatched = true;
  }


  function removeConfigureButtonsFromDom(){
    qsa('button').forEach(btn => {
      const txt = String(btn.textContent || '').trim().toLowerCase();
      const onclick = String(btn.getAttribute('onclick') || '');
      if(txt === 'configurar recepción' || onclick.includes('configureContributionInbox')) btn.remove();
    });
  }

  function patchCollaborationPanel(){
    if(typeof window.collaborationPanelTemplate !== 'function' || window.__v3521CollabPanelPatched) return;
    const base = window.collaborationPanelTemplate;
    window.collaborationPanelTemplate = function(q){
      let html = base.apply(this, arguments) || '';
      // El endpoint queda centralizado en config.js; los usuarios comunes no ven el botón de configuración.
      html = html.replace(/<button[^>]*onclick="configureContributionInbox\(\)"[^>]*>\s*Configurar recepción\s*<\/button>/g, '');
      html = html.replace(/<button[^>]*onclick='configureContributionInbox\(\)'[^>]*>\s*Configurar recepción\s*<\/button>/g, '');
      return html;
    };
    window.__v3521CollabPanelPatched = true;
  }

  function saveAppState(){ safe(() => typeof saveState === 'function' && saveState()); }
  function isVaccineFinished(cell){
    const board = qs('#vaccineGameBoard');
    if(!board) return false;
    if(cell && (cell.classList.contains('vaccine-ok') || cell.classList.contains('vaccine-bad') || cell.classList.contains('vaccine-missed'))) return true;
    return !!qs('.vaccine-tap:disabled', board);
  }
  function updateVaccineCounterSafe(){ safe(() => typeof updateVaccineGameCounter === 'function' && updateVaccineGameCounter()); }
  function suppressLegacyVaccineClick(ms=360){
    window.__vaccineJustDragged = true;
    window.__v3519VaccineHandled = true;
    window.__v3520VaccineHandled = true;
    window.__v3521VaccineHandled = true;
    clearTimeout(window.__v3521VaccineSuppressTimer);
    window.__v3521VaccineSuppressTimer = setTimeout(() => {
      window.__vaccineJustDragged = false;
      window.__v3519VaccineHandled = false;
      window.__v3520VaccineHandled = false;
      window.__v3521VaccineHandled = false;
    }, ms);
  }
  function setVaccineCell(cell, force){
    if(!cell || isVaccineFinished(cell)) return;
    const on = typeof force === 'boolean' ? force : !cell.classList.contains('is-selected');
    cell.classList.toggle('is-selected', on);
    const btn = qs('.vaccine-tap', cell);
    if(btn){
      btn.type = 'button';
      btn.tabIndex = -1;
      btn.disabled = false;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.innerHTML = on ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>';
    }
    updateVaccineCounterSafe();
  }
  function replaceVaccineBoard(board){
    if(!board || !board.parentNode) return board;
    const fresh = board.cloneNode(true);
    ['dragScrollBound','v351Enhanced','v352DragBound','v355Stable','v3519Hardened','v3520Stable','v3521Stable'].forEach(k => { try { delete fresh.dataset[k]; } catch(_){} });
    board.parentNode.replaceChild(fresh, board);
    return fresh;
  }
  function ensureVaccineFullscreenButton(){
    const panel = qs('#vaccineGamePanel');
    const controls = qs('#vaccineGameCounter')?.parentElement;
    if(!panel || !controls) return;
    let btn = qs('#vaccineFullscreenBtn');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'vaccineFullscreenBtn';
      btn.type = 'button';
      btn.className = 'rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800';
      controls.insertBefore(btn, controls.querySelector('button') || null);
    }
    btn.textContent = panel.classList.contains('vaccine-fullscreen-mode') ? '↙ Salir de pantalla completa' : '⛶ Pantalla completa';
    btn.onclick = function(ev){
      ev.preventDefault(); ev.stopPropagation();
      const active = panel.classList.toggle('vaccine-fullscreen-mode');
      document.body.classList.toggle('vaccine-fullscreen-active', active);
      btn.textContent = active ? '↙ Salir de pantalla completa' : '⛶ Pantalla completa';
      if(active) setTimeout(() => qs('#vaccineGameBoard')?.focus?.(), 30);
    };
  }
  function hardenVaccineBoard(){
    let board = qs('#vaccineGameBoard');
    if(!board || !qs('.vaccine-cell', board)){ ensureVaccineFullscreenButton(); return; }
    if(board.dataset.v3521Stable === '1'){ ensureVaccineFullscreenButton(); return; }

    board = replaceVaccineBoard(board);
    board.dataset.v3521Stable = '1';
    board.dataset.v3519Hardened = '1';
    board.dataset.v3520Stable = '1';
    board.dataset.v355Stable = '1';
    board.dataset.v352DragBound = '1';
    board.dataset.v351Enhanced = '1';
    board.dataset.dragScrollBound = '1';
    board.classList.add('vaccine-game-board','v3521-vaccine-board','v3519-vaccine-board','v3520-vaccine-board','v355-vaccine-compact');
    board.setAttribute('tabindex','0');
    board.setAttribute('aria-label','Calendario nacional de vacunación desplazable');
    board.style.touchAction = 'none';

    qsa('.vaccine-cell', board).forEach(cell => {
      const btn = qs('.vaccine-tap', cell);
      if(btn){
        btn.type = 'button';
        btn.tabIndex = -1;
        btn.disabled = false;
        btn.setAttribute('aria-pressed', cell.classList.contains('is-selected') ? 'true' : 'false');
        btn.innerHTML = cell.classList.contains('is-selected') ? '<span class="vaccine-mark">✓</span>' : '<span class="vaccine-mark"></span>';
      }
    });

    let down = false, moved = false, sx = 0, sy = 0, sl = 0, st = 0, startCell = null;
    const threshold = 8;

    board.addEventListener('pointerdown', ev => {
      if(isVaccineFinished()) return;
      down = true;
      moved = false;
      sx = ev.clientX; sy = ev.clientY;
      sl = board.scrollLeft; st = board.scrollTop;
      startCell = ev.target?.closest?.('.vaccine-cell') || null;
      board.classList.add('is-dragging-ready');
      safe(() => board.setPointerCapture(ev.pointerId));
    }, {capture:true, passive:true});

    board.addEventListener('pointermove', ev => {
      if(!down || isVaccineFinished()) return;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      if(Math.abs(dx) > threshold || Math.abs(dy) > threshold){
        moved = true;
        board.classList.add('is-dragging');
        board.scrollLeft = sl - dx;
        board.scrollTop = st - dy;
        suppressLegacyVaccineClick();
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }
    }, {capture:true, passive:false});

    function finishPointer(ev){
      if(!down) return;
      const wasMoved = moved;
      const cell = startCell && board.contains(startCell) ? startCell : (ev.target?.closest?.('.vaccine-cell') || null);
      down = false; moved = false; startCell = null;
      board.classList.remove('is-dragging','is-dragging-ready');
      suppressLegacyVaccineClick();
      if(!wasMoved && !isVaccineFinished() && cell && board.contains(cell)) setVaccineCell(cell);
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }
    board.addEventListener('pointerup', finishPointer, {capture:true, passive:false});
    board.addEventListener('pointercancel', ev => {
      down = false; moved = false; startCell = null;
      board.classList.remove('is-dragging','is-dragging-ready');
      suppressLegacyVaccineClick();
      ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }, {capture:true, passive:false});

    board.addEventListener('click', ev => {
      // Tap real ya se resuelve en pointerup. Bloquea click sintético y listeners antiguos del documento.
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }, {capture:true});

    board.addEventListener('wheel', ev => {
      if(Math.abs(ev.deltaY) >= Math.abs(ev.deltaX)){
        board.scrollLeft += ev.deltaY;
        ev.preventDefault();
      }
    }, {passive:false});

    ensureVaccineFullscreenButton();
    updateVaccineCounterSafe();
  }
  function scheduleVaccineHarden(delay=40){ setTimeout(hardenVaccineBoard, delay); }

  function updateVaccineScoreBreakdown(){
    const score = qs('#vaccineGameScore');
    const board = qs('#vaccineGameBoard');
    if(!score || !board || score.classList.contains('hidden')) return;
    const ok = qsa('.vaccine-cell.vaccine-ok', board).length;
    const bad = qsa('.vaccine-cell.vaccine-bad', board).length;
    const missed = qsa('.vaccine-cell.vaccine-missed', board).length;
    const total = ok + missed;
    const errors = bad + missed;
    const pctOk = total ? Math.round((ok / total) * 100) : 0;
    const pctErr = total ? Math.round((errors / total) * 100) : 0;
    score.innerHTML = '<p class="text-xs font-black uppercase tracking-[.16em] text-slate-400">Resultado final</p>'
      + '<div class="mt-3 grid gap-3 sm:grid-cols-4">'
      + '<div class="rounded-2xl bg-emerald-50 p-3 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"><p class="text-[11px] font-black uppercase tracking-[.12em]">Aciertos</p><p class="mt-1 text-2xl font-black">'+ok+'</p></div>'
      + '<div class="rounded-2xl bg-rose-50 p-3 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200"><p class="text-[11px] font-black uppercase tracking-[.12em]">Errores</p><p class="mt-1 text-2xl font-black">'+bad+'</p></div>'
      + '<div class="rounded-2xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><p class="text-[11px] font-black uppercase tracking-[.12em]">Faltantes</p><p class="mt-1 text-2xl font-black">'+missed+'</p></div>'
      + '<div class="rounded-2xl bg-slate-50 p-3 text-slate-800 dark:bg-slate-900 dark:text-slate-200"><p class="text-[11px] font-black uppercase tracking-[.12em]">Precisión</p><p class="mt-1 text-2xl font-black">'+pctOk+'%</p></div>'
      + '</div><p class="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">'+ok+' correctas de '+total+' dosis esperadas · '+errors+' errores totales ('+pctErr+'%).</p>';
  }

  function patchVaccineRenderers(){
    if(typeof window.renderVaccineGame === 'function' && !window.__v3521RenderVaccinePatched){
      const base = window.renderVaccineGame;
      window.renderVaccineGame = function(){
        const out = base.apply(this, arguments);
        scheduleVaccineHarden(20);
        scheduleVaccineHarden(160);
        return out;
      };
      window.__v3521RenderVaccinePatched = true;
    }
    if(typeof window.resetVaccineGame === 'function' && !window.__v3521ResetVaccinePatched){
      const baseReset = window.resetVaccineGame;
      window.resetVaccineGame = function(){
        const out = baseReset.apply(this, arguments);
        scheduleVaccineHarden(20);
        scheduleVaccineHarden(160);
        return out;
      };
      window.__v3521ResetVaccinePatched = true;
    }
    if(typeof window.finishVaccineGame === 'function' && !window.__v3521FinishVaccinePatched){
      const baseFinish = window.finishVaccineGame;
      window.finishVaccineGame = function(){
        const out = baseFinish.apply(this, arguments);
        setTimeout(updateVaccineScoreBreakdown, 20);
        return out;
      };
      window.__v3521FinishVaccinePatched = true;
    }
    if(typeof window.openMemoryGame === 'function' && !window.__v3521OpenGamePatched){
      const baseOpen = window.openMemoryGame;
      window.openMemoryGame = function(name){
        const out = baseOpen.apply(this, arguments);
        if(name === 'vaccine') scheduleVaccineHarden(80);
        return out;
      };
      window.__v3521OpenGamePatched = true;
    }
    if(typeof window.showView === 'function' && !window.__v3521ShowViewPatched){
      const baseShow = window.showView;
      window.showView = function(name){
        const out = baseShow.apply(this, arguments);
        if(name === 'games') scheduleVaccineHarden(100);
        return out;
      };
      window.__v3521ShowViewPatched = true;
    }
  }

  function patchRevengeFinish(){
    if(typeof window.finishSession !== 'function' || window.__v3521FinishSessionPatched) return;
    const baseFinish = window.finishSession;
    window.finishSession = function(reason='manual'){
      const old = window.session || safe(() => session, null);
      if(old && old.mode === 'revenge'){
        safe(() => {
          state.mistakes ||= {};
          const ids = Array.isArray(old.questions) ? old.questions.slice() : [];
          ids.forEach(id => {
            const q = questionById(id);
            if(!q) return;
            const selected = old.selected?.[q.id] || '';
            if(!selected) return;
            if(selected === q.ans){
              delete state.mistakes[q.id];
              if(state.scheduled) delete state.scheduled[q.id];
              if(state.retention) delete state.retention[q.id];
            } else {
              state.mistakes[q.id] = Object.assign(state.mistakes[q.id] || {}, {
                id: q.id, selected, correct: q.ans, at: Date.now(), eje: q.eje, tema: q.tema, sprint: q.sprint, revengeFailedAt: Date.now()
              });
            }
          });
        });
      }
      const out = baseFinish.apply(this, arguments);
      if(old && old.mode === 'revenge'){
        saveAppState();
        safe(() => typeof renderReview === 'function' && renderReview());
        safe(() => typeof renderStats === 'function' && renderStats());
      }
      return out;
    };
    window.__v3521FinishSessionPatched = true;
  }

  function removeLegacyWords(root=document){
    safe(() => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while(walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(n => {
        const t = n.nodeValue;
        const r = t
          .replace(/falladas/gi, m => m[0] === 'F' ? 'Incorrectas' : 'incorrectas')
          .replace(/fallada/gi, m => m[0] === 'F' ? 'Incorrecta' : 'incorrecta')
          .replace(/fallaste/gi, m => m[0] === 'F' ? 'Te equivocaste' : 'te equivocaste');
        if(r !== t) n.nodeValue = r;
      });
    });
  }
  let cleanupTimer = null;
  function queueLegacyCleanup(root=document, delay=100){
    clearTimeout(cleanupTimer);
    cleanupTimer = setTimeout(() => removeLegacyWords(root), delay);
  }

  function boot(){
    patchCollaborationPanel();
    removeConfigureButtonsFromDom();
    patchQuestionTemplate();
    patchVaccineRenderers();
    patchRevengeFinish();
    queueLegacyCleanup(document.body || document, 60);
    scheduleVaccineHarden(120);
    scheduleVaccineHarden(700);
    setTimeout(() => {
      removeConfigureButtonsFromDom();
      if(qs('#questionCard') && !qs('#sessionView')?.classList.contains('hidden')) safe(() => typeof renderQuestion === 'function' && renderQuestion());
    }, 120);
  }

  const mo = new MutationObserver(() => {
    patchCollaborationPanel();
    removeConfigureButtonsFromDom();
    patchQuestionTemplate();
    patchVaccineRenderers();
    patchRevengeFinish();
    queueLegacyCleanup(document.body || document, 160);
    const b = qs('#vaccineGameBoard');
    if(b && qs('.vaccine-cell', b) && b.dataset.v3521Stable !== '1') scheduleVaccineHarden(40);
  });

  document.addEventListener('keydown', ev => {
    if(ev.key === 'Escape'){
      const panel = qs('#vaccineGamePanel.vaccine-fullscreen-mode');
      if(panel){
        panel.classList.remove('vaccine-fullscreen-mode');
        document.body.classList.remove('vaccine-fullscreen-active');
        const btn = qs('#vaccineFullscreenBtn');
        if(btn) btn.textContent = '⛶ Pantalla completa';
      }
    }
  }, true);

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot(); safe(() => mo.observe(document.body, {childList:true, subtree:true})); });
  else { boot(); safe(() => mo.observe(document.body, {childList:true, subtree:true})); }
})();
