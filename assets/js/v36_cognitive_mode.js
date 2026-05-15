(function(){
const confusionPairs=[
{title:'Asma vs EPOC',keys:['Reversible vs progresivo','Joven/atopia vs tabaquismo','Eosinofilia vs atrapamiento aéreo'],gold:'Todo EPOC fuerte tiene tabaquismo hasta demostrar lo contrario.'},
{title:'Crohn vs CUCI',keys:['Transmural vs mucosa','Discontinuo vs continuo','Fístulas vs megacolon tóxico'],gold:'Las lesiones salteadas orientan a Crohn.'},
{title:'Nefrótico vs Nefrítico',keys:['Proteinuria masiva vs hematuria','Edema blando vs HTA','Hipoalbuminemia vs cilindros'],gold:'Hematuria + HTA = pensá nefrítico.'}
];
const progressiveCases=[
{intro:'Guardia 3 AM. Mujer de 24 años con disnea y sibilancias.',steps:['Antecedente de eczema y rinitis alérgica.','SatO2 96%, sibilancias espiratorias difusas.','Mejora tras salbutamol inhalado.'],answer:'Asma exacerbada leve.'},
{intro:'Paciente masculino de 68 años tabaquista con disnea progresiva.',steps:['40 paquetes/año.','Tórax en tonel y espiración prolongada.','VEF1 disminuido con reversibilidad parcial.'],answer:'EPOC.'}
];
function createPanel(){
const btn=document.createElement('button');
btn.className='cog-btn';
btn.innerHTML='🧠 Cognitive Mode';
document.body.appendChild(btn);
const panel=document.createElement('div');
panel.className='cog-panel';
panel.innerHTML=`<div class="cog-header"><h2>ResidenciAPP Cognitive Mode</h2><button id="cogClose">✕</button></div>
<div class="cog-tabs">
<button data-tab="confusions" class="active">Confusiones Frecuentes</button>
<button data-tab="cases">Casos Progresivos</button>
<button data-tab="feedback">Feedback IA</button>
</div>
<div id="cogContent"></div>`;
document.body.appendChild(panel);
function renderConfusions(){
return confusionPairs.map(c=>`<div class="cog-card"><h3>${c.title}</h3><ul>${c.keys.map(k=>`<li>${k}</li>`).join('')}</ul><div class="gold-rule">Regla de oro: ${c.gold}</div></div>`).join('');
}
let caseIndex=0, stepIndex=0;
function renderCase(){
const c=progressiveCases[caseIndex];
const revealed=c.steps.slice(0,stepIndex);
return `<div class="cog-card"><h3>Caso Clínico Progresivo</h3><p>${c.intro}</p>${revealed.map(s=>`<div class="step">• ${s}</div>`).join('')}<div class="case-actions"><button id="nextStep">Revelar dato</button><button id="showAnswer">Ver diagnóstico</button></div><div id="caseAnswer"></div></div>`;
}
function renderFeedback(){
return `<div class="cog-card"><h3>Plantilla de Feedback Inteligente</h3>
<div class="feedback-grid">
<div><strong>✔ Por qué es correcta</strong><p>Identifica el patrón clínico dominante.</p></div>
<div><strong>✘ Distractores</strong><p>Las otras opciones comparten síntomas parciales pero fallan en el dato clave.</p></div>
<div><strong>🧠 Qué evaluó el examen</strong><p>Diferenciación clínica y conducta inicial.</p></div>
<div><strong>🔥 Regla de oro</strong><p>El examen premia diferenciar antes que memorizar.</p></div>
</div></div>`;
}
function setTab(tab){
const content=panel.querySelector('#cogContent');
panel.querySelectorAll('.cog-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
if(tab==='confusions') content.innerHTML=renderConfusions();
if(tab==='cases') {
content.innerHTML=renderCase();
content.querySelector('#nextStep').onclick=()=>{const c=progressiveCases[caseIndex]; if(stepIndex<c.steps.length){stepIndex++; content.innerHTML=renderCase(); attachCaseEvents();}};
attachCaseEvents();
}
if(tab==='feedback') content.innerHTML=renderFeedback();
}
function attachCaseEvents(){
const content=panel.querySelector('#cogContent');
const c=progressiveCases[caseIndex];
content.querySelector('#nextStep')?.addEventListener('click',()=>{});
content.querySelector('#showAnswer')?.addEventListener('click',()=>{content.querySelector('#caseAnswer').innerHTML=`<div class="answer">Diagnóstico probable: ${c.answer}</div>`;});
}
btn.onclick=()=>panel.classList.toggle('open');
panel.querySelector('#cogClose').onclick=()=>panel.classList.remove('open');
panel.querySelectorAll('.cog-tabs button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
setTab('confusions');
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',createPanel); else createPanel();
})();
