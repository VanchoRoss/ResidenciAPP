/**
 * ResidenciAPP · Bandeja de aportes colaborativos con imágenes
 * Pegar este código en Google Apps Script dentro de una Google Sheet.
 * Luego desplegar como Web App y pegar la URL /exec en assets/js/config.js.
 */
const SHEET_NAME = 'Aportes';
const IMAGE_FOLDER_NAME = 'ResidenciAPP Aportes - Imagenes';

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet_(ss, SHEET_NAME);
    ensureHeader_(sheet);

    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);
    const q = payload.question || {};
    const c = payload.contribution || {};
    const image = c.image || null;
    const imageResult = image && image.data ? saveImage_(image, q, payload.submissionId) : null;

    const payloadForSheet = sanitizePayloadForSheet_(payload, imageResult);

    sheet.appendRow([
      new Date(),
      payload.submissionId || '',
      payload.status || 'pendiente',
      c.contributorName || '',
      c.contributionType || '',
      c.confidence || '',
      q.id || '',
      q.sourceLabel || q.source || '',
      q.year || '',
      q.eje || '',
      q.tema || '',
      q.sprint || '',
      q.text || '',
      q.options ? JSON.stringify(q.options) : '',
      q.answer || '',
      q.correctAnswerText || '',
      c.whyCorrect || '',
      c.keyData || '',
      c.distractors || '',
      c.goldenRule || '',
      c.bibliography || '',
      imageResult ? imageResult.name : '',
      imageResult ? imageResult.mimeType : '',
      imageResult ? imageResult.size : '',
      imageResult ? imageResult.url : '',
      imageResult ? imageResult.fileId : '',
      JSON.stringify(payloadForSheet)
    ]);

    return json_({ ok: true, image: imageResult });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doGet() {
  return json_({ ok: true, app: 'ResidenciAPP Aportes', message: 'Endpoint activo. Usar POST desde la app.' });
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    'Fecha',
    'Submission ID',
    'Estado',
    'Colaborador',
    'Tipo de aporte',
    'Confianza',
    'Pregunta ID',
    'Fuente',
    'Año',
    'Eje',
    'Tema',
    'Sprint',
    'Enunciado',
    'Opciones JSON',
    'Respuesta',
    'Respuesta correcta texto',
    'Por qué es correcta',
    'Datos clave',
    'Análisis de distractores',
    'Regla de Oro',
    'Bibliografía / fuente',
    'Imagen nombre',
    'Imagen MIME',
    'Imagen tamaño bytes',
    'Imagen URL Drive',
    'Imagen File ID',
    'Payload completo JSON sin base64'
  ]);
  sheet.setFrozenRows(1);
}

function saveImage_(image, question, submissionId) {
  const dataUrl = String(image.data || '');
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Formato de imagen inválido');

  const mimeType = image.mimeType || match[1] || 'image/png';
  const base64 = match[2];
  const bytes = Utilities.base64Decode(base64);
  const safeQuestionId = sanitizeFileName_(question.id || 'pregunta');
  const safeName = sanitizeFileName_(image.name || 'imagen.png');
  const fileName = [safeQuestionId, submissionId || Date.now(), safeName].join('__');

  const folder = getOrCreateImageFolder_();
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);

  // Para que puedas abrir la imagen desde la Google Sheet.
  // Si preferís que quede privada, comentá la línea siguiente.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return {
    name: fileName,
    originalName: image.name || '',
    mimeType: mimeType,
    size: bytes.length,
    fileId: file.getId(),
    url: file.getUrl()
  };
}

function getOrCreateImageFolder_() {
  const folders = DriveApp.getFoldersByName(IMAGE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(IMAGE_FOLDER_NAME);
}

function sanitizeFileName_(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|#%{}$!`&@+=]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 120);
}

function sanitizePayloadForSheet_(payload, imageResult) {
  const copy = JSON.parse(JSON.stringify(payload || {}));
  if (copy.contribution && copy.contribution.image) {
    copy.contribution.image = {
      name: copy.contribution.image.name || '',
      mimeType: copy.contribution.image.mimeType || '',
      size: copy.contribution.image.size || '',
      addedAt: copy.contribution.image.addedAt || '',
      drive: imageResult || null,
      data: '[base64 omitido para no saturar la planilla]'
    };
  }
  return copy;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
