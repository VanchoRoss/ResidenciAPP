/* ResidenciAPP v35.28 · Professional Warm UI bootstrap
   Estética no destructiva: no toca estado, progreso ni métricas.
*/
(function(){
  if(window.__RESIDENCIAPP_V3528_PRO__) return;
  window.__RESIDENCIAPP_V3528_PRO__ = true;
  const boot = () => {
    document.body.classList.add('v3528-pro');
    document.documentElement.style.setProperty('color-scheme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    document.title = 'ResidenciAPP v35.28 · Estudio profesional';
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if(metaTheme) metaTheme.setAttribute('content', document.documentElement.classList.contains('dark') ? '#171513' : '#f6f3ec');
    const topKicker = document.querySelector('header .text-xs.font-black.uppercase');
    if(topKicker && !topKicker.dataset.v3528){
      topKicker.dataset.v3528 = '1';
      topKicker.textContent = 'ResidenciAPP · Examen Integrado 2026';
    }
    const loadingBadge = document.querySelector('#loading .inline-flex');
    if(loadingBadge && !loadingBadge.dataset.v3528){
      loadingBadge.dataset.v3528 = '1';
      loadingBadge.textContent = 'ResidenciAPP · entorno profesional';
    }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
  const mo = new MutationObserver(() => {
    document.documentElement.style.setProperty('color-scheme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if(metaTheme) metaTheme.setAttribute('content', document.documentElement.classList.contains('dark') ? '#171513' : '#f6f3ec');
  });
  mo.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
})();
