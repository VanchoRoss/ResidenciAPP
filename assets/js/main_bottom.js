    function init(){
      initSelects();
      session = state.session || null;
      const preferredDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(state.theme || (preferredDark?'dark':'light'));
      ensureCollaborationState();
      mergeEmbeddedCollaborationData();
      loadApprovedCollaborationData();
      renderAll();
      renderCollaborationControls();
      $('#startAppBtn')?.addEventListener('click', enterResidenciApp);
      $('#themeToggle').addEventListener('click',()=>applyTheme(document.documentElement.classList.contains('dark')?'light':'dark'));
      $('#themeToggleTop')?.addEventListener('click',()=>applyTheme(document.documentElement.classList.contains('dark')?'light':'dark'));
      $('#mobileMenuBtn').addEventListener('click',toggleSidebar); $('#closeMenuBtn').addEventListener('click',closeMobileMenu); $('#overlay').addEventListener('click',closeMobileMenu);
      $('#resetProgressBtn').addEventListener('click', resetGlobalProgress);
    }
    init();
