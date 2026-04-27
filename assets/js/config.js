// Configuración central de ResidenciAPP.
// Sistema colaborativo por Google Sheets.
// No usa GitHub Token, no pide cuenta de GitHub al usuario.

window.RESIDENCIAPP_CONFIG = {
  github: {
    owner: '',
    repo: '',
    token: '',
    labels: []
  },

  contributions: {
    mode: 'google-sheet',
    enabled: true,

    // Pegá acá la URL de Apps Script que termina en /exec
    endpoint: 'https://script.google.com/macros/s/AKfycbxaNwbYDNjee8gfrO2GBXwIkW8ppBekaUqv_Bh-XSUvZ2D2bNN261m0HWDWQ4OjGBj9xA/exec'
  }
};

// Alias de compatibilidad para versiones nuevas del main.js
window.CONTRIBUTION_CONFIG = window.RESIDENCIAPP_CONFIG.contributions;
