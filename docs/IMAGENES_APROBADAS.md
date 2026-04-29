# Imágenes aprobadas en preguntas

Esta versión permite que una imagen subida desde el panel colaborativo quede asociada a una pregunta y luego aparezca para todos los usuarios.

## Flujo

1. En una pregunta, activar colaboración.
2. Usar **Imagen de la pregunta → Subir imagen**.
3. Completar el aporte y tocar **Enviar aporte**.
4. Apps Script guarda la imagen en Google Drive y agrega en la hoja `Aportes`:
   - Imagen URL Drive
   - Imagen File ID
   - Estado
5. Revisar la fila en Google Sheets.
6. Cambiar `Estado` a:

```text
aprobado
```

7. Al recargar la app, esa imagen aparece encima del enunciado como:

```text
Imagen aprobada / visible para todos
```

## Importante

La Google Sheet puede seguir privada. Los usuarios no necesitan acceso a la hoja.

La imagen se guarda en una carpeta de Drive llamada:

```text
ResidenciAPP Aportes - Imagenes
```

El Apps Script comparte cada archivo como `cualquier persona con el enlace puede ver`, para que la app pueda mostrarlo.

## Si no aparece la imagen

Revisar:

1. Que el aporte tenga `Estado = aprobado`.
2. Que la fila tenga `Imagen File ID` o `Imagen URL Drive`.
3. Que `assets/js/config.js` tenga la URL `/exec` correcta.
4. Que el Apps Script responda:

```text
/exec?mode=approved
```

con registros en `records`.
