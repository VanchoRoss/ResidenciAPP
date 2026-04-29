// Configuración central de ResidenciAPP.
// Sistema colaborativo por Google Sheets mediante Google Apps Script.
// No usa GitHub Token y no pide cuenta de GitHub al usuario.
window.RESIDENCIAPP_CONFIG = {
  contributions: {
    mode: 'google-sheet',
    enabled: true,
    // Endpoint /exec de Google Apps Script para recibir aportes.
    endpoint: 'https://script.google.com/macros/s/AKfycbygt2OyUmyVEjgeIYvEYGEJNAM_QMsRM3NPMz7WOfZ_tP79OAGe3Cssl52fqv8rynpvUA/exec',
    requireEndpoint: false,
    allowImages: true,
    maxImageSizeMB: 3
  },
  app: {
    publicName: 'ResidenciAPP',
    repository: 'VanchoRoss/ResidenciAPP'
  }
};

// Alias de compatibilidad.
window.CONTRIBUTION_CONFIG = window.RESIDENCIAPP_CONFIG.contributions;
