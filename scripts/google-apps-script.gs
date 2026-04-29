/**
 * ResidenciAPP · Bandeja de aportes colaborativos con imágenes + feedback aprobado
 *
 * Uso:
 * 1) Pegar este código en Google Apps Script.
 * 2) Si el proyecto NO está vinculado a una Google Sheet, completar SPREADSHEET_ID.
 * 3) Implementar como Web App con acceso "Cualquier persona".
 * 4) Pegar la URL /exec en assets/js/config.js.
 *
 * Estados útiles en la columna Estado:
 * - pendiente: aporte recibido, no visible públicamente.
 * - aprobado: la app lo carga como feedback validado para todos.
 * - rechazado: no se carga.
 */
const SPREADSHEET_ID = ''; // Opcional. Si el script está creado desde la Sheet, dejalo vacío.
const SHEET_NAME = 'Aportes';
const IMAGE_FOLDER_NAME = 'ResidenciAPP Aportes - Imagenes';

function doPost(e) {
  try {
    const ss = getSpreadsheet_();
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

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.mode === 'approved') {
    const records = getApprovedRecords_();
    return output_({ ok: true, records: records, count: records.length }, params.callback);
  }
  return output_({ ok: true, app: 'ResidenciAPP Aportes', message: 'Endpoint activo. Usar POST para aportes o GET ?mode=approved para feedback aprobado.' }, params.callback);
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No hay Google Sheet activa. Completá SPREADSHEET_ID en el Apps Script.');
  return ss;
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

function getApprovedRecords_() {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, SHEET_NAME);
  ensureHeader_(sheet);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  const idx = makeIndex_(headers);
  const out = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const status = String(row[idx['Estado']] || '').trim().toLowerCase();
    if (!['aprobado', 'aprobada', 'approved', 'validado', 'validada'].includes(status)) continue;

    let payload = null;
    const payloadRaw = row[idx['Payload completo JSON sin base64']];
    if (payloadRaw) {
      try { payload = JSON.parse(payloadRaw); } catch (err) { payload = null; }
    }
    const question = payload && payload.question ? payload.question : {};
    const contribution = payload && payload.contribution ? payload.contribution : {};

    out.push({
      status: status,
      approvedAt: toIso_(row[idx['Fecha']]),
      submissionId: row[idx['Submission ID']] || '',
      questionId: row[idx['Pregunta ID']] || question.id || '',
      question: {
        id: row[idx['Pregunta ID']] || question.id || '',
        source: row[idx['Fuente']] || question.source || '',
        year: row[idx['Año']] || question.year || '',
        eje: row[idx['Eje']] || question.eje || '',
        tema: row[idx['Tema']] || question.tema || '',
        sprint: row[idx['Sprint']] || question.sprint || '',
        text: row[idx['Enunciado']] || question.text || '',
        answer: row[idx['Respuesta']] || question.answer || '',
        correctAnswerText: row[idx['Respuesta correcta texto']] || question.correctAnswerText || ''
      },
      contribution: {
        whyCorrect: row[idx['Por qué es correcta']] || contribution.whyCorrect || '',
        keyData: row[idx['Datos clave']] || contribution.keyData || '',
        distractors: row[idx['Análisis de distractores']] || contribution.distractors || '',
        goldenRule: row[idx['Regla de Oro']] || contribution.goldenRule || '',
        bibliography: row[idx['Bibliografía / fuente']] || contribution.bibliography || '',
        contributorName: row[idx['Colaborador']] || contribution.contributorName || '',
        contributionType: row[idx['Tipo de aporte']] || contribution.contributionType || '',
        confidence: row[idx['Confianza']] || contribution.confidence || '',
        imageUrl: row[idx['Imagen URL Drive']] || '',
        imageFileId: row[idx['Imagen File ID']] || ''
      }
    });
  }
  return out;
}

function makeIndex_(headers) {
  const index = {};
  headers.forEach((h, i) => { index[h] = i; });
  return new Proxy(index, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return -1;
    }
  });
}

function toIso_(value) {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toISOString();
  } catch (err) { return String(value); }
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
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return { name: fileName, originalName: image.name || '', mimeType: mimeType, size: bytes.length, fileId: file.getId(), url: file.getUrl() };
}

function getOrCreateImageFolder_() {
  const folders = DriveApp.getFoldersByName(IMAGE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(IMAGE_FOLDER_NAME);
}

function sanitizeFileName_(name) {
  return String(name || '').replace(/[\\/:*?"<>|#%{}$!`&@+=]/g, '-').replace(/\s+/g, '_').slice(0, 120);
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

function json_(obj) { return output_(obj, ''); }

function output_(obj, callback) {
  const text = callback ? String(callback) + '(' + JSON.stringify(obj) + ');' : JSON.stringify(obj);
  return ContentService
    .createTextOutput(text)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
