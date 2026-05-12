// Configuración central de ResidenciAPP.
// Sistema colaborativo por Google Sheets mediante Google Apps Script.
// No usa GitHub Token y no pide cuenta de GitHub al usuario.

(function(){
  'use strict';

  const OFFICIAL_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBedKHq9STrQIgqjOKiU66SRm9VlEQOgAlxArdqR-QHqblveXgKtZm_nCUVvjz_8e8IQ/exec';
  const STATE_KEY = 'residenciapp_integrada_state';
  const ENDPOINT_KEY = 'residenciapp_contribution_endpoint';
  const MIGRATION_KEY = 'residenciapp_endpoint_migration_v35_25';

  window.RESIDENCIAPP_CONFIG = {
    contributions: {
      mode: 'google-sheet',
      enabled: true,
      // Endpoint /exec de Google Apps Script para recibir aportes.
      endpoint: OFFICIAL_ENDPOINT,
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

  /**
   * Migración automática v35.25.
   * Corrige navegadores que tenían guardado un endpoint viejo en localStorage
   * o dentro del estado principal de ResidenciAPP.
   *
   * Motivo: versiones anteriores permitían configurar una recepción por navegador.
   * Si un usuario dejó una URL vieja guardada, esa URL tenía prioridad sobre config.js.
   * Desde esta versión, el endpoint oficial vuelve a imponerse automáticamente.
   */
  function migrateContributionEndpoint(){
    try {
      if(!OFFICIAL_ENDPOINT) return;

      // 1) Fuerza el endpoint directo usado por versiones previas.
      const storedEndpoint = String(localStorage.getItem(ENDPOINT_KEY) || '').trim();
      if(storedEndpoint !== OFFICIAL_ENDPOINT){
        localStorage.setItem(ENDPOINT_KEY, OFFICIAL_ENDPOINT);
      }

      // 2) Fuerza el endpoint guardado dentro del estado principal.
      const rawState = localStorage.getItem(STATE_KEY);
      if(rawState){
        const state = JSON.parse(rawState);
        state.collaboration ||= {};
        state.collaboration.inbox ||= {};

        if(String(state.collaboration.inbox.endpoint || '').trim() !== OFFICIAL_ENDPOINT){
          state.collaboration.inbox.endpoint = OFFICIAL_ENDPOINT;
          localStorage.setItem(STATE_KEY, JSON.stringify(state));
        }
      }

      localStorage.setItem(MIGRATION_KEY, JSON.stringify({
        migratedAt: new Date().toISOString(),
        endpoint: OFFICIAL_ENDPOINT,
        previousEndpoint: storedEndpoint || ''
      }));

      window.__RESIDENCIAPP_OFFICIAL_CONTRIBUTION_ENDPOINT__ = OFFICIAL_ENDPOINT;
      console.info('[ResidenciAPP] Endpoint colaborativo v35.25 verificado:', OFFICIAL_ENDPOINT);
    } catch(err){
      console.warn('[ResidenciAPP] No se pudo migrar endpoint colaborativo v35.25:', err);
    }
  }

  migrateContributionEndpoint();
})();
