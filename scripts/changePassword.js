// scripts/changePassword.js
const AWS = require('aws-sdk');

// Configurar la región de AWS
AWS.config.update({ region: 'us-east-1' });

const cognito = new AWS.CognitoIdentityServiceProvider();

// Configuración - estas variables deben ser proporcionadas como variables de entorno
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Cambia la contraseña de un usuario en Cognito
 */
async function changePassword(username, newPassword) {
  try {
    console.log(`Iniciando cambio de contraseña para el usuario: ${username}`);
    
    // Establecer una nueva contraseña permanente
    const params = {
      Password: newPassword,
      Permanent: true,
      Username: username,
      UserPoolId: COGNITO_USER_POOL_ID
    };
    
    await cognito.adminSetUserPassword(params).promise();
    console.log(`Contraseña cambiada con éxito para el usuario: ${username}`);
    
    return {
      success: true,
      message: `Contraseña cambiada con éxito para el usuario: ${username}`
    };
  } catch (error) {
    console.error('Error al cambiar la contraseña:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
}

/**
 * Función principal para ejecutar desde línea de comandos
 */
async function main() {
  if (process.argv.length < 4) {
    console.error('Uso: node changePassword.js <username> <nueva_contraseña>');
    console.error('Ejemplo: node changePassword.js usuario@ejemplo.com NuevaContraseña123!');
    process.exit(1);
  }
  
  const username = process.argv[2];
  const newPassword = process.argv[3];
  
  console.log(`Cambiando contraseña para el usuario: ${username}`);
  
  // Verificar variables de entorno
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: La variable de entorno COGNITO_USER_POOL_ID es requerida');
    process.exit(1);
  }
  
  const result = await changePassword(username, newPassword);
  console.log('Resultado:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Operación completada con éxito');
    console.log(`
INSTRUCCIONES PARA EL USUARIO:
1. La contraseña del usuario ${username} ha sido cambiada a: ${newPassword}
2. Esta es ahora una contraseña permanente, no se solicitará cambiarla en el próximo inicio de sesión
`);
  } else {
    console.error('❌ Error en la operación');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente desde línea de comandos
if (require.main === module) {
  main();
} else {
  // Exportar para uso como módulo
  module.exports = {
    changePassword
  };
}
