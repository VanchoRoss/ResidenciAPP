// Configuración central de ResidenciAPP.
// Sistema colaborativo por Google Sheets mediante Google Apps Script.
// No usa GitHub Token y no pide cuenta de GitHub al usuario.
window.RESIDENCIAPP_CONFIG = {
  contributions: {
    mode: 'google-sheet',
    enabled: true,
    // Endpoint /exec de Google Apps Script para recibir aportes.
    endpoint: 'https://script.google.com/macros/s/AKfycbxaNwbYDNjee8gfrO2GBXwIkW8ppBekaUqv_Bh-XSUvZ2D2bNN261m0HWDWQ4OjGBj9xA/exec',
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
