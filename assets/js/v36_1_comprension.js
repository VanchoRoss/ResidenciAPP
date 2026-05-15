/* ═══════════════════════════════════════════════════════════════════
   ResidenciAPP v36.1 · MODO COMPRENSIÓN
   ═══════════════════════════════════════════════════════════════════
   Unifica Bucle Infinito + Cognitive Mode en una sola vista nativa.
   Reemplaza el botón "♾️ Bucle Infinito" que abría página separada.
   Elimina el botón flotante de Cognitive Mode.
   No modifica banco, progreso, sesiones ni estado de versiones previas.
   ═══════════════════════════════════════════════════════════════════ */

(function(){
  'use strict';
  if (window.__RESIDENCIAPP_V361__) return;
  window.__RESIDENCIAPP_V361__ = true;

  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const E  = (v='') => String(v ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSave = () => { try { saveState(); } catch(_){} };

  // ═══════════════════════════════════════════════════════════════════
  // BASE DE DATOS DE CONFUSIONES FRECUENTES
  // 24 pares ordenados por peso en el banco histórico 2016–2025
  // ═══════════════════════════════════════════════════════════════════
  const CONFUSIONES = [
    {
      id: 'asma-epoc', eje: 'Neumología',
      titulo: 'Asma vs EPOC',
      tabla: [
        ['Edad de inicio',    'Joven (infancia/adolescencia)',  'Adulto >40 años, tabaquismo'],
        ['Causa principal',   'Atopia, alérgenos, hiperreactividad', '≥10 paquetes/año (en >90%)'],
        ['Reversibilidad',    'Completa con broncodilatador',   'Parcial o ausente'],
        ['VEF1/CVF post-BD',  'Se normaliza (≥0.70)',           'Sigue <0.70 (diagnóstico EPOC)'],
        ['Eosinofilia',       'Frecuente',                      'Ausente (neutrófilos)'],
        ['Atrapamiento aéreo','No en intercrisis',              'Permanente, tórax en tonel'],
        ['DLCO',              'Normal',                         'Disminuida (enfisema)'],
      ],
      oro: 'Si tenés tabaquismo extenso y la obstrucción NO revierte completamente, es EPOC aunque tenga algo de sibilancias.',
      trampas: ['EPOC puede tener reversibilidad parcial y confundirse con asma tardía', 'Asma grave puede remodelarse y no revertir completamente', 'Solapamiento ACOS: existe, pero el examen evalúa los extremos']
    },
    {
      id: 'preeclampsia-eclampsia-hellp', eje: 'Obstetricia',
      titulo: 'Preeclampsia vs Eclampsia vs HELLP',
      tabla: [
        ['Definición',         'HTA + proteinuria ≥20 sem',           'Preeclampsia + convulsiones', 'Preeclampsia con hemólisis + plaquetas bajas + transaminasas altas'],
        ['TA',                 '≥140/90 en 2 tomas c/4h',             'HTA severa presente',         'Puede no cumplir criterios de PE severa'],
        ['Proteinuria',        '≥300mg/24h o rel prot/creat ≥0.3',    'Presente',                    'Variable (puede ser mínima)'],
        ['Convulsiones',       'NO (si hay → eclampsia)',              'SÍ — criterio diagnóstico',   'NO necesariamente'],
        ['Hemólisis/LDH',      'No en PE leve',                       'Si PE severa puede haberla',  'SÍ — central para HELLP'],
        ['Plaquetas',          '>100.000',                             'Pueden caer',                 '<100.000 (criterio HELLP)'],
        ['TGO/TGP',            'Normal en PE leve',                   'Elevadas en PE severa',       '>2x límite superior — criterio HELLP'],
        ['Tratamiento agudo',  'MgSO4 profilaxis, antihipertensivos', 'MgSO4 + control convulsión', 'Finalizar embarazo (corticoides si <34 sem)'],
      ],
      oro: 'Convulsión en embarazada = eclampsia hasta demostrar lo contrario → MgSO4 EV inmediato.',
      trampas: ['HELLP puede ocurrir sin HTA severa ni proteinuria importante', 'MgSO4 en eclampsia NO es anticonvulsivante clásico — actúa por neuroprotección de la neurona', 'Diastólica ≥110 sola ya es criterio de severidad']
    },
    {
      id: 'nefrotico-nefritico', eje: 'Nefrología',
      titulo: 'Síndrome nefrótico vs nefrítico',
      tabla: [
        ['Lesión',             'Podocitos (barrera carga)',      'Inflamación glomerular'],
        ['Proteinuria',        '≥3.5 g/día (masiva)',            '<3 g/día'],
        ['Hematuria',          'Mínima o ausente',               'Macroscópica o microscópica + cilindros'],
        ['HTA',                'Leve o ausente (hipovolemia)',   'Presente — por retención Na y H2O'],
        ['Edema',              'Blando, declive, anasarca',      'Periorbitario, facial, matutino'],
        ['Albúmina sérica',    '<3 g/dL (hipoalbuminemia)',      'Normal o levemente baja'],
        ['Complemento',        'Normal',                         'Bajo en GNPE y MPGN'],
        ['Causa pediátrica',   'Cambios mínimos (>80%)',         'GNPE post-estreptocócica'],
        ['Causa adulto',       'Nefropatía diabética, GSFS',    'IgA, GNMP, lupus'],
      ],
      oro: 'Hematuria + HTA + cilindros = nefrítico. Edema blando + proteinuria masiva sin hematuria = nefrótico.',
      trampas: ['Síndrome nefrótico en adulto: siempre biopsiar (causa cambia el tratamiento)', 'GNPE puede tener proteinuria moderada y confundirse con nefrótico leve', 'En cambios mínimos la biopsia es normal a MO — diagnóstico por ME']
    },
    {
      id: 'crohn-cuci', eje: 'Gastroenterología',
      titulo: 'Enfermedad de Crohn vs CUCI',
      tabla: [
        ['Segmentos',          'Cualquier tramo boca-ano',       'Solo colon (recto siempre afectado)'],
        ['Distribución',       'Discontinua ("salteada")',        'Continua desde recto hacia proximal'],
        ['Profundidad',        'Transmural (todas las capas)',    'Mucosa y submucosa'],
        ['Granulomas',         'SÍ (50% de biopsias)',           'NO (criptitis y abscesos de cripta)'],
        ['Fístulas/abscesos',  'Frecuentes (transmural)',         'Excepcionales'],
        ['Estenosis',          'Sí, por fibrosis',               'Rara (sospechar Ca en estenosis)'],
        ['Sangrado rectal',    'Menos frecuente',                'Síntoma cardinal'],
        ['Complicación grave', 'Fistulización, estenosis, malabsorción', 'Megacolon tóxico'],
        ['Tratamiento',        'Aminosalicilatos, corticoides, biológicos, cirugía (no cura)', 'Ídem + colectomía total = CURA'],
      ],
      oro: 'Lesiones salteadas + fístulas + granulomas = Crohn. Sangrado rectal + lesión continua desde recto = CUCI.',
      trampas: ['Crohn ileal puede debutar como pseudoapendicitis', 'CUCI grave: nunca enemas si hay megacolon tóxico', 'Anti-TNF (infliximab) funciona en ambas pero el examen pregunta diferencias']
    },
    {
      id: 'urgencia-emergencia-hta', eje: 'Cardiología',
      titulo: 'Urgencia hipertensiva vs Emergencia hipertensiva',
      tabla: [
        ['Criterio diferenciador', 'Ausencia de daño órgano diana agudo', 'Daño de órgano diana agudo'],
        ['Cifras de PA',           '≥180/120 mmHg',                       '≥180/120 mmHg (igual)'],
        ['Síntomas',               'Cefalea, epistaxis, ansiedad',         'Foco neurológico, EAP, angor, oliguria'],
        ['Tratamiento',            'Oral, ambulatorio, descenso gradual 24-48h', 'IV hospitalizado, descenso máx. 20-25% en 1h'],
        ['Fármacos',               'Captopril SL, labetalol oral, nifedipina oral', 'Nitroprusiato, labetalol IV, nicardipino IV'],
        ['ACV isquémico agudo',    '—',                                   'Bajar PA solo si >185/110 y se va a trombolizar'],
      ],
      oro: 'La diferencia NO está en el número de PA, está en si hay daño de órgano. Cefalea sola sin foco = urgencia → no la bajés rápido.',
      trampas: ['Bajar PA demasiado rápido en ACV isquémico empeora la isquemia (penumbra depende de PA alta)', 'Disección aórtica: meta PA sistólica <120 mmHg, objetivo diferente al resto', 'Feocromocitoma: alfa-bloqueante PRIMERO (nunca betabloqueante solo)']
    },
    {
      id: 'fa-flutter', eje: 'Cardiología',
      titulo: 'Fibrilación auricular vs Flutter auricular',
      tabla: [
        ['Mecanismo',           'Múltiples focos reentrantes desordenados', 'Un circuito de reentrada típico'],
        ['Frecuencia auricular','350-600 lpm (irregular)',                  '250-350 lpm (regular)'],
        ['Frecuencia ventricular','Irregularmente irregular',               'Regular (2:1, 3:1, 4:1)'],
        ['Morfología ECG',      'Sin ondas P, línea de base caótica',       'Ondas F en serrucho (II, III, aVF)'],
        ['CHADS-VASC',          'Sí, anticoagular si ≥2 (hombres) / ≥3 (mujeres)', 'Igual (mismo riesgo embólico)'],
        ['Cardioversión',       'Eléctrica 100-200J bifásico',              'Más fácil: 50-100J o ablación con catéter'],
        ['Control frecuencia',  'Betabloqueante, digoxina, verapamilo',     'Igual + considerar ablación definitiva'],
      ],
      oro: 'RR irregularmente irregular en ECG = FA. Ondas en serrucho en cara inferior con RR regular = flutter. Anticoagular igual en ambas.',
      trampas: ['FA con conducción aberrante (bloqueo de rama) puede parecerse a TV', 'Flutter 2:1 puede tener frecuencia ventricular de 150 lpm y confundirse con TSV', 'En FA con WPW: NO usar betabloqueante ni digoxina (aumentan conducción accesoria)']
    },
    {
      id: 'ic-fer-fep', eje: 'Cardiología',
      titulo: 'IC con FE reducida (FEr) vs FE preservada (FEp)',
      tabla: [
        ['FE ecocardiográfica', '<40% (dilatación, hipocontractilidad)',  '≥50% (cavidad normal o pequeña)'],
        ['Fisiopatología',      'Disfunción sistólica',                   'Disfunción diastólica'],
        ['Perfil típico',       'Joven, cardiopatía isquémica, dilatada', 'Mayor, HTA, DM, obesa, mujer'],
        ['IECA/ARA II',         'SÍ — reducen mortalidad',               'Solo para control TA y síntomas'],
        ['Betabloqueante',      'SÍ — carvedilol, bisoprolol, metoprolol', 'Beneficio menos claro'],
        ['ARM (espironolactona)','SÍ si FE <35%',                        'Evidencia mixta'],
        ['ISGLT2',              'SÍ — empagliflozina reduce reinternación', 'SÍ — beneficio demostrado reciente'],
        ['Diuréticos',          'Para congestion (no mejoran sobrevida)', 'Para congestión'],
        ['Digoxina',            'Reduce reinternaciones (no mortalidad)',  'No indicada rutinariamente'],
      ],
      oro: 'FEr = cuadriplay (IECA/ARA II + BB + ARM + ISGLT2). FEp = trata la causa (HTA, FA, isquemia) + diuréticos para síntomas.',
      trampas: ['Betabloqueante en IC descompensada aguda: contraindicado hasta estabilizar', 'IECA + ARM + hiperpotasemia: monitorear K+', 'FE 40-49% = "rango medio" — tratar como FEr en práctica']
    },
    {
      id: 'tbc-activa-latente', eje: 'Infectología',
      titulo: 'TBC activa vs TBC latente',
      tabla: [
        ['Definición',          'Enfermedad clínica activa por M. tuberculosis', 'Infección sin enfermedad activa (huésped controló el bacilo)'],
        ['Contagio',            'SÍ (bacilífera si cavernas)',                  'NO'],
        ['Síntomas',            'Tos >2 sem, fiebre vespertina, sudoración, pérdida de peso', 'Asintomático'],
        ['BAAR/cultivo',        'Positivo',                                     'Negativo'],
        ['PPD/IGRA',            'Positivo (puede ser negativo en anergia)',      'Positivo'],
        ['Rx tórax',            'Infiltrado apical, cavernas, adenopatías',      'Normal o cicatrices'],
        ['Tratamiento',         'RHZE 2 meses + RH 4 meses',                   'Isoniazida 9 meses (o rifampicina 4 meses)'],
        ['Indicación tto latente', '—',                                        'VIH, contacto estrecho, conversión reciente, inmunosuprimidos'],
      ],
      oro: 'PPD reactivo en VIH con ≥5mm ya es criterio de TBC latente → tratar con isoniazida 9 meses aunque esté asintomático.',
      trampas: ['TBC en VIH puede no tener cavernas (patrón miliar o extrapulmonar)', 'RHZE: el examen pregunta "¿cuál no se usa en embarazo?" → pirazinamida (Z) es controvertida', 'Resistencia: sospechá MDR-TB si es contacto de caso resistente o fracaso terapéutico']
    },
    {
      id: 'vh-estadios', eje: 'Infectología',
      titulo: 'VIH: estadios y puntos de corte CD4',
      tabla: [
        ['Estadio',             'CD4',                    'SIDA definidor',                     'Profilaxis'],
        ['A (asintomático)',     '>500 cél/μL',            'No',                                 'No profilaxis adicional'],
        ['B (sintomático no SIDA)', '200-499 cél/μL',     'No',                                 'No profilaxis adicional'],
        ['C (SIDA)',             '<200 cél/μL',            'Sí',                                 'Cotrimoxazol (Pneumocystis + Toxo)'],
        ['CD4 <100',            '<100 cél/μL',            '—',                                  '+ Azitromicina (MAC)'],
        ['CD4 <50',             '<50 cél/μL',             'CMV retinitis, MAI diseminado',       '+ Valganciclovir si CMV'],
      ],
      oro: 'CD4 <200 = SIDA + cotrimoxazol profiláctico. CD4 <50 = riesgo CMV retinitis. El TAR se inicia SIEMPRE, independientemente del CD4.',
      trampas: ['TAR no se espera al CD4 — se inicia en todos', 'Cotrimoxazol cubre Pneumocystis Y Toxoplasma', 'En TB activa + VIH: iniciar primero TB, luego TAR 2-8 semanas después (excepto CD4 <50 → iniciar TAR antes)']
    },
    {
      id: 'sifilis-estadios', eje: 'Infectología',
      titulo: 'Sífilis: estadios y serología',
      tabla: [
        ['Estadio',             'Clínica',                                      'VDRL',        'FTA-ABS/TPHA'],
        ['Primaria',            'Chancro indurado indoloro',                    'Positivo o negativo (ventana)', 'Positivo'],
        ['Secundaria',          'Rash palmo-plantar, condilomas, alopecia',     'Muy positivo', 'Positivo'],
        ['Latente precoz',      'Asintomática < 1 año',                         'Positivo',    'Positivo'],
        ['Latente tardía',      'Asintomática > 1 año',                         'Bajo título', 'Positivo'],
        ['Terciaria',           'Goma, aortitis, neurosífilis',                 'Puede (-)',   'Positivo'],
      ],
      oro: 'VDRL es no treponémico (cuantificable para seguimiento). FTA-ABS es treponémico (permanece + de por vida).',
      trampas: ['Rash palmo-plantar en embarazada = sífilis hasta descartar', 'Tratamiento en embarazo: penicilina G SIEMPRE (alergia → desensibilizar, no usar alternativas)', 'Neurosífilis: LCR con VDRL + pleocitosis + proteínas → penicilina G EV 10-14 días']
    },
    {
      id: 'dbt1-dbt2', eje: 'Endocrinología',
      titulo: 'Diabetes tipo 1 vs tipo 2',
      tabla: [
        ['Mecanismo',           'Destrucción autoinmune células β',            'Resistencia a insulina + defecto secretor'],
        ['Edad típica',         'Niño/adolescente (puede ser adulto)',         'Adulto >40 años (pero hay jóvenes obesos)'],
        ['Insulinopenia',       'Absoluta (obligatorio insulina)',             'Relativa (insulina si no hay control oral)'],
        ['Anticuerpos',         'GAD, IA-2, Zn-T8 positivos',                 'Negativos'],
        ['Péptido C',           'Indetectable',                               'Normal o elevado'],
        ['IMC',                 'Normal o bajo',                              'Obesidad (80-90%)'],
        ['Cetoacidosis',        'Sí, debut habitual',                         'Excepcional (estado hiperglucémico hiperosmolar)'],
        ['1ra línea',           'Insulina desde el inicio',                   'Metformina + cambio de estilo de vida'],
      ],
      oro: 'Joven, delgado, debut con CAD → DM1. Adulto obeso, asintomático, hallazgo en laboratorio → DM2.',
      trampas: ['LADA (Latent Autoimmune Diabetes in Adults): DM1 de inicio lento en adultos, anticuerpos positivos, no responde a antidiabéticos orales', 'DM1 puede iniciar en adultos', 'CAD puede ocurrir en DM2 bajo estrés o infección severa']
    },
    {
      id: 'hipotiroidismo-hipertiroidismo', eje: 'Endocrinología',
      titulo: 'Hipotiroidismo vs Hipertiroidismo',
      tabla: [
        ['Síntoma cardinal',    'Cansancio, frío, constipación, bradipsiquia', 'Palpitaciones, calor, diarrea, nerviosismo'],
        ['FC',                  'Bradicardia',                                 'Taquicardia (FA si severo)'],
        ['Piel',                'Seca, pálida, mixedema, macroglosa',          'Caliente, sudorosa, fina'],
        ['Reflejo aquiliano',   'Relajación lenta ("hiporreflexia lenta")',     'Hiperreflexia'],
        ['TSH',                 'Alta (↑TSH = hipotiroidismo)',                 'Baja (↓TSH = hipertiroidismo)'],
        ['T4 libre',            'Baja',                                         'Alta'],
        ['Causa principal',     'Tiroiditis de Hashimoto, post-yodo, cirugía', 'Graves, bocio multinodular, adenoma tóxico'],
        ['Tratamiento',         'Levotiroxina',                                 'Metimazol, radioyodo, cirugía (Graves)'],
      ],
      oro: 'TSH alta = glándula insuficiente = hipotiroidismo (el cerebro grita). TSH baja = glándula autónoma = hipertiroidismo (el cerebro frenó).',
      trampas: ['Embarazo: medir TSH en 1er trimestre, meta <2.5 uUI/mL', 'Tormenta tiroidea: precipitada por cirugía, estrés, infección — tratamiento: PTU, propranolol, corticoides, ioduro', 'Tiroiditis postparto: puede dar hipertiroidismo transitorio antes del hipotiroidismo']
    },
    {
      id: 'bronquiolitis-asma-lactante', eje: 'Pediatría',
      titulo: 'Bronquiolitis vs Asma del lactante',
      tabla: [
        ['Edad',                'Primer episodio <2 años, peak 2-6 meses',    'Recurrente, cualquier edad >1 año'],
        ['Etiología',           'VSR (>80%), rhinovirus',                     'Atopia, desencadenantes'],
        ['Sibilancias',         'Primer episodio',                            '≥3 episodios o 1 severo con atopia'],
        ['Fiebre',              'Sí (viral)',                                  'No necesariamente'],
        ['Broncodilatadores',   'NO recomendados (sin beneficio en bronquiolitis)', 'SÍ — respuesta define asma'],
        ['Corticoides sistémicos','No indicados',                             'Sí en crisis moderada-severa'],
        ['Adrenalina nebulizada','Solo en casos seleccionados (hospitalizado)', 'No de rutina'],
        ['Hospitalización',     'SatO2 <92%, FR alta, dificultad alimentación', 'Crisis severa refractaria'],
      ],
      oro: 'Primer episodio de sibilancias en menor de 2 años = bronquiolitis → no dar broncodilatador. Si es el tercer episodio → asma del lactante → broncodilatador.',
      trampas: ['Adrenalina en bronquiolitis: estudios muestran beneficio a corto plazo pero no en outcomes al alta', 'Oxígeno si SatO2 <90% en bronquiolitis', 'Antibióticos no están indicados salvo sobreinfección bacteriana documentada']
    },
    {
      id: 'laringitis-epiglotitis', eje: 'Pediatría',
      titulo: 'Crup (Laringotraqueobronquitis) vs Epiglotitis',
      tabla: [
        ['Agente',              'Parainfluenza (VLP)',                         'H. influenzae tipo b (antes vacuna)'],
        ['Edad',                '6 meses - 3 años',                           '2-7 años (ahora raro por Hib)'],
        ['Estridor',            'Inspiratorio, tosido "perruno"',             'Inspiratorio, babeo, no tose'],
        ['Postura',             'Variable',                                   'Trípode — no puede acostarse'],
        ['Fiebre',              'Leve o moderada',                            'Alta, aspecto tóxico'],
        ['Inicio',              'Gradual, de noche',                          'Brusco, horas'],
        ['Radiografía cuello',  '"Signo del campanario" (subglótico)',        '"Signo del pulgar" (supraglótico)'],
        ['Tratamiento',         'Adrenalina nebulizada + dexametasona',       'Intubación + ceftriaxona IV'],
      ],
      oro: 'Niño que no puede tragar su saliva, en trípode, con aspecto tóxico = epiglotitis → no examinar la faringe, intubación inmediata.',
      trampas: ['En epiglotitis NO hacer laringoscopía sin equipo de intubación preparado', 'Crup: la dexametasona oral tiene igual eficacia que IV/IM', 'Score de Westley: mild (<3), moderate (3-5), severe (>5) → determina adrenalina + internación']
    },
    {
      id: 'placenta-previa-dppni', eje: 'Obstetricia',
      titulo: 'Placenta previa vs DPPNI',
      tabla: [
        ['Mecanismo',           'Placenta ocluye el orificio cervical',        'Desprendimiento prematuro de placenta normoinserta'],
        ['Sangrado',            'Rojo brillante, indoloro, repetitivo',        'Oscuro, coágulos, con dolor'],
        ['Dolor',               'Ausente ("hemorragia sin dolor")',            'Presente, abdomen en tabla (hipertonía)'],
        ['Útero',               'Relajado, feto en posición anormal',         'Hipertónico, doloroso, "leñoso"'],
        ['FCF',                 'Habitualmente normal',                        'Frecuente sufrimiento fetal / muerte fetal'],
        ['Coagulopatía',        'Rara',                                        'CID frecuente (liberación tromboplastina)'],
        ['Diagnóstico',         'Ecografía (NUNCA tacto vaginal)',             'Clínico + ecografía (descarta PP)'],
        ['Conducta',            'Cesárea si cubre OCI o >36 sem',             'Cesárea urgente si sufrimiento fetal'],
      ],
      oro: 'Hemorragia sin dolor = placenta previa. Hemorragia CON dolor + útero duro + sufrimiento fetal = DPPNI.',
      trampas: ['Nunca hacer tacto vaginal ante sospecha de placenta previa', 'DPPNI clase III: muerte fetal + CID — emergencia absoluta', 'Cocaína y trauma son factores precipitantes de DPPNI']
    },
    {
      id: 'rpm-termino-preterm', eje: 'Obstetricia',
      titulo: 'RPM a término vs RPM pretérmino',
      tabla: [
        ['Definición',          'Rotura de membranas antes del trabajo de parto', 'RPM antes de las 37 semanas'],
        ['Período de latencia', 'Inicio de trabajo de parto en <12h (90%)',      'Variable, puede ser días/semanas'],
        ['Objetivo',            'Evitar infección y prolapso de cordón',          'Prolongar embarazo vs riesgo de infección'],
        ['Corticoides',         'No indicados (pulmón maduro)',                   'SÍ si <34 semanas (maduración pulmonar)'],
        ['Antibióticos',        'SÍ — ampicilina o penicilina G (GBS profilaxis)', 'SÍ — eritromicina/ampicilina 7 días'],
        ['Tocolíticos',         'NO',                                              'Solo para completar corticoides (<34 sem)'],
        ['Conducta',            'Inducción si no inicia en 12-24h o signos de infección', 'Expectante si sin infección + monitoreo'],
      ],
      oro: 'RPM pretérmino <34 sem: corticoides + antibióticos + expectante. RPM pretérmino >34 sem: inducir. RPM a término: inducir en 12-24h.',
      trampas: ['Diagnóstico: pH vaginal (alcalino) + test de helecho + prueba de cristalización + amniotest', 'Corioamnionitis: fiebre + taquicardia materna y fetal + útero sensible → terminar embarazo sin importar edad gestacional', 'Temperatura materna >38°C en RPM = infección hasta demostrar lo contrario']
    },
    {
      id: 'hepatitis-b-marcadores', eje: 'Infectología',
      titulo: 'Hepatitis B: interpretación de marcadores serológicos',
      tabla: [
        ['Estado',              'HBsAg', 'Anti-HBs', 'Anti-HBc IgM', 'Anti-HBc IgG', 'HBeAg'],
        ['Infección aguda',     '+',      '-',          '+',           '-',            '+'],
        ['Infección crónica activa', '+', '-',          '-',           '+',            '+'],
        ['Portador inactivo',   '+',      '-',          '-',           '+',            '-'],
        ['Infección pasada (curada)', '-', '+',         '-',           '+',            '-'],
        ['Solo vacunado',       '-',      '+',          '-',           '-',            '-'],
        ['Ventana',             '-',      '-',          '+',           '-',            'variable'],
      ],
      oro: 'HBsAg+ = hay virus. Anti-HBs+ solo = vacuna exitosa. Anti-HBc+ sin HBsAg = infección pasada curada. Anti-HBc IgM+ = infección aguda.',
      trampas: ['Anti-HBc no aparece tras la vacuna (solo anti-HBs)', 'HBeAg + = alta replicación, muy contagioso; Anti-HBe+ = baja replicación (pero puede haber mutante precore)', 'Embarazada HBsAg+: vacunación + gammaglobulina al RN en las primeras 12 horas']
    },
    {
      id: 'derrame-pleural-light', eje: 'Neumología',
      titulo: 'Derrame pleural: trasudado vs exudado (Criterios de Light)',
      tabla: [
        ['Criterio',            'TRASUDADO',               'EXUDADO'],
        ['Proteínas DP/suero',  '<0.5',                    '≥0.5'],
        ['LDH DP/suero',        '<0.6',                    '≥0.6'],
        ['LDH en DP',           '<2/3 del límite normal sérico', '≥2/3 del límite normal'],
        ['Causa principal',     'IC, cirrosis, síndrome nefrótico', 'Infección, neoplasia, TEP, autoinmune'],
        ['Glucosa en DP',       'Normal (igual al plasma)', '<60 mg/dL en empiema, artritis reumatoidea, TBC'],
        ['pH en DP',            '>7.30',                   '<7.30 en empiema (toracostomía)'],
        ['Células en DP',       'Paucicelular',             'Neutrófilos (infección aguda), linfocitos (TBC, neoplasia)'],
      ],
      oro: 'Un solo criterio de Light que se cumpla → exudado (sensibilidad 98%). Los tres negativos → trasudado.',
      trampas: ['IC tratada con diuréticos: el derrame puede "falso-exudado" por concentración → medir gradiente de albúmina sérica-DP', 'Quilotórax: triglicéridos >110 mg/dL en DP', 'Empiema: pH <7.2 + glucosa baja → drenaje obligatorio']
    },
    {
      id: 'icc-eap', eje: 'Cardiología',
      titulo: 'ICC descompensada vs Edema Agudo de Pulmón (EAP)',
      tabla: [
        ['Fisiopatología',      'Congestión progresiva (días-semanas)',        'Redistribución aguda de líquido al alvéolo'],
        ['Inicio',              'Gradual',                                     'Brusco (minutos-horas)'],
        ['SatO2',               'Puede mantenerse >90% con O2 leve',           'Hipoxemia severa, espuma rosada'],
        ['Posición',            'Ortopnea (nocturna)',                         'No puede acostarse, sentado'],
        ['Crepitantes',         'Bases bilaterales',                           'Hasta campos medios y superiores'],
        ['Tratamiento',         'Diuréticos IV (furosemida), O2, vasodilatadores', 'O2 alto flujo + CPAP/BiPAP + furosemida IV + nitratos IV'],
        ['Morfina',             'No recomendada de rutina actualmente',        'Solo si ansiedad severa y sin hipotensión'],
        ['Intubación',          'Rara',                                        'Si CPAP falla o paro inminente'],
      ],
      oro: 'EAP = emergencia. Primera medida: posición sentada + O2 al 100% + furosemida IV 40-80 mg + nitratos si TA >100. CPAP si SatO2 <90% con O2.',
      trampas: ['Furosemida en EAP: el efecto venoso comienza antes que la diuresis (en 5-10 min)', 'Morfina en EAP: reduce ansiedad y precarga, pero puede deprimir el drive respiratorio', 'Nitratos contraindicados si TA <90 o uso de sildenafil en últimas 24-48h']
    },
    {
      id: 'sca-est-noest', eje: 'Cardiología',
      titulo: 'SCA con supradesnivel vs sin supradesnivel del ST',
      tabla: [
        ['ECG',                 'Supradesnivel ST ≥2mm en 2 derivaciones contiguas', 'Sin supradesnivel (puede tener infradesnivel, T negativas, normal)'],
        ['Diagnóstico',         'SCAEST — diagnóstico inmediato por ECG',      'SCASEST — requiere troponinas'],
        ['Oclusión',            'Total (trombo rojo)',                          'Parcial o suboclusiva'],
        ['Urgencia',            'Máxima — tiempo es músculo',                  'Alta pero permite estratificación'],
        ['Tratamiento',         'ICP primaria en <90 min (o <120 si traslado)', 'Estratificación por TIMI/GRACE → ICP <24h si alto riesgo'],
        ['Trombolíticos',       'Sí, si no hay ICP en <120 min',              'NO — no beneficio, pueden ser dañinos'],
        ['Antiagregación',      'AAS + ticagrelor o prasugrel',                'AAS + ticagrelor o clopidogrel + anticoagulante'],
      ],
      oro: 'SCAEST: cath-lab inmediato. SCASEST: heparina + doble antiagregación → ICP según riesgo. NO trombolizar SCASEST.',
      trampas: ['Tiempo puerta-balón <90 min para SCAEST en hospital con hemodinamia', 'SCAEST posterior (V7-V9): el ECG "normal" puede mostrar solo infradesnivel en V1-V3', 'Dolor precordial + Bloqueo de rama izquierda nuevo = equivalente a SCAEST']
    },
    {
      id: 'sepsis-sepsis3', eje: 'Infectología',
      titulo: 'Infección vs SIRS vs Sepsis vs Shock séptico (Sepsis-3)',
      tabla: [
        ['Criterio',            'Infección',                'SIRS (ya no se usa)',             'Sepsis',                           'Shock séptico'],
        ['Definición',          'Proceso infeccioso',       '2 de 4 criterios (SIRS)',          'Infección + disfunción orgánica',   'Sepsis + hipotensión + lactato >2'],
        ['Score',               '—',                        'Temperatura, FC, FR, leucos',      'SOFA ≥2 (o qSOFA ≥2)',              'SOFA ≥2 + vasopresores + lactato'],
        ['Mortalidad',          '<5%',                      'No predice mortalidad',            '>10%',                              '>40%'],
        ['Fluidos',             'Si necesita',              '—',                                '30 mL/kg en 3 horas',               '30 mL/kg + vasopresores si no responde'],
        ['Antibióticos',        'Si indicados',             '—',                                'En 1 hora (bundle de la hora)',     'Idealmente <1h tras toma de cultivos'],
        ['Vasopresores',        'No',                       'No',                               'Solo si hipotensión refractaria',    'Norepinefrina 1ra línea'],
      ],
      oro: 'Sepsis-3: abandona SIRS. Disfunción orgánica = sepsis. Hipotensión + lactato >2 + vasopresores = shock séptico. Antibiótico + fluidos en 1 hora.',
      trampas: ['qSOFA (bedside): ≥2 de FR≥22, alteración conciencia, PAS≤100 → sospecha sepsis', 'Lactato elevado sin hipotensión = shock séptico críptico', 'Norepinefrina es 1ra línea; vasopresina como segundo agente']
    },
    {
      id: 'itu-alta-baja', eje: 'Infectología',
      titulo: 'ITU baja (cistitis) vs ITU alta (pielonefritis)',
      tabla: [
        ['Localización',        'Vejiga (cistitis), uretra (uretritis)',       'Riñón y pelvis renal'],
        ['Fiebre',              'Ausente o subfebril (<38°C)',                  'SÍ (≥38°C), escalofríos'],
        ['Dolor',               'Suprapúbico, disuria, polaquiuria, urgencia', 'Lumbar (puñopercusión + en fosa renal)'],
        ['Urocultivo',          'Sí — E. coli >80%',                          'Sí — igual flora pero mayor resistencia'],
        ['PCR/GB',              'Normal o levemente elevada',                  'Elevada, leucocitosis'],
        ['Tratamiento',         'Fosfomicina 3g dosis única o nitrofurantoína 5-7d', 'Ceftriaxona IV (hospitalizada) o ciprofloxacino oral 14d (ambulatorio)'],
        ['Embarazo',            'Tratar siempre (incluso bacteriuria asintomática)', 'Hospitalizar, ceftriaxona'],
        ['Hombre',              'ITU complicada → descartar prostatitis',      'Siempre complicada → descartar obstrucción'],
      ],
      oro: 'Fiebre + dolor lumbar = pielonefritis → no alcanza fosfomicina. En embarazada tratar bacteriuria asintomática siempre.',
      trampas: ['Bacteriuria asintomática: solo tratar en embarazo y previo a urología invasiva', 'Prostatitis: fluoroquinolonas 4-6 semanas (alta penetración prostática)', 'Recurrencia en mujer joven sexual activa: profilaxis post-coital con fosfomicina o nitrofurantoína']
    },
    {
      id: 'pap-colposcopia', eje: 'Ginecología',
      titulo: 'PAP alterado: algoritmo de manejo (LIEBG vs LIEAG)',
      tabla: [
        ['Resultado',           'Acción inicial',                              'Seguimiento'],
        ['Normal',              'Repetir cada 3 años (≥25 años)',              'Continuar rastreo habitual'],
        ['ASCUS',               'Test VPH de refuerzo o repetir PAP en 6-12m', 'Si VPH+: colposcopía'],
        ['ASC-H',               'Colposcopía directa',                         'No esperar VPH'],
        ['LIEBG (NIC I)',        'Colposcopía + biopsia',                       'Si confirma NIC I: seguimiento 2 años sin tratar'],
        ['LIEAG (NIC II-III)',   'Colposcopía + biopsia + LEEP/conización',     'Tratamiento activo'],
        ['Carcinoma invasor',    'Biopsia urgente + estadificación',            'Oncología'],
        ['Endocervical/AGC',     'Colposcopía + curetaje endocervical',         'Descartar lesión de canal'],
      ],
      oro: 'ASCUS sin VPH → control. ASCUS con VPH+ o cualquier ASC-H o LIEBG/LIEAG → colposcopía. NIC I: observar. NIC II-III: tratar.',
      trampas: ['LEEP no es lo mismo que conización fría — LEEP cura y diagnostica a la vez', 'HPV 16 y 18 = mayor riesgo de NIC III y CaCu (vacuna cubre estos)', 'Inicio de rastreo: Argentina MSAL recomienda desde los 25 años, PAP + VPH cada 3-5 años']
    },
    {
      id: 'anemia-ferropenica-b12', eje: 'Hematología',
      titulo: 'Anemia ferropénica vs Anemia megaloblástica (B12/Folato)',
      tabla: [
        ['VCM',                 'Microcítica (<80 fl)',                        'Macrocítica (>100 fl)'],
        ['HCM',                 'Baja (hipocrómica)',                          'Normal o alta'],
        ['Ferritina',           'Baja (<12 ng/mL)',                            'Normal o alta'],
        ['Hierro sérico',       'Bajo',                                        'Normal'],
        ['Transferrina/TIBC',   'Alta',                                        'Normal'],
        ['Reticulocitos',       'Bajos (regeneración insuficiente)',            'Bajos'],
        ['Frotis',              'Glóbulos pequeños, hipocromos, anulocitos',   'Macroovalocitos, neutrófilos hipersegmentados'],
        ['Síntomas neurológicos','No',                                          'SÍ si es por B12 (subaguda medular combinada)'],
        ['Tratamiento',         'Hierro oral 3-6 meses',                       'B12 IM o folato oral (según causa)'],
      ],
      oro: 'Anemia + neutrófilos hipersegmentados = megaloblástica. Anemia + microcitosis + ferritina baja = ferropénica.',
      trampas: ['B12 baja + folato normal → dar solo B12 (dar folato solo en déficit B12 puede precipitar neuropatía)', 'Anemia perniciosa: causa autoinmune de déficit B12 (anticuerpos contra factor intrínseco)', 'En embarazo: anemia ferropénica es la más frecuente; dar hierro 60 mg/día desde el 1er control']
    },
    {
      id: 'sop-criteria', eje: 'Ginecología',
      titulo: 'SOP: criterios diagnósticos y diagnósticos diferenciales',
      tabla: [
        ['Criterios Rotterdam (2 de 3)', '1. Oligo/anovulación', '2. Hiperandrogenismo clínico/bioquímico', '3. Ovarios poliquísticos en eco (≥12 folículos 2-9mm o Vol >10cc)'],
        ['Diagnóstico diferencial', 'Hiperplasia suprarrenal congénita (HSC)', 'Hiperprolactinemia', 'Síndrome de Cushing'],
        ['Descartado con',       '17-OHprogesterona (HSC)',                   'Prolactina sérica',                 'Cortisol libre en orina o Test 1mg dexametasona'],
        ['LH/FSH en SOP',        'LH elevada, FSH normal → relación LH/FSH >2',  '—',                             '—'],
        ['Insulinorresistencia', 'Presente en 65-80% de SOP',                 '—',                                 '—'],
        ['1ra línea tto',        'ACO (si no desea embarazo) + cambio estilo de vida', 'Metformina si IR o DM2',  'Inductores de ovulación si desea embarazo'],
      ],
      oro: 'SOP = diagnóstico de exclusión. Siempre descartar HSC (17-OHP), hiperprolactinemia y Cushing antes de hacer el diagnóstico.',
      trampas: ['Ovarios poliquísticos en eco SIN oligo-anovulación NI hiperandrogenismo NO es SOP', 'Metformina en SOP: mejora la IR y puede inducir ovulación, pero no es anticonceptivo', 'El anti-DHT (espironolactona) es útil para el hirsutismo en SOP']
    },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // CASOS CLÍNICOS PROGRESIVOS
  // ═══════════════════════════════════════════════════════════════════
  const CASOS = [
    {
      id: 'caso1', eje: 'Neumología',
      titulo: 'Disnea en varón tabaquista de 62 años',
      pasos: [
        { texto: 'Varón de 62 años tabaquista de 40 paquetes/año. Consulta por disnea de esfuerzo progresiva desde hace 3 años. No refiere fiebre. En el examen: hipofonesis generalizada, espiración prolongada.', pregunta: '¿Cuál es tu primera hipótesis diagnóstica?' },
        { texto: 'Espirometría post-broncodilatador: VEF1/CVF = 0.62, VEF1 = 55% del predicho. Reversibilidad con broncodilatador: +8% (no significativa).', pregunta: '¿Qué diagnóstico confirma la espirometría? ¿Cuál es la gravedad según GOLD?' },
        { texto: 'Durante la consulta el paciente refiere que en los últimos 3 meses tuvo 2 episodios de mayor disnea con tos productiva que requirieron antibióticos. Actualmente la disnea le impide caminar más de 100 metros.', pregunta: '¿Cómo cambia el manejo con estos datos? ¿Qué grupo GOLD-ABCD es?' },
        { texto: 'La gasometría arterial muestra PaO2 = 58 mmHg, PaCO2 = 48 mmHg, pH 7.38 en reposo.', pregunta: '¿Está indicada la oxigenoterapia crónica domiciliaria? ¿Con qué criterios?' },
      ],
      diagnostico: 'EPOC moderado-grave (GOLD 2), grupo E (alta sintomatología + ≥2 exacerbaciones). Oxigenoterapia: SÍ, PaO2 ≤55 mmHg en reposo o PaO2 ≤60 con cor pulmonale/poliglobulia.',
      perla: 'GOLD 2024 unifica grupos C y D en "E". El criterio de oxigenoterapia es PaO2 ≤55 o ≤60 con complicaciones. La oxigenoterapia en EPOC: mínimo 15-16 horas/día para reducir mortalidad.'
    },
    {
      id: 'caso2', eje: 'Obstetricia',
      titulo: 'Embarazada de 32 semanas con cefalea',
      pasos: [
        { texto: 'Gestante de 26 años, embarazo de 32 semanas, primigesta. Concurre a guardia por cefalea intensa frontal de inicio hace 2 horas. Sin antecedentes de HTA previa.', pregunta: '¿Cuáles son los diagnósticos que tenés que descartar?' },
        { texto: 'TA: 162/108 mmHg. FC: 94 lpm. Tira reactiva en orina: proteínas ++. Sin alteraciones visuales. Sin dolor epigástrico. Reflejos normales.', pregunta: '¿Cuál es el diagnóstico? ¿Es criterio de severidad?' },
        { texto: 'Se inicia sulfato de magnesio EV. La TA no desciende con nifedipina 10 mg. Se agrega labetalol EV.', pregunta: '¿Por qué usás sulfato de magnesio? ¿Cuáles son los signos de toxicidad que tenés que monitorear?' },
        { texto: 'A pesar del tratamiento, la TA se mantiene en 175/115. El feto muestra FCF de 158 lpm, sin desaceleraciones. El cuello uterino está cerrado.', pregunta: '¿Cuál es la conducta obstétrica definitiva en una preeclampsia severa de 32 semanas?' },
      ],
      diagnostico: 'Preeclampsia con criterios de severidad (TA ≥160/110 + proteinuria). Conducta: corticoides (betametasona 12mg c/24h x2 dosis para maduración pulmonar) + sulfato de magnesio + estabilización → interrupción del embarazo (cesárea o inducción según condiciones).',
      perla: 'El sulfato de magnesio NO es antihipertensivo — es neuroprotector (previene eclampsia). Toxicidad: pérdida de reflejos rotulianos (primer signo), luego paro respiratorio. Antídoto: gluconato de calcio IV.'
    },
    {
      id: 'caso3', eje: 'Pediatría',
      titulo: 'Lactante de 3 meses con dificultad respiratoria',
      pasos: [
        { texto: 'Lactante de 3 meses, sin antecedentes. Diciembre. Consulta por rinitis y dificultad para respirar de 2 días de evolución. Fiebre de 38.2°C.', pregunta: '¿Cuál es tu primera hipótesis? ¿Qué datos de la anamnesis necesitás?' },
        { texto: 'Examen: FR 58 rpm, SatO2 93%, tiraje subcostal, sibilancias y crepitantes difusos. Auscultación: espiración prolongada y subcrepitantes bilaterales.', pregunta: '¿Cuál es la gravedad de este cuadro? ¿Cuál es el puntaje que usarías?' },
        { texto: 'Un estudiante de medicina propone administrar salbutamol nebulizado y corticoides sistémicos.', pregunta: '¿Estás de acuerdo? ¿Por qué sí o por qué no?' },
        { texto: 'Con O2 suplementario a 0.5 L/min la SatO2 sube a 95%. Tolera la lactancia aunque con dificultad. No hay apneas.', pregunta: '¿Internás o dás el alta? ¿Cuáles son los criterios de hospitalización?' },
      ],
      diagnostico: 'Bronquiolitis moderada (VSR probable). Broncodilatadores y corticoides: NO indicados (evidencia no los respalda en bronquiolitis). Tratamiento: O2 para SatO2 ≥90%, aspiración de secreciones, alimentación fraccionada. Hospitalización si SatO2 <90%, apneas, FR >70, dificultad para alimentarse.',
      perla: 'La bronquiolitis es el primer episodio en <2 años. Si tiene ≥3 episodios o es mayor de 2 años → pensar asma del lactante → broncodilatadores sí. En bronquiolitis: la adrenalina nebulizada puede usarse en hospitalizado pero no cambia el alta ni la evolución.'
    },
    {
      id: 'caso4', eje: 'Infectología',
      titulo: 'Hombre de 34 años con úlcera genital',
      pasos: [
        { texto: 'Hombre de 34 años, activo sexualmente con múltiples parejas. Consulta por úlcera genital de una semana de evolución. Refiere que al inicio "era solo una ronchas".', pregunta: '¿Cuáles son los diagnósticos que considerás?' },
        { texto: 'Al examen: úlcera única en glande, de bordes indurados, base limpia, indolora. Adenopatía inguinal bilateral indolora y dura.', pregunta: '¿Cuál es el diagnóstico más probable? ¿Qué laboratorio pedís?' },
        { texto: 'VDRL 1/32 reactivo. FTA-ABS positivo. HIV negativo.', pregunta: '¿Qué estadio es? ¿Qué tratamiento indicás?' },
        { texto: 'El paciente refiere que su pareja sexual también tiene lesiones cutáneas diseminadas, con lesiones palmares y plantares, y pérdida de cabello en parches.', pregunta: '¿Qué tiene la pareja? ¿Es el mismo tratamiento?' },
      ],
      diagnostico: 'Paciente: sífilis primaria (chancro indoloro + adenopatías). Tratamiento: penicilina G benzatínica 2.400.000 UI IM dosis única. Pareja: sífilis secundaria (rash palmo-plantar + alopecia en parches). Tratamiento: igual (1 dosis).',
      perla: 'Rash palmo-plantar = sífilis hasta que se demuestre lo contrario. En alergia a penicilina NO embarazada: doxiciclina 14 días. En embarazada con alergia: desensibilizar y dar penicilina siempre.'
    },
    {
      id: 'caso5', eje: 'Cardiología',
      titulo: 'Varón de 58 años con dolor torácico',
      pasos: [
        { texto: 'Varón de 58 años, hipertenso, diabético, fumador. Llega a guardia con dolor precordial opresivo irradiado a mandíbula de 2 horas de evolución. Sudoración profusa.', pregunta: '¿Cuál es tu diagnóstico presuntivo? ¿Qué pedís de inmediato?' },
        { texto: 'ECG: supradesnivel del ST de 3mm en V1-V4 con imagen en espejo en cara inferior. TA: 105/70. FC: 112 lpm. SatO2: 95%.', pregunta: '¿Cuál es el diagnóstico definitivo y el territorio comprometido? ¿Cuál es la conducta inmediata?' },
        { texto: 'El hospital no tiene hemodinamia. El traslado al centro con cath-lab tarda 3 horas.', pregunta: '¿Cuál es la estrategia de reperfusión? ¿Cuándo está indicada la trombolisis?' },
        { texto: 'Se administra tenecteplase. A los 90 minutos el dolor cedió y el supradesnivel bajó al 50% del basal. 30 minutos después aparecen extrasístoles ventriculares frecuentes.', pregunta: '¿Reperfundió? ¿Qué son esas arritmias? ¿Tratás?' },
      ],
      diagnostico: 'SCAEST anterior extenso (DA proximal). Si traslado >120 min: trombolíticos (tenecteplase EV). Criterios de reperfusión: descenso ST ≥50% + cese del dolor + arritmias de reperfusión (idioventricular acelerado). Las arritmias de reperfusión NO SE TRATAN — son marcador de éxito.',
      perla: 'Arritmias de reperfusión = ritmo idioventricular acelerado (RIVA). Es benigno, no requiere tratamiento. Tratarlo con antiarrítmicos puede ser peor. Tiempo puerta-aguja (trombolítico): <30 min. Tiempo puerta-balón: <90 min.'
    },
  ];

  // ═══════════════════════════════════════════════════════════════════
  // ESTADO DE SESIÓN DEL MODO COMPRENSIÓN
  // ═══════════════════════════════════════════════════════════════════
  let activeTab = 'confusiones';
  let activeCasoId = null;
  let activeCasoStep = 0;
  let activePar = null;

  function loadBucleState() {
    try { return JSON.parse(localStorage.getItem('bi2-ss') || '{}'); } catch(_){ return {}; }
  }
  function saveBucleState(ss) {
    localStorage.setItem('bi2-ss', JSON.stringify(ss));
    localStorage.setItem('bi2-last', new Date().toISOString());
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONSTRUIR LA VISTA COMPRENSIÓN EN EL DOM
  // ═══════════════════════════════════════════════════════════════════
  function buildView() {
    const existing = $('#comprensionView');
    if (existing) return;

    const main = $('main') || document.body;
    const section = document.createElement('section');
    section.id = 'comprensionView';
    section.className = 'view hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8';
    section.innerHTML = `
      <div class="max-w-3xl mx-auto">
        <div class="mb-6">
          <p class="text-xs font-black uppercase tracking-[.18em] text-violet-600 dark:text-violet-300">Modo comprensión</p>
          <h2 class="mt-1 font-display text-3xl font-extrabold">Entendé antes de memorizar</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 max-w-2xl">
            Confusiones frecuentes del banco histórico, casos clínicos paso a paso, y prompts para trabajar con IA. Sin salir de la app.
          </p>
        </div>

        <!-- TABS -->
        <div class="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-0">
          <button id="tabConfusiones" class="mc-tab mc-tab-active shrink-0 pb-3 px-1 text-sm font-bold border-b-2" onclick="comprensionTab('confusiones')">Confusiones frecuentes</button>
          <button id="tabCasos" class="mc-tab shrink-0 pb-3 px-1 text-sm font-bold border-b-2 border-transparent" onclick="comprensionTab('casos')">Casos progresivos</button>
          <button id="tabHuecos" class="mc-tab shrink-0 pb-3 px-1 text-sm font-bold border-b-2 border-transparent" onclick="comprensionTab('huecos')">Mis huecos + IA prompt</button>
        </div>

        <!-- TAB CONFUSIONES -->
        <div id="panelConfusiones">
          <div class="mb-4 flex flex-wrap gap-2" id="confEjes"></div>
          <div id="confList"></div>
        </div>

        <!-- TAB CASOS -->
        <div id="panelCasos" class="hidden">
          <div class="grid gap-3 sm:grid-cols-2 mb-6" id="casosList"></div>
          <div id="casoActivo" class="hidden"></div>
        </div>

        <!-- TAB HUECOS (Bucle Infinito integrado) -->
        <div id="panelHuecos" class="hidden">
          <div class="rounded-[1.5rem] border border-violet-200 bg-violet-50/50 dark:border-violet-900/50 dark:bg-violet-950/20 p-4 mb-5">
            <p class="text-xs font-black uppercase tracking-[.16em] text-violet-700 dark:text-violet-300 mb-1">Cómo funciona</p>
            <p class="text-sm leading-6 text-slate-600 dark:text-slate-400">
              El sistema detecta tus sprints con mayor cantidad de errores o menor cobertura y genera un prompt listo para pegar en Claude o Gemini. El prompt incluye el protocolo de 3 niveles: mecanismo → trampas → conexiones.
            </p>
          </div>
          <div id="huecosRanking"></div>
        </div>
      </div>
    `;

    // Insertar antes del cierre del main
    const mainEl = $('main');
    if (mainEl) mainEl.appendChild(section);
    else document.body.appendChild(section);
  }

  // ═══════════════════════════════════════════════════════════════════
  // RENDER CONFUSIONES
  // ═══════════════════════════════════════════════════════════════════
  function renderConfusiones(filtroEje) {
    const ejes = [...new Set(CONFUSIONES.map(c => c.eje))].sort();
    const ejesEl = $('#confEjes');
    if (ejesEl) {
      ejesEl.innerHTML = [
        `<button class="text-xs px-3 py-1.5 rounded-full font-bold border transition ${!filtroEje ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 hover:border-violet-300 dark:border-slate-700'}" onclick="renderConfusiones(null)">Todos</button>`,
        ...ejes.map(eje => `<button class="text-xs px-3 py-1.5 rounded-full font-bold border transition ${filtroEje===eje ? 'bg-violet-600 text-white border-violet-600' : 'border-slate-200 hover:border-violet-300 dark:border-slate-700'}" onclick="renderConfusiones('${eje}')">${eje}</button>`)
      ].join('');
    }

    const lista = filtroEje ? CONFUSIONES.filter(c => c.eje === filtroEje) : CONFUSIONES;
    const listEl = $('#confList');
    if (!listEl) return;

    listEl.innerHTML = lista.map(c => `
      <details class="mc-par mb-3 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden" id="par-${c.id}">
        <summary class="flex items-center gap-3 px-5 py-4 cursor-pointer list-none">
          <span class="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">${E(c.eje)}</span>
          <h3 class="flex-1 font-display text-lg font-extrabold">${E(c.titulo)}</h3>
          <span class="text-slate-400 mc-chevron text-sm">▸</span>
        </summary>
        <div class="px-5 pb-5">
          <div class="overflow-x-auto mb-4">
            <table class="w-full text-xs border-collapse">
              <thead>
                <tr>
                  ${c.tabla[0] ? c.tabla[0].map((_, i) => `<th class="text-left py-2 px-3 bg-slate-50 dark:bg-slate-950/60 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 ${i===0?'w-32':''}">${i===0?'':'</th><th class="py-2 px-3 bg-violet-50 dark:bg-violet-950/30 font-black text-violet-700 dark:text-violet-300 border-b border-slate-200 dark:border-slate-800">'+E(c.titulo.split(' vs ')[i-1] || c.tabla[0][i] || '')}`.replace(/(<th.*?)<\/th><th/,'$1</th><th')).join('') : ''}
                </tr>
              </thead>
              <tbody>
                ${c.tabla.map((fila, ri) => `
                  <tr class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-950/40">
                    ${fila.map((celda, ci) => `<td class="py-2 px-3 text-sm leading-5 ${ci===0?'font-bold text-slate-500 dark:text-slate-400':ci===1?'text-slate-700 dark:text-slate-300':'text-slate-700 dark:text-slate-300'}">${E(celda)}</td>`).join('')}
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div class="rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 mb-3">
            <p class="text-xs font-black uppercase tracking-[.14em] text-amber-700 dark:text-amber-300 mb-1">Regla de oro · Examen</p>
            <p class="text-sm leading-6 font-semibold text-amber-900 dark:text-amber-100">${E(c.oro)}</p>
          </div>
          <div>
            <p class="text-xs font-black uppercase tracking-[.14em] text-slate-400 mb-2">Trampas del banco histórico</p>
            ${c.trampas.map(t => `<div class="flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-400 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"><span class="text-rose-400 shrink-0">⚠</span>${E(t)}</div>`).join('')}
          </div>
        </div>
      </details>`
    ).join('');
  }
  window.renderConfusiones = renderConfusiones;

  // ═══════════════════════════════════════════════════════════════════
  // RENDER CASOS CLÍNICOS
  // ═══════════════════════════════════════════════════════════════════
  function renderCasosList() {
    const el = $('#casosList');
    if (!el) return;
    el.innerHTML = CASOS.map(c => `
      <button class="text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-violet-300 dark:hover:border-violet-700 transition" onclick="abrirCaso('${c.id}')">
        <p class="text-xs text-slate-400 font-bold mb-1">${E(c.eje)}</p>
        <h3 class="font-display font-extrabold leading-tight">${E(c.titulo)}</h3>
        <p class="text-xs text-slate-500 mt-2">${c.pasos.length} pasos · razonamiento diferencial</p>
      </button>`
    ).join('');
  }

  window.abrirCaso = function(id) {
    activeCasoId = id;
    activeCasoStep = 0;
    const el = $('#casosList');
    if (el) el.classList.add('hidden');
    renderCasoActivo();
  };

  function renderCasoActivo() {
    const caso = CASOS.find(c => c.id === activeCasoId);
    if (!caso) return;
    const el = $('#casoActivo');
    if (!el) return;
    el.classList.remove('hidden');
    const paso = caso.pasos[activeCasoStep];
    const isLast = activeCasoStep >= caso.pasos.length - 1;

    el.innerHTML = `
      <div class="flex items-center gap-3 mb-5">
        <button class="text-sm font-bold text-slate-500 hover:text-slate-700" onclick="volverCasos()">← Casos</button>
        <span class="text-slate-300 dark:text-slate-700">|</span>
        <p class="text-xs font-bold text-slate-400">${E(caso.eje)} · ${E(caso.titulo)}</p>
      </div>
      <div class="flex gap-1 mb-5">
        ${caso.pasos.map((_, i) => `<div class="h-1.5 flex-1 rounded-full ${i<=activeCasoStep?'bg-violet-500':'bg-slate-200 dark:bg-slate-800'}"></div>`).join('')}
      </div>
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 mb-4">
        <p class="text-xs font-black uppercase tracking-[.14em] text-slate-400 mb-3">Paso ${activeCasoStep+1} de ${caso.pasos.length}</p>
        <p class="text-base leading-7 mb-4">${E(paso.texto)}</p>
        <div class="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/50 px-4 py-3">
          <p class="text-sm font-black text-violet-700 dark:text-violet-300">${E(paso.pregunta)}</p>
        </div>
      </div>
      ${!isLast ? `
        <button class="w-full rounded-2xl bg-violet-600 text-white py-3.5 text-sm font-black hover:bg-violet-700 transition" onclick="siguientePaso()">
          Revelar siguiente dato →
        </button>` : `
        <div class="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-5 mb-4">
          <p class="text-xs font-black uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300 mb-2">Diagnóstico y conducta</p>
          <p class="text-sm leading-6 text-emerald-900 dark:text-emerald-100">${E(caso.diagnostico)}</p>
        </div>
        <div class="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-5 mb-4">
          <p class="text-xs font-black uppercase tracking-[.14em] text-amber-700 dark:text-amber-300 mb-2">Perla del examen</p>
          <p class="text-sm leading-6 text-amber-900 dark:text-amber-100">${E(caso.perla)}</p>
        </div>
        <button class="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition" onclick="volverCasos()">
          Ver otro caso
        </button>`}
    `;
  }

  window.siguientePaso = function() {
    const caso = CASOS.find(c => c.id === activeCasoId);
    if (!caso) return;
    if (activeCasoStep < caso.pasos.length - 1) {
      activeCasoStep++;
      renderCasoActivo();
    }
  };

  window.volverCasos = function() {
    activeCasoId = null;
    activeCasoStep = 0;
    const lista = $('#casosList');
    const activo = $('#casoActivo');
    if (lista) lista.classList.remove('hidden');
    if (activo) activo.classList.add('hidden');
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER HUECOS (Bucle integrado)
  // ═══════════════════════════════════════════════════════════════════
  function renderHuecos() {
    const el = $('#huecosRanking');
    if (!el) return;

    const ss = loadBucleState();
    let sprints = [];
    try {
      if (typeof QUESTIONS !== 'undefined' && typeof SPRINTS !== 'undefined') {
        sprints = SPRINTS.map(sp => {
          const qs = sp.questions || QUESTIONS.filter(q => q.sprint_id === sp.id || q.sprint === sp.sprint);
          const answered = qs.filter(q => state?.answers?.[q.id]).length;
          const ok = qs.filter(q => { const a = state?.answers?.[q.id]; return a && a.selected === q.ans; }).length;
          const mistakes = qs.filter(q => state?.mistakes?.[q.id]).length;
          const total = qs.length;
          const cov = total ? Math.round(answered/total*100) : 0;
          const acc = answered ? Math.round(ok/answered*100) : 0;
          const risk = (mistakes*8) + Math.max(0,70-acc) + Math.max(0,40-cov)*0.5;
          return { id:sp.id, name:sp.sprint, eje:sp.eje, total, answered, ok, mistakes, cov, acc, risk, status: ss[sp.id]||0 };
        }).sort((a,b) => b.risk - a.risk).slice(0, 8);
      }
    } catch(_){}

    const STATUS_LABELS = ['Sin trabajar','En progreso','Nodo listo','Dominado'];
    const STATUS_COLORS = ['bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400','bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300','bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300','bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'];

    if (!sprints.length) {
      el.innerHTML = '<div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center"><p class="text-sm text-slate-500">Respondé algunas preguntas en la app para que el sistema detecte tus huecos.</p></div>';
      return;
    }

    el.innerHTML = sprints.map(sp => {
      const prompt = buildBuclePrompt(sp);
      return `
      <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 mb-3">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-slate-400 font-bold">${E(sp.eje)}</p>
            <h3 class="font-display font-extrabold leading-tight">${E(sp.name)}</h3>
            <p class="text-xs text-slate-500 mt-1">${sp.answered}/${sp.total} respondidas · ${sp.acc}% acierto · ${sp.mistakes} errores</p>
          </div>
          <select class="text-xs rounded-xl border border-slate-200 dark:border-slate-700 px-2 py-1.5 bg-white dark:bg-slate-950 shrink-0" onchange="updateBucleStatus('${sp.id}',this.value)">
            ${STATUS_LABELS.map((l,i)=>`<option value="${i}" ${sp.status===i?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>
        <details class="mt-2">
          <summary class="text-xs font-black text-violet-700 dark:text-violet-300 cursor-pointer">Ver prompt para IA →</summary>
          <div class="mt-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-3">
            <textarea class="w-full bg-transparent text-xs font-mono leading-5 resize-none text-slate-600 dark:text-slate-400 outline-none" rows="8" readonly>${E(prompt)}</textarea>
            <button class="mt-2 text-xs font-black text-violet-700 dark:text-violet-300 hover:underline" onclick="copiarPrompt('${sp.id}','${E(sp.name).replace(/'/g,"\\'")}',${sp.total},${sp.answered},${sp.acc},${sp.mistakes})">
              Copiar prompt
            </button>
          </div>
        </details>
      </div>`;
    }).join('');
  }

  window.updateBucleStatus = function(id, val) {
    const ss = loadBucleState();
    ss[id] = parseInt(val);
    saveBucleState(ss);
    renderHuecos();
  };

  window.copiarPrompt = function(id, name, total, answered, acc, mistakes) {
    const sp = { id, name, total, answered, acc, mistakes };
    const txt = buildBuclePrompt(sp);
    navigator.clipboard?.writeText(txt)
      .then(() => alert('Prompt copiado. Pegalo en Claude, ChatGPT o Gemini.'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = txt;
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        alert('Prompt copiado.');
      });
  };

  function buildBuclePrompt(sp) {
    return `[ESTUDIO PROFUNDO · ${sp.id}] ${sp.name}

Datos de práctica:
- Respondidas: ${sp.answered}/${sp.total}
- Acierto: ${sp.acc}%
- Errores activos: ${sp.mistakes}

Protocolo de 3 niveles — seguilo en orden:

NIVEL 1 · MECANISMO NÚCLEO
Explicame el tema desde cero, orientado al examen argentino de residencia médica 2026. Necesito:
(a) La idea madre que organiza todo el sprint en una frase.
(b) Los 3 conceptos más preguntados en el banco histórico 2016-2025.
(c) Una regla de oro para recordarlo bajo presión de examen.

NIVEL 2 · TRAMPAS DEL BANCO HISTÓRICO
Las 3 principales trampas en preguntas de este tema. Para cada una: qué dice la opción incorrecta atractiva, por qué parece correcta y por qué no lo es.

NIVEL 3 · CONEXIONES TRANSVERSALES
2-3 conexiones con otros temas del examen argentino, con razonamiento clínico explícito de por qué se relacionan.

CIERRE
Haceme 5 preguntas orales de recuperación activa sobre este tema. Después una mini-tabla "No confundir con" con el diagnóstico diferencial más peligroso de este sprint.`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // NAVEGACIÓN DE TABS
  // ═══════════════════════════════════════════════════════════════════
  window.comprensionTab = function(tab) {
    activeTab = tab;
    ['confusiones','casos','huecos'].forEach(t => {
      const btn = $(`#tab${t.charAt(0).toUpperCase()+t.slice(1)}`);
      const panel = $(`#panel${t.charAt(0).toUpperCase()+t.slice(1)}`);
      const isActive = t === tab;
      if (btn) {
        btn.className = `mc-tab shrink-0 pb-3 px-1 text-sm font-bold border-b-2 ${isActive ? 'mc-tab-active border-violet-600 text-violet-700 dark:text-violet-300' : 'border-transparent text-slate-500 hover:text-slate-700'}`;
      }
      if (panel) panel.classList.toggle('hidden', !isActive);
    });

    if (tab === 'confusiones') renderConfusiones(null);
    if (tab === 'casos') renderCasosList();
    if (tab === 'huecos') renderHuecos();
  };

  // ═══════════════════════════════════════════════════════════════════
  // INTEGRACIÓN AL SIDEBAR Y NAVEGACIÓN
  // ═══════════════════════════════════════════════════════════════════
  function integrarSidebar() {
    // Eliminar el botón de Cognitive Mode flotante si existe
    const cogBtn = $('.cog-btn');
    if (cogBtn) cogBtn.remove();
    const cogPanel = $('.cog-panel');
    if (cogPanel) cogPanel.remove();

    // Reemplazar el botón ♾️ del sidebar por uno que llama a showView nativo
    const bucleBtn = $('#bucleNavBtn');
    if (bucleBtn) {
      bucleBtn.id = 'comprensionNavBtn';
      bucleBtn.dataset.nav = 'comprension';
      bucleBtn.innerHTML = '🧠 Modo comprensión';
      bucleBtn.className = 'navBtn w-full rounded-2xl px-4 py-3 text-left text-sm font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50';
      bucleBtn.onclick = () => showView('comprension');
    } else {
      // Crear el botón si no existe
      const nav = $('aside nav.space-y-2') || $('nav.space-y-2');
      if (!nav || $('#comprensionNavBtn')) return;
      const btn = document.createElement('button');
      btn.id = 'comprensionNavBtn';
      btn.type = 'button';
      btn.dataset.nav = 'comprension';
      btn.className = 'navBtn w-full rounded-2xl px-4 py-3 text-left text-sm font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50';
      btn.textContent = '🧠 Modo comprensión';
      btn.onclick = () => showView('comprension');
      const learnBtn = $('[data-nav="learn"]', nav);
      if (learnBtn && learnBtn.nextSibling) nav.insertBefore(btn, learnBtn.nextSibling);
      else nav.appendChild(btn);
    }
  }

  // Sobreescribir openBucleInfinito para que NO abra página separada
  window.openBucleInfinito = function() { showView('comprension'); setTimeout(() => comprensionTab('huecos'), 80); };
  window.openBucleHub    = function() { showView('comprension'); setTimeout(() => comprensionTab('huecos'), 80); };

  // Agregar 'comprension' al mapa de títulos de showView si existe
  setTimeout(() => {
    try {
      // Parchear el objeto de títulos en main.js
      const origShowView = window.showView;
      if (typeof origShowView === 'function' && !window.__v361_showView_patched__) {
        window.__v361_showView_patched__ = true;
        const _orig = origShowView;
        window.showView = function(name) {
          _orig(name);
          if (name === 'comprension') {
            setTimeout(() => {
              const view = $('#comprensionView');
              if (view) {
                // Asegurar que sea visible
                view.classList.remove('hidden');
                // Inicializar la tab activa
                comprensionTab(activeTab || 'confusiones');
              }
            }, 30);
          }
        };
      }
    } catch(_){}
  }, 800);

  // ═══════════════════════════════════════════════════════════════════
  // CSS DE MODO COMPRENSIÓN (inyectado inline)
  // ═══════════════════════════════════════════════════════════════════
  function injectStyles() {
    if ($('#v361styles')) return;
    const style = document.createElement('style');
    style.id = 'v361styles';
    style.textContent = `
      .mc-tab { color: var(--color-text-secondary, #64748b); transition: color .15s; }
      .mc-tab-active { color: #7c3aed; border-color: #7c3aed !important; }
      .dark .mc-tab-active { color: #a78bfa; border-color: #a78bfa !important; }
      .mc-par summary::-webkit-details-marker { display: none; }
      .mc-par[open] .mc-chevron { transform: rotate(90deg); }
      .mc-chevron { transition: transform .2s; display: inline-block; }
      .mc-par summary { outline: none; }
      .mc-par table { font-size: 12px; }
      .mc-par table th:first-child { min-width: 100px; }
    `;
    document.head.appendChild(style);
  }

  // ═══════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════
  function init() {
    injectStyles();
    buildView();
    integrarSidebar();
    // Renderizar la tab inicial
    renderConfusiones(null);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 700));
  } else {
    setTimeout(init, 700);
  }

  console.log('%c[ResidenciAPP v36.1]', 'color:#7c3aed;font-weight:bold',
    'Modo comprensión · 24 pares de confusiones · 5 casos progresivos · Bucle integrado');
})();
