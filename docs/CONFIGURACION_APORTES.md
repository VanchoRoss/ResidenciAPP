# Configuración de aportes colaborativos sin GitHub

Esta versión permite que cualquier usuario complete aportes dentro de ResidenciAPP sin entrar a GitHub. Los aportes se envían a una Google Sheet mediante Google Apps Script.

Además, ahora permite adjuntar imágenes a las preguntas que lo requieran, por ejemplo ECG, radiografías, mamografías, colposcopías o capturas de enunciados con imagen.

## Estado de esta versión

El endpoint ya quedó cargado en `assets/js/config.js`:

```js
endpoint: 'https://script.google.com/macros/s/AKfycbxaNwbYDNjee8gfrO2GBXwIkW8ppBekaUqv_Bh-XSUvZ2D2bNN261m0HWDWQ4OjGBj9xA/exec'
```

## 1. Crear o usar la Google Sheet

1. Crear una Google Sheet vacía o usar la que ya configuraste.
2. Nombrarla, por ejemplo: `ResidenciAPP Aportes`.
3. Ir a **Extensiones → Apps Script**.

## 2. Pegar el Apps Script actualizado

1. Abrir `scripts/google-apps-script.gs`.
2. Copiar todo el contenido.
3. Pegarlo en Apps Script reemplazando el código anterior.
4. Guardar el proyecto.

> Importante: esta versión usa `DriveApp` para guardar imágenes en una carpeta de Google Drive llamada `ResidenciAPP Aportes - Imagenes`. Por eso Google puede volver a pedir autorización.

## 3. Desplegar como Web App

1. En Apps Script tocar **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Ejecutar como: **Yo**.
4. Quién tiene acceso: **Cualquier persona**.
5. Implementar.
6. Copiar la URL que termina en `/exec`.

Si usás la misma URL que ya pegaste en la app, no hace falta cambiar `config.js`; solo asegurate de que el despliegue esté actualizado.

## 4. Cómo se usa

El usuario:

1. Activa colaboración.
2. Completa explicación, datos clave, distractores, regla de oro y bibliografía.
3. Si la pregunta requiere imagen, toca **Subir imagen**.
4. Toca **Enviar aporte**.
5. La fila queda guardada en la Google Sheet.

Vos:

1. Revisás los aportes en la Sheet.
2. Abrís la imagen desde la columna **Imagen URL Drive** si existe.
3. Marcás Estado: `pendiente`, `aprobado`, `rechazado` o `integrado`.
4. Exportás o copiás los aprobados para integrarlos al banco oficial.

## Columnas nuevas para imágenes

La Sheet incluye:

- Imagen nombre
- Imagen MIME
- Imagen tamaño bytes
- Imagen URL Drive
- Imagen File ID
- Payload completo JSON sin base64

La app no guarda el base64 completo en la celda final del payload para no saturar la planilla.

## Backup

Si el endpoint falla o no está configurado, los aportes quedan guardados localmente en el navegador y se pueden descargar con **Exportar aportes JSON**.
