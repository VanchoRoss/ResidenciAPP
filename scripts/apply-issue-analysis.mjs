import fs from 'node:fs';

const issueBody = process.env.ISSUE_BODY || '';
const match = issueBody.match(/```json\s*([\s\S]*?)```/);
if (!match) {
  throw new Error('No se encontró payload JSON en el issue.');
}

const payload = JSON.parse(match[1]);
if (payload.type !== 'residenciapp_analysis_suggestion') {
  throw new Error('Payload no compatible con ResidenciAPP.');
}
if (!payload.questionId || !payload.analysis) {
  throw new Error('Payload incompleto: falta questionId o analysis.');
}

const jsonPath = 'assets/data/collabdata.json';
const jsPath = 'assets/data/collabdata.js';
const db = fs.existsSync(jsonPath)
  ? JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  : { analyses: {} };

db.analyses ||= {};
db.analyses[payload.questionId] = {
  whyCorrect: payload.analysis.whyCorrect || '',
  keyData: payload.analysis.keyData || '',
  distractors: payload.analysis.distractors || '',
  goldenRule: payload.analysis.goldenRule || '',
  source: 'github_issue',
  issueNumber: process.env.ISSUE_NUMBER || null,
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(jsonPath, JSON.stringify(db, null, 2) + '\n');
fs.writeFileSync(jsPath, 'window.RESIDENCIAPP_COLLABDATA = ' + JSON.stringify(db) + ';\n');
console.log('Integrado análisis para', payload.questionId);
