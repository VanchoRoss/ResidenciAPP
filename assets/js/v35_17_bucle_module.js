/* === ResidenciAPP v35.17 · enlace estable a Bucle Infinito 2.0 ===
   Integra el módulo sin tocar banco, métricas ni estado principal de ResidenciAPP.
   Bucle usa su propio localStorage: bi2-ss / bi2-last.
*/
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  function safeOpen(path){
    try { window.location.href = path; }
    catch(_) { window.open(path, '_self'); }
  }
  window.openBucleInfinito = function(){ safeOpen('./bucle_infinito_2.html'); };
  window.openBucleHub = function(){ safeOpen('./bucle_hub.html'); };

  function insertSidebarButton(){
    const nav = $('#sidebar nav');
    if(!nav || $('#bucleNavBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'bucleNavBtn';
    btn.type = 'button';
    btn.className = 'navBtn w-full rounded-2xl px-4 py-3 text-left text-sm font-bold hover:bg-violet-50 dark:hover:bg-violet-950/30';
    btn.innerHTML = '♾️ Bucle Infinito 2.0';
    btn.addEventListener('click', () => window.openBucleInfinito());
    const learn = $('[data-nav="learn"]', nav);
    if(learn && learn.nextSibling) nav.insertBefore(btn, learn.nextSibling);
    else nav.appendChild(btn);
  }

  function biStats(){
    let ss = {};
    try { ss = JSON.parse(localStorage.getItem('bi2-ss') || '{}'); } catch(_) { ss = {}; }
    const vals = Object.values(ss).map(Number);
    return {
      ready: vals.filter(v => v >= 2).length,
      dominated: vals.filter(v => v >= 3).length,
      active: vals.filter(v => v === 1).length,
      last: localStorage.getItem('bi2-last')
    };
  }

  function insertDashboardCard(){
    if($('#bucleDashboardCard')) return;
    const anchor = $('#v34QuickActions')?.closest('section') || $('#v34Overview');
    if(!anchor) return;
    const st = biStats();
    const lastTxt = st.last ? new Date(st.last).toLocaleDateString('es-AR') : 'sin sesión registrada';
    const html = `
      <section id="bucleDashboardCard" class="bucle-module-card mt-6 rounded-[2rem] border border-violet-200 bg-white p-5 shadow-soft dark:border-violet-900/60 dark:bg-slate-900">
        <div class="bucle-card-inner">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="min-w-0">
              <span class="bucle-mini-pill bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">♾️ Bucle Infinito 2.0</span>
              <h3 class="mt-3 font-display text-2xl font-extrabold">Protocolo de estudio profundo</h3>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">Usalo para transformar errores o huecos en nodos: mecanismo núcleo, trampas del banco y conexiones transversales. Funciona en una página separada para no interferir con tus métricas de entrenamiento.</p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <button class="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-soft hover:bg-violet-700" onclick="openBucleInfinito()">Abrir Bucle</button>
              <button class="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" onclick="openBucleHub()">Ver hub</button>
            </div>
          </div>
          <div class="bucle-soft-grid mt-5">
            <div class="rounded-2xl bg-violet-50 p-4 text-center dark:bg-violet-950/25"><p class="font-display text-2xl font-extrabold">${st.ready}</p><p class="text-[10px] font-black uppercase tracking-[.16em] text-violet-600 dark:text-violet-300">sprints con nodo</p></div>
            <div class="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/25"><p class="font-display text-2xl font-extrabold">${st.dominated}</p><p class="text-[10px] font-black uppercase tracking-[.16em] text-emerald-600 dark:text-emerald-300">dominados</p></div>
            <div class="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-950/60"><p class="font-display text-lg font-extrabold">${lastTxt}</p><p class="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">último uso</p></div>
          </div>
        </div>
      </section>`;
    anchor.insertAdjacentHTML('afterend', html);
  }

  function enhanceLearnLibrary(){
    const learnView = $('#learnView');
    if(!learnView || $('#bucleLearnHint')) return;
    const aside = $('#learnView aside');
    if(!aside) return;
    aside.insertAdjacentHTML('beforeend', `
      <div id="bucleLearnHint" class="rounded-[2rem] border border-violet-200 bg-violet-50/70 p-5 shadow-soft dark:border-violet-900/60 dark:bg-violet-950/20">
        <p class="text-xs font-black uppercase tracking-[.18em] text-violet-700 dark:text-violet-200">Método complementario</p>
        <h4 class="mt-1 font-display text-xl font-extrabold">Bucle Infinito 2.0</h4>
        <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Cuando un nodo te quede flojo, abrí el bucle para generar explicación profunda, trampas y conexiones.</p>
        <button class="mt-3 w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-700" onclick="openBucleInfinito()">Abrir protocolo</button>
      </div>`);
  }

  function init(){ insertSidebarButton(); insertDashboardCard(); enhanceLearnLibrary(); }
  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 300));
  window.addEventListener('storage', () => setTimeout(() => {
    const old = $('#bucleDashboardCard');
    if(old) old.remove();
    insertDashboardCard();
  }, 80));
})();
