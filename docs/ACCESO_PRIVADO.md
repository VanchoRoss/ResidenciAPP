# Acceso privado simple · ResidenciAPP

Esta versión agrega una pantalla inicial con usuario y contraseña antes de entrar a la app.

## Credenciales configuradas

- Usuario: `resiapp`
- Contraseña: configurada internamente como hash SHA-256.

## Cómo funciona

- El usuario ingresa las credenciales en la pantalla inicial.
- Si son correctas, la sesión queda autorizada en el navegador mediante `localStorage`.
- En el menú lateral hay un botón **Cerrar sesión** para borrar ese acceso local.

## Importante

Esto es una barrera de acceso básica para evitar uso casual. Al estar alojada en GitHub Pages, la app sigue siendo estática; por lo tanto, no equivale a autenticación fuerte con servidor.

Para seguridad real se recomienda una etapa posterior con Cloudflare Access, Firebase Auth o Supabase Auth.
