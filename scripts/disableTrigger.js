// scripts/disableTrigger.js
const AWS = require('aws-sdk');

// Configurar la región de AWS
AWS.config.update({ region: 'us-east-1' });

const cognito = new AWS.CognitoIdentityServiceProvider();

// Configuración - estas variables deben ser proporcionadas como variables de entorno
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Deshabilita un trigger de Lambda en un User Pool de Cognito
 */
async function disableTrigger(triggerName) {
  try {
    console.log(`Obteniendo configuración actual del User Pool: ${COGNITO_USER_POOL_ID}`);
    
    // Obtener la configuración actual del User Pool
    const userPoolResponse = await cognito.describeUserPool({
      UserPoolId: COGNITO_USER_POOL_ID
    }).promise();
    
    const userPool = userPoolResponse.UserPool;
    
    if (!userPool.LambdaConfig) {
      console.log('No hay triggers de Lambda configurados en este User Pool');
      return {
        success: false,
        message: 'No hay triggers de Lambda configurados'
      };
    }
    
    console.log('Configuración actual de triggers:', JSON.stringify(userPool.LambdaConfig, null, 2));
    
    // Crear una copia de la configuración actual
    const lambdaConfig = { ...userPool.LambdaConfig };
    
    // Verificar si el trigger especificado existe
    if (!lambdaConfig[triggerName]) {
      console.log(`El trigger ${triggerName} no está configurado`);
      return {
        success: false,
        message: `El trigger ${triggerName} no está configurado`
      };
    }
    
    // Guardar el valor actual para poder restaurarlo después
    const originalValue = lambdaConfig[triggerName];
    console.log(`Valor actual del trigger ${triggerName}: ${originalValue}`);
    
    // Eliminar el trigger especificado
    delete lambdaConfig[triggerName];
    
    // Actualizar el User Pool
    const updateParams = {
      UserPoolId: COGNITO_USER_POOL_ID,
      LambdaConfig: lambdaConfig
    };
    
    console.log('Actualizando configuración del User Pool...');
    await cognito.updateUserPool(updateParams).promise();
    
    console.log(`Trigger ${triggerName} deshabilitado con éxito`);
    
    return {
      success: true,
      message: `Trigger ${triggerName} deshabilitado con éxito`,
      originalValue
    };
  } catch (error) {
    console.error('Error al deshabilitar trigger:', error);
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
  if (process.argv.length < 3) {
    console.error('Uso: node disableTrigger.js <nombre_trigger>');
    console.error('Ejemplo: node disableTrigger.js PostAuthentication');
    process.exit(1);
  }
  
  const triggerName = process.argv[2];
  
  console.log(`Deshabilitando trigger: ${triggerName}`);
  
  // Verificar variables de entorno
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: La variable de entorno COGNITO_USER_POOL_ID es requerida');
    process.exit(1);
  }
  
  const result = await disableTrigger(triggerName);
  console.log('Resultado:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Operación completada con éxito');
    console.log(`
INSTRUCCIONES:
1. El trigger ${triggerName} ha sido deshabilitado
2. Ahora deberías poder autenticarte en Postman sin errores
3. Para restaurar el trigger, ejecuta:
   node scripts/restoreTrigger.js ${triggerName} "${result.originalValue}"
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
    disableTrigger
  };
}
