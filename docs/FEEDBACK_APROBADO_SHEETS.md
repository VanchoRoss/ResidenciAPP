# ResidenciAPP v2.2 · Feedback aprobado desde Google Sheets

Esta versión permite que los aportes colaborativos se vean como feedback validado para todos sin volver a subir `collabdata.json` cada vez.

## Flujo recomendado

1. Un usuario completa el aporte colaborativo.
2. Toca **Enviar aporte**.
3. El aporte llega a la hoja `Aportes` con estado `pendiente`.
4. Vos revisás la explicación y la bibliografía.
5. Si está correcta, cambiás la columna **Estado** a:

```text
aprobado
```

6. Al abrir la app, ResidenciAPP consulta el endpoint de Apps Script y carga automáticamente los registros aprobados.
7. Ese feedback aparece en la experiencia de aprendizaje como **Feedback validado / colaborativo**.

## Estados sugeridos

- `pendiente`: recibido, no visible públicamente.
- `aprobado`: visible para todos.
- `rechazado`: no visible.
- `revisar`: necesita revisión adicional.

## Importante

El progreso personal sigue guardándose en `localStorage`. Esta versión no cambia todavía la arquitectura de estadísticas individuales.

## Apps Script

Reemplazá tu código actual de Apps Script por el archivo:

```text
scripts/google-apps-script.gs
```

Luego implementá una **Nueva versión** del Web App. La URL `/exec` puede seguir siendo la misma.
