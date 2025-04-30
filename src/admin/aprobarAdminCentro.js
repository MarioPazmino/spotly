// src/admin/aprobarAdminCentro.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  try {
    // Verificar que el usuario que hace la solicitud sea un Super Admin
    const requestContext = event.requestContext;
    const claims = requestContext.authorizer?.jwt?.claims;
    
    if (!claims || !claims['cognito:groups']) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          message: 'No tiene permisos para realizar esta acción'
        })
      };
    }
    
    // Convertir el string de grupos a un array si es necesario
    const groups = typeof claims['cognito:groups'] === 'string' 
      ? [claims['cognito:groups']] 
      : claims['cognito:groups'];
    
    const isSuperAdmin = groups.includes(process.env.SUPER_ADMIN_GROUP_NAME);
    
    if (!isSuperAdmin) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          message: 'Esta acción solo puede ser realizada por un Super Admin'
        })
      };
    }
    
    // Obtener el ID del usuario a aprobar
    const userId = event.pathParameters.userId;
    
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Se requiere el ID del usuario a aprobar'
        })
      };
    }
    
    // Verificar que el usuario existe y está pendiente de aprobación
    const userResult = await dynamoDB.get({
      TableName: process.env.USUARIOS_TABLE,
      Key: { userId }
    }).promise();
    
    if (!userResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          message: 'Usuario no encontrado'
        })
      };
    }
    
    const user = userResult.Item;
    
    if (user.role !== 'admin_centro') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Este usuario no es un administrador de centro'
        })
      };
    }
    
    if (user.pendienteAprobacion !== 'true') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Este usuario ya ha sido aprobado'
        })
      };
    }
    
    // Actualizar el estado de aprobación en DynamoDB (sin fechaAprobacion)
    await dynamoDB.update({
      TableName: process.env.USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: 'set pendienteAprobacion = :pendiente, updatedAt = :now',
      ExpressionAttributeValues: {
        ':pendiente': 'false',
        ':now': new Date().toISOString()
      }
    }).promise();
    
    // Añadir el usuario al grupo de administradores de centro
    await cognito.adminAddUserToGroup({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: userId,
      GroupName: process.env.ADMIN_CENTRO_GROUP_NAME
    }).promise();
    
    // Crear notificación para el usuario aprobado (opcional)
    try {
      const notificacionId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      await dynamoDB.put({
        TableName: process.env.NOTIFICACIONES_TABLE,
        Item: {
          notificacionId,
          receptorId: userId,
          emisorId: claims.sub || 'sistema',
          tipoNotificacion: 'aprobacion_admin', // Campo correcto
          mensaje: 'Su cuenta de administrador ha sido aprobada. Ya puede acceder al panel de administración.',
          tipoEnvio: 'in-app', // Campo obligatorio según la entidad
          leido: false,
          createdAt: new Date().toISOString(), // Campo correcto
          updatedAt: new Date().toISOString() // Campo opcional
        }
      }).promise();
    } catch (notifError) {
      console.error('Error creando notificación:', notifError);
      // No bloqueamos la aprobación si falla la notificación
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Administrador de centro aprobado exitosamente',
        usuario: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          role: user.role
        }
      })
    };
  } catch (error) {
    console.error('Error aprobando administrador:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error al procesar la solicitud',
        error: error.message
      })
    };
  }
};