# Sistema de estudio — Residencia Médica Argentina 2026

**CABA · Examen Integrador** · 974 preguntas históricas · 35 sprints · 4 ejes

## Estructura del proyecto

```
residencia-2026/
├── index.html                          ← Hub central (empezar acá)
├── bucle_infinito_2.html               ← Sistema Bucle Infinito 2.0
├── mapa_banco_real_4_ejes.html         ← Mapa del banco: 974 preg / 4 ejes
├── clasificacion_clinica_adultos_525.html
├── clasificacion_ginecologia_98_sprints.html
├── clasificacion_obstetricia_88_sprints.html
├── clasificacion_pediatria_200_sprints.html
├── css/
│   └── vars.css                        ← Variables CSS para uso standalone
├── EJES_y_TEMARIO__Examen_Integrado_2026.docx
└── CABA_Medicina__Bibliografi_a_Residencia_Ba_sica_2026.pdf
```

## Cómo usar

1. Abrí `index.html` como punto de entrada
2. Desde el hub accedés a todos los módulos
3. Para el sistema de estudio activo: `bucle_infinito_2.html`

### Uso con GitHub Pages

```bash
git clone https://github.com/TU_USUARIO/residencia-2026
cd residencia-2026
# Activar GitHub Pages en Settings → Pages → Deploy from branch main / root
```

Luego accedé a: `https://TU_USUARIO.github.io/residencia-2026/`

## Módulos

| Archivo | Descripción | Preguntas |
|---------|-------------|-----------|
| `bucle_infinito_2.html` | Sistema principal de estudio con tracker | — |
| `mapa_banco_real_4_ejes.html` | Distribución real del banco histórico | 974 |
| `clasificacion_clinica_adultos_525.html` | Clínica médica + cirugía adultos | 525 |
| `clasificacion_ginecologia_98_sprints.html` | Ginecología por sprints | 98 |
| `clasificacion_obstetricia_88_sprints.html` | Obstetricia por sprints | 88 |
| `clasificacion_pediatria_200_sprints.html` | Pediatría por sprints | 200 |

## Notas técnicas

- `bucle_infinito_2.html` usa **localStorage** para persistir el estado de los sprints
- Los archivos de clasificación originales usan variables CSS de Claude.ai — para renderizarlos fuera de ese entorno, incluir `<link rel="stylesheet" href="css/vars.css">` en el `<head>` de cada archivo
- El progreso del Bucle Infinito 2.0 se lee desde `localStorage` key: `bi2-ss`

## Fechas de examen

- **CABA**: 10 de junio de 2026
- **Integrador Nacional**: confirmar fecha oficial

## Bibliografía base

FASGO 2022 · ETMI Plus 2025 · MSAL · SAP · Calendario Nacional 2024 · IRAB-SAP 2021 · ADA 2024 · GOLD 2024 · Harrison 21
