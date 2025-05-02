// src/cognito/postAuthentication.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
  try {
    console.log('PostAuthentication event:', JSON.stringify(event, null, 2));
    
    // Extraer datos relevantes
    const { sub: userId } = event.request.userAttributes;
    const { clientId } = event.callerContext;
    
    // Obtener usuario de DynamoDB
    const user = await getUserById(userId);
    
    // Si no existe el usuario, error
    if (!user) {
      console.error(`Usuario no encontrado: ${userId}`);
      throw new Error('Usuario no encontrado');
    }

    // Verificar si es un admin_centro pendiente de aprobación
    const isWebClient = clientId === process.env.COGNITO_WEB_CLIENT_ID;
    
    if (isWebClient && user.role === 'admin_centro' && user.pendienteAprobacion === 'true') {
      console.error(`Acceso denegado para admin_centro pendiente: ${userId}`);
      throw new Error('Tu cuenta está pendiente de aprobación por un superadministrador');
    }

    // Actualizar último login
    await updateLastLogin(userId);
    
    return event;
  } catch (error) {
    console.error('PostAuthentication Error:', error);
    throw error;
  }
};

// Función para obtener un usuario por ID
async function getUserById(userId) {
  try {
    const params = {
      TableName: process.env.USUARIOS_TABLE,
      Key: {
        userId
      }
    };

    const result = await dynamoDB.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
}

// Función para actualizar el último login
async function updateLastLogin(userId) {
  try {
    const params = {
      TableName: process.env.USUARIOS_TABLE,
      Key: {
        userId
      },
      UpdateExpression: 'set lastLogin = :lastLogin, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':lastLogin': new Date().toISOString(),
        ':updatedAt': new Date().toISOString()
      }
    };

    await dynamoDB.update(params).promise();
    return true;
  } catch (error) {
    console.error('Error actualizando último login:', error);
    // No lanzamos error para no interrumpir el flujo de autenticación
    return false;
  }
}
