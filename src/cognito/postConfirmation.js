// src/cognito/postConfirmation.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
exports.handler = async (event) => {
  console.log('PostConfirmation triggered', JSON.stringify(event, null, 2));
  try {
    const { triggerSource, request, response } = event;
    // Extraer valores de variables de entorno
    const USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
    const SUPER_ADMIN_GROUP_NAME = process.env.SUPER_ADMIN_GROUP_NAME;
    const ADMIN_CENTRO_GROUP_NAME = process.env.ADMIN_CENTRO_GROUP_NAME;
    const CLIENTE_GROUP_NAME = process.env.CLIENTE_GROUP_NAME;
    const COGNITO_WEB_CLIENT_ID = process.env.COGNITO_WEB_CLIENT_ID;
    const COGNITO_MOBILE_CLIENT_ID = process.env.COGNITO_MOBILE_CLIENT_ID;
    // Obtener atributos del usuario
    const { userAttributes } = request;
    const userId = event.userName;
    const email = userAttributes.email;
    const name = userAttributes.name || userAttributes.email.split('@')[0];
    const role = userAttributes['custom:role'] || 'cliente';
    const pendienteAprobacion = userAttributes['custom:pendiente_aprobacion'] || 'false';
    const registrationSource = userAttributes['custom:registration_source'] || 'unknown';
    const picture = userAttributes.picture || '';
    // Crear registro en la tabla de usuarios
    const usuarioItem = {
      userId,
      email,
      name,
      role,
      pendienteAprobacion,
      registrationSource,
      picture,
      fechaRegistro: new Date().toISOString(),
      activo: true
    };
    await dynamoDB.put({
      TableName: USUARIOS_TABLE,
      Item: usuarioItem
    }).promise();
    // Determinar a qué grupo añadir al usuario
    let groupName; 
    if (userType === 'cliente') {
      // Los clientes siempre se añaden automáticamente al grupo cliente
      groupName = CLIENTE_GROUP_NAME; 
      // Añadir al grupo correspondiente
      await cognito.adminAddUserToGroup({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: userId,
        GroupName: groupName
      }).promise();
    } else if (userType === 'admin_centro') {
      // Los admin_centro no se añaden a ningún grupo hasta que sean aprobados
      console.log(`Usuario ${userId} registrado como admin_centro, pendiente de aprobación`);
    }
    console.log('PostConfirmation completed', JSON.stringify(event, null, 2));
    return event;
  } catch (error) {
    console.error('Error en PostConfirmation:', error);
    throw error;
  }
};