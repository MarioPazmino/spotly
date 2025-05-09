# Creación de Usuario Super Admin

Este documento explica cómo crear correctamente un usuario Super Admin en Cognito y registrarlo en DynamoDB.

## Instrucciones de uso

### Prerequisitos

1. Tener instalado Node.js y npm
2. Tener configuradas las credenciales de AWS con los permisos necesarios
3. Tener instalado el paquete `uuid` (si no está instalado, ejecutar `npm install uuid`)

### Pasos para crear un Super Admin

1. Configura las variables de entorno necesarias:

```bash
# Windows PowerShell
$env:COGNITO_USER_POOL_ID="us-east-1_5Kf6OxCQR"
$env:USUARIOS_TABLE="Usuarios-dev"
$env:SUPER_ADMIN_GROUP_NAME="super_admin"

# Windows CMD
set COGNITO_USER_POOL_ID=us-east-1_5Kf6OxCQR
set USUARIOS_TABLE=Usuarios-dev
set SUPER_ADMIN_GROUP_NAME=super_admin
```

2. Ejecuta el script proporcionando el email, contraseña temporal y nombre (opcional) del super_admin:

```bash
node scripts/createSuperAdmin.js mariopazmino7@gmail.com Temporal123! "Mario Raul Pazmiñ"
```

3. El script realizará las siguientes acciones:
   - Creará el usuario en Cognito con la contraseña temporal
   - Asignará el usuario al grupo super_admin en Cognito
   - Registrará el usuario en la tabla DynamoDB

4. Cuando el usuario inicie sesión por primera vez, se le solicitará cambiar la contraseña temporal.

## Obtener el ID del User Pool de Cognito

Para obtener el ID del User Pool de Cognito, puedes usar el siguiente comando de AWS CLI:

```bash
aws cognito-idp list-user-pools --max-results 20
```

O buscar en la consola de AWS en la sección de Cognito > User Pools.

## Solución de problemas

Si encuentras algún error al ejecutar el script, verifica lo siguiente:

1. Las credenciales de AWS están configuradas correctamente
2. El ID del User Pool de Cognito es correcto
3. El nombre de la tabla de DynamoDB es correcto
4. El grupo super_admin existe en el User Pool de Cognito

## Notas importantes

- La contraseña temporal debe cumplir con los requisitos de seguridad de Cognito (mayúsculas, minúsculas, números y caracteres especiales)
- El script no enviará un correo electrónico al usuario, deberás comunicarle la contraseña temporal por otro medio
- Si el usuario ya existe en Cognito o DynamoDB, el script no lo sobrescribirá
