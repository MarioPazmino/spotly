// scripts/createTestClient.js
const AWS = require('aws-sdk');

// Configurar la región de AWS
AWS.config.update({ region: 'us-east-1' });

const cognito = new AWS.CognitoIdentityServiceProvider();

// Configuración - estas variables deben ser proporcionadas como variables de entorno
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Crea un cliente de aplicación para pruebas en Cognito
 */
async function createTestClient(clientName) {
  try {
    console.log(`Iniciando creación de cliente para pruebas: ${clientName}`);
    
    // Verificar si el cliente ya existe
    try {
      const listClientsResponse = await cognito.listUserPoolClients({
        UserPoolId: COGNITO_USER_POOL_ID,
        MaxResults: 60
      }).promise();
      
      const existingClient = listClientsResponse.UserPoolClients.find(
        client => client.ClientName === clientName
      );
      
      if (existingClient) {
        console.log(`El cliente ${clientName} ya existe con ID: ${existingClient.ClientId}`);
        return {
          success: true,
          message: `El cliente ${clientName} ya existe`,
          clientId: existingClient.ClientId,
          clientSecret: 'No disponible para clientes existentes'
        };
      }
    } catch (err) {
      console.error('Error al verificar clientes existentes:', err);
    }
    
    // Crear cliente en Cognito
    const params = {
      UserPoolId: COGNITO_USER_POOL_ID,
      ClientName: clientName,
      GenerateSecret: false,
      ExplicitAuthFlows: [
        'ALLOW_USER_SRP_AUTH',
        'ALLOW_REFRESH_TOKEN_AUTH',
        'ALLOW_USER_PASSWORD_AUTH'
      ],
      SupportedIdentityProviders: [
        'COGNITO'
      ],
      CallbackURLs: [
        'http://localhost'
      ],
      LogoutURLs: [
        'http://localhost'
      ],
      AllowedOAuthFlows: [
        'code',
        'implicit'
      ],
      AllowedOAuthScopes: [
        'email',
        'openid',
        'profile'
      ],
      AllowedOAuthFlowsUserPoolClient: true,
      PreventUserExistenceErrors: 'ENABLED'
    };
    
    const result = await cognito.createUserPoolClient(params).promise();
    const clientId = result.UserPoolClient.ClientId;
    
    console.log(`Cliente creado con éxito. ID: ${clientId}`);
    
    return {
      success: true,
      message: `Cliente ${clientName} creado con éxito`,
      clientId,
      clientSecret: 'N/A (No se generó secreto)'
    };
  } catch (error) {
    console.error('Error al crear cliente para pruebas:', error);
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
    console.error('Uso: node createTestClient.js <nombre_cliente>');
    console.error('Ejemplo: node createTestClient.js postman-testing-client');
    process.exit(1);
  }
  
  const clientName = process.argv[2];
  
  console.log(`Creando cliente para pruebas: ${clientName}`);
  
  // Verificar variables de entorno
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: La variable de entorno COGNITO_USER_POOL_ID es requerida');
    process.exit(1);
  }
  
  const result = await createTestClient(clientName);
  console.log('Resultado:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Operación completada con éxito');
    console.log(`
INSTRUCCIONES PARA POSTMAN:
1. Usa el siguiente ID de cliente en tus solicitudes: ${result.clientId}
2. No se requiere SECRET_HASH ya que este cliente no tiene secreto
3. Ejemplo de solicitud:
{
  "AuthParameters": {
    "USERNAME": "mariopazmino78@gmail.com",
    "PASSWORD": "NuevaContraseña123!"
  },
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "${result.clientId}"
}
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
    createTestClient
  };
}
