// scripts/restoreTrigger.js
const AWS = require('aws-sdk');

// Configurar la región de AWS
AWS.config.update({ region: 'us-east-1' });

const cognito = new AWS.CognitoIdentityServiceProvider();

// Configuración - estas variables deben ser proporcionadas como variables de entorno
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Restaura un trigger de Lambda en un User Pool de Cognito
 */
async function restoreTrigger(triggerName, triggerValue) {
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
    
    // Restaurar el trigger
    lambdaConfig[triggerName] = triggerValue;
    
    // Actualizar el User Pool
    const updateParams = {
      UserPoolId: COGNITO_USER_POOL_ID,
      LambdaConfig: lambdaConfig
    };
    
    console.log('Actualizando configuración del User Pool...');
    await cognito.updateUserPool(updateParams).promise();
    
    console.log(`Trigger ${triggerName} restaurado con éxito`);
    
    return {
      success: true,
      message: `Trigger ${triggerName} restaurado con éxito`,
      value: triggerValue
    };
  } catch (error) {
    console.error('Error al restaurar trigger:', error);
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
    console.error('Uso: node restoreTrigger.js <nombre_trigger> <valor_trigger>');
    console.error('Ejemplo: node restoreTrigger.js PostAuthentication "arn:aws:lambda:us-east-1:123456789012:function:my-function"');
    process.exit(1);
  }
  
  const triggerName = process.argv[2];
  const triggerValue = process.argv[3];
  
  console.log(`Restaurando trigger: ${triggerName} con valor: ${triggerValue}`);
  
  // Verificar variables de entorno
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: La variable de entorno COGNITO_USER_POOL_ID es requerida');
    process.exit(1);
  }
  
  const result = await restoreTrigger(triggerName, triggerValue);
  console.log('Resultado:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Operación completada con éxito');
    console.log(`
INSTRUCCIONES:
1. El trigger ${triggerName} ha sido restaurado
2. La configuración del User Pool ha vuelto a su estado original
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
    restoreTrigger
  };
}
