// src/cognito/preSignUp.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  try {
    console.log('PreSignUp event:', JSON.stringify(event, null, 2));
    
    // Si es una creación desde la consola de AWS, permitir sin validaciones
    if (event.triggerSource === 'PreSignUp_AdminCreateUser') {
      console.log('Creación de usuario desde consola AWS - permitiendo sin validaciones');
      // Añadir atributos personalizados para usuarios creados desde la consola
      event.request.userAttributes['custom:role'] = 'super_admin';
      event.request.userAttributes['custom:registration_source'] = 'console';
      event.request.userAttributes['custom:pendiente_aprobacion'] = 'false';
      return event;
    }
    
    // Extraer datos relevantes
    const { clientId } = event.callerContext;
    const { email } = event.request.userAttributes;
    const domain = email.split('@')[1];
    
    console.log('Datos extraídos:', {
      clientId,
      email,
      domain,
      ADMIN_DOMAINS: process.env.ADMIN_DOMAINS
    });
    
    // Verificar tipo de cliente
    const isWebRegistration = clientId === process.env.COGNITO_WEB_CLIENT_ID;
    const isMobileRegistration = clientId === process.env.COGNITO_MOBILE_CLIENT_ID;
    
    console.log('Tipo de registro:', {
      isWebRegistration,
      isMobileRegistration,
      COGNITO_WEB_CLIENT_ID: process.env.COGNITO_WEB_CLIENT_ID,
      COGNITO_MOBILE_CLIENT_ID: process.env.COGNITO_MOBILE_CLIENT_ID
    });
    
    // Obtener dominios permitidos y convertirlos en array
    const allowedDomains = process.env.ADMIN_DOMAINS.split(',').map(d => d.trim());
    const isAdminDomain = allowedDomains.includes(domain);

    console.log('Validación de dominio:', {
      allowedDomains,
      isAdminDomain
    });

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

    console.log('Atributos a asignar:', userAttributes);

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
