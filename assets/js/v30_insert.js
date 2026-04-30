
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
    function toggleNotebookFullscreen(id){
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
