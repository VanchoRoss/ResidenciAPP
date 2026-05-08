/**
 * ResidenciAPP · Bandeja de aportes colaborativos + reportes de errores
 * v35.21
 *
 * Uso:
 * 1) Pegar este código en Google Apps Script.
 * 2) Si el proyecto NO está vinculado a una Google Sheet, completar SPREADSHEET_ID.
 * 3) Implementar como Web App con acceso "Cualquier persona".
 * 4) Pegar la URL /exec en assets/js/config.js.
 *
 * Estructura sugerida de la planilla:
 * - Panel: vista manual / dashboard.
 * - Feedback IA: aportes de explicación y feedback colaborativo.
 * - Reportes de errores: problemas detectados por los usuarios.
 *
 * Compatibilidad:
 * - Si ya existe una hoja llamada "Aportes", se usa como bandeja de feedback para no romper flujos viejos.
 * - Si existe o se crea "Feedback IA", el script la prioriza.
 */
const SPREADSHEET_ID = ''; // Opcional. Si el script está creado desde la Sheet, dejalo vacío.
const FEEDBACK_SHEET_NAME = 'Feedback IA';
const LEGACY_FEEDBACK_SHEET_NAME = 'Aportes';
const ERROR_REPORTS_SHEET_NAME = 'Reportes de errores';
const IMAGE_FOLDER_NAME = 'ResidenciAPP Aportes - Imagenes';

function doPost(e) {
  try {
    const ss = getSpreadsheet_();
    const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const payload = JSON.parse(raw);

    if (payload.entryType === 'question_error_report' || payload.report) {
      const sheet = getOrCreateSheet_(ss, ERROR_REPORTS_SHEET_NAME);
      ensureErrorReportHeader_(sheet);
      appendErrorReport_(sheet, payload);
      return json_({ ok: true, type: 'question_error_report' });
    }

    const sheet = getFeedbackSheet_(ss);
    ensureFeedbackHeader_(sheet);

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
    formatFeedbackSheet_(sheet);
    return json_({ ok: true, type: 'feedback', image: imageResult });
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
  if (params.mode === 'health') {
    return output_({ ok: true, app: 'ResidenciAPP Aportes', version: 'v35.21', sheets: [FEEDBACK_SHEET_NAME, ERROR_REPORTS_SHEET_NAME] }, params.callback);
  }
  return output_({ ok: true, app: 'ResidenciAPP Aportes', message: 'Endpoint activo. Usar POST para aportes/reportes o GET ?mode=approved para feedback aprobado.' }, params.callback);
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

function getFeedbackSheet_(ss) {
  return ss.getSheetByName(FEEDBACK_SHEET_NAME) || ss.getSheetByName(LEGACY_FEEDBACK_SHEET_NAME) || ss.insertSheet(FEEDBACK_SHEET_NAME);
}

function ensureFeedbackHeader_(sheet) {
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
  formatFeedbackSheet_(sheet);
}

function ensureErrorReportHeader_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    'Fecha',
    'Submission ID',
    'Estado',
    'Tipo de registro',
    'Pregunta ID',
    'Fuente',
    'Año',
    'Eje',
    'Tema',
    'Sprint',
    'Enunciado original',
    'Pregunta pegada / reportada',
    'Opciones JSON',
    'Respuesta cargada',
    'Respuesta correcta texto',
    'Qué está mal',
    'Código del problema',
    'Comentario adicional',
    'URL',
    'User Agent',
    'Payload completo JSON'
  ]);
  formatErrorReportSheet_(sheet);
}

function appendErrorReport_(sheet, payload) {
  const q = payload.question || {};
  const r = payload.report || {};
  sheet.appendRow([
    new Date(),
    payload.submissionId || '',
    payload.status || 'pendiente',
    payload.entryType || 'question_error_report',
    q.id || '',
    q.sourceLabel || q.source || '',
    q.year || '',
    q.eje || '',
    q.tema || '',
    q.sprint || '',
    q.text || '',
    r.questionText || q.reportedText || '',
    q.options ? JSON.stringify(q.options) : '',
    q.answer || '',
    q.correctAnswerText || '',
    r.issueLabel || '',
    r.issueType || '',
    r.additionalComment || '',
    r.url || '',
    r.userAgent || '',
    JSON.stringify(payload)
  ]);
  formatErrorReportSheet_(sheet);
}

function formatFeedbackSheet_(sheet) {
  try {
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(3);
    sheet.getRange(1, 1, 1, 27).setFontWeight('bold').setFontColor('#ffffff').setBackground('#0f766e').setWrap(true);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
    sheet.getRange('C:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['pendiente', 'aprobado', 'rechazado', 'revisar'], true).build());
    sheet.getRange('E:E').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['explicacion_completa', 'correccion_respuesta', 'dato_clave', 'bibliografia', 'nemotecnia', 'error_detectado', 'mejora_redaccion', 'reporte_error'], true).build());
    sheet.autoResizeColumns(1, 12);
    sheet.setColumnWidth(13, 360);
    sheet.setColumnWidths(17, 5, 260);
    sheet.setColumnWidth(27, 360);
  } catch (err) {}
}

function formatErrorReportSheet_(sheet) {
  try {
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);
    sheet.getRange(1, 1, 1, 21).setFontWeight('bold').setFontColor('#ffffff').setBackground('#b45309').setWrap(true);
    sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
    sheet.getRange('C:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['pendiente', 'corregido', 'descartado', 'revisar'], true).build());
    sheet.getRange('P:P').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['La respuesta está mal', 'El feedback es incorrecto', 'La pregunta está mal'], true).build());
    sheet.autoResizeColumns(1, 10);
    sheet.setColumnWidth(11, 360);
    sheet.setColumnWidth(12, 360);
    sheet.setColumnWidth(18, 320);
    sheet.setColumnWidth(21, 360);
  } catch (err) {}
}

function getApprovedRecords_() {
  const ss = getSpreadsheet_();
  const sheet = getFeedbackSheet_(ss);
  ensureFeedbackHeader_(sheet);
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
