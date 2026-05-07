/* === ResidenciAPP v35.18 · Bucle Infinito acoplado ===
   - Bucle integrado visualmente.
   - Lee métricas principales en modo solo lectura.
   - Bucle escribe únicamente bi2-ss / bi2-last.
*/
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const MAIN_STATE_KEY = 'residenciapp_integrada_state';
  const ACCESS_KEY = 'residenciapp_access_granted_v31';

  function safeOpen(path){
    try { window.location.href = path; }
    catch(_) { window.open(path, '_self'); }
  }
  window.openBucleInfinito = function(){ safeOpen('./bucle_infinito_2.html'); };
  window.openBucleHub = function(){ safeOpen('./bucle_hub.html'); };

  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || ''); }
    catch(_) { return fallback; }
  }
  function biStats(){
    const ss = readJson('bi2-ss', {}) || {};
    const vals = Object.values(ss).map(Number);
    return {
      ready: vals.filter(v => v >= 2).length,
      dominated: vals.filter(v => v >= 3).length,
      active: vals.filter(v => v === 1).length,
      last: localStorage.getItem('bi2-last')
    };
  }
  function mainStats(){
    const st = readJson(MAIN_STATE_KEY, {}) || {};
    const answers = st.answers || {};
    const answered = Object.keys(answers).length;
    const mistakes = Object.keys(st.mistakes || {}).length;
    const favs = Object.keys(st.favorites || {}).length;
    const due = Object.keys(st.scheduled || {}).length + Object.keys(st.retention || {}).length;
    return { answered, mistakes, favs, due };
  }

  function insertSidebarButton(){
    const nav = $('#sidebar nav');
    if(!nav || $('#bucleNavBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'bucleNavBtn';
    btn.type = 'button';
    btn.dataset.nav = 'bucle';
    btn.className = 'navBtn bucle-side-btn w-full rounded-2xl px-4 py-3 text-left text-sm font-bold';
    btn.innerHTML = '<span class="bucle-side-icon">♾️</span><span>Bucle Infinito</span><small>solo lectura</small>';
    btn.addEventListener('click', () => window.openBucleInfinito());
    const learn = $('[data-nav="learn"]', nav);
    if(learn && learn.nextSibling) nav.insertBefore(btn, learn.nextSibling);
    else nav.appendChild(btn);
  }

  function insertDashboardCard(){
    if($('#bucleDashboardCard')) return;
    const anchor = $('#v34QuickActions')?.closest('section') || $('#v34Overview') || $('#dashboardView');
    if(!anchor) return;
    const st = biStats();
    const ms = mainStats();
    const lastTxt = st.last ? new Date(st.last).toLocaleDateString('es-AR') : 'sin uso todavía';
    const html = `
      <section id="bucleDashboardCard" class="bucle-v35-card mt-6">
        <div class="bucle-v35-glow"></div>
        <div class="bucle-v35-content">
          <div class="bucle-v35-head">
            <div>
              <span class="bucle-v35-pill">♾️ Bucle Infinito 2.0</span>
              <h3>Motor de consolidación profunda</h3>
              <p>Lee tus métricas principales sin alterarlas y te ayuda a convertir errores, huecos o baja cobertura en nodos de razonamiento con IA.</p>
            </div>
            <div class="bucle-v35-actions">
              <button class="bucle-v35-primary" onclick="openBucleInfinito()">Abrir bucle</button>
              <button class="bucle-v35-secondary" onclick="openBucleHub()">Hub</button>
            </div>
          </div>
          <div class="bucle-v35-grid">
            <div><b>${ms.answered}</b><span>respondidas en app</span></div>
            <div><b>${ms.mistakes}</b><span>errores activos</span></div>
            <div><b>${st.ready}</b><span>nodos bucle</span></div>
            <div><b>${st.dominated}</b><span>dominados</span></div>
            <div class="wide"><b>${lastTxt}</b><span>último uso del bucle</span></div>
          </div>
          <p class="bucle-v35-note"><strong>Separación segura:</strong> el bucle se nutre de tus métricas principales, pero guarda su propio progreso en bi2-ss. No modifica respuestas, errores, sesiones ni estadísticas de ResidenciAPP.</p>
        </div>
      </section>`;
    anchor.insertAdjacentHTML('afterend', html);
  }

  function enhanceLearnLibrary(){
    const learnView = $('#learnView');
    if(!learnView || $('#bucleLearnHint')) return;
    const aside = $('#learnView aside') || $('#learnView .learn-library-sidebar');
    if(!aside) return;
    aside.insertAdjacentHTML('beforeend', `
      <div id="bucleLearnHint" class="bucle-learn-hint">
        <span>♾️ Método complementario</span>
        <h4>Bucle Infinito</h4>
        <p>Usalo cuando un nodo te quede flojo: mecanismo núcleo, trampas y conexiones transversales.</p>
        <button onclick="openBucleInfinito()">Abrir protocolo</button>
      </div>`);
  }

  function autoReturnToDashboard(){
    if(location.hash !== '#dashboard') return;
    const granted = localStorage.getItem(ACCESS_KEY) === 'true';
    if(!granted) return;
    setTimeout(() => {
      const loading = $('#loading');
      if(loading){ loading.classList.add('loading-hidden'); loading.style.display = 'none'; }
      if(typeof window.showView === 'function') window.showView('dashboard');
      window.scrollTo(0,0);
    }, 420);
  }

  function refreshDashboardCard(){
    const old = $('#bucleDashboardCard');
    if(old) old.remove();
    insertDashboardCard();
  }

  function init(){
    insertSidebarButton();
    insertDashboardCard();
    enhanceLearnLibrary();
    autoReturnToDashboard();
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
  window.addEventListener('hashchange', autoReturnToDashboard);
  window.addEventListener('storage', () => setTimeout(refreshDashboardCard, 100));
})();
