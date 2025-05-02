// src/cognito/preSignUp.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  try {
    console.log('PreSignUp event:', JSON.stringify(event, null, 2));
    
    // Extraer datos relevantes
    const { clientId } = event.callerContext;
    const { email } = event.request.userAttributes;
    const domain = email.split('@')[1];
    
    // Verificar tipo de cliente
    const isWebRegistration = clientId === process.env.COGNITO_WEB_CLIENT_ID;
    const isMobileRegistration = clientId === process.env.COGNITO_MOBILE_CLIENT_ID;
    const isAdminDomain = domain === process.env.ADMIN_DOMAINS;

    // Validaciones según el cliente
    if (isWebRegistration && !isAdminDomain) {
      console.log(`Dominio no autorizado para registro web: ${domain}`);
      throw new Error('Dominio no autorizado para registro web');
    }

    if (isMobileRegistration && isAdminDomain) {
      console.log(`Los administradores deben registrarse por la web: ${email}`);
      throw new Error('Los administradores deben registrarse por la web');
    }

    // Verificar si el email ya existe en la base de datos
    const existingUser = await checkIfUserExists(email);
    if (existingUser) {
      console.log(`Email ya registrado: ${email}`);
      throw new Error('El email ya está registrado');
    }

    // Añadir atributos personalizados
    const userAttributes = {
      role: isWebRegistration ? 'admin_centro' : 'cliente',
      pendiente_aprobacion: isWebRegistration && !isAdminDomain ? 'true' : 'false',
      registration_source: isWebRegistration ? 'web' : 'mobile',
    };

    // Añadir atributos personalizados a la solicitud
    for (const [key, value] of Object.entries(userAttributes)) {
      event.request.userAttributes[`custom:${key}`] = value;
    }

    // Auto-confirmar usuarios móviles
    event.response.autoConfirmUser = isMobileRegistration;
    event.response.autoVerifyEmail = true;

    console.log('PreSignUp response:', JSON.stringify(event.response, null, 2));
    return event;
  } catch (error) {
    console.error('PreSignUp Error:', error);
    throw error;
  }
};

// Función para verificar si un usuario ya existe
async function checkIfUserExists(email) {
  try {
    const params = {
      TableName: process.env.USUARIOS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    };

    const result = await dynamoDB.query(params).promise();
    return result.Items && result.Items.length > 0;
  } catch (error) {
    console.error('Error verificando usuario existente:', error);
    return false;
  }
}
