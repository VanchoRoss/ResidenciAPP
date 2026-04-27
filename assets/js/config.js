// Configuración central opcional.
// La app actual también permite configurar GitHub desde la UI.
window.RESIDENCIAPP_CONFIG = {
  github: {
    owner: 'TU_USUARIO_O_ORG',
    repo: 'TU_REPOSITORIO',
    token: '', // Evitá dejar un PAT en un repo público. Preferí configurarlo desde la UI o usar serverless.
    labels: ['residenciapp-sugerencia']
  }
};
