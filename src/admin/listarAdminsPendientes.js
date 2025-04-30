// src/admin/listarAdminsPendientes.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

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
    
    // Buscar usuarios pendientes de aprobación usando el índice secundario
    const result = await dynamoDB.query({
      TableName: process.env.USUARIOS_TABLE,
      IndexName: 'PendienteAprobacionIndex',
      KeyConditionExpression: 'pendienteAprobacion = :pendienteVal',
      FilterExpression: 'role = :roleVal',
      ExpressionAttributeValues: {
        ':pendienteVal': 'true',
        ':roleVal': 'admin_centro'
      }
    }).promise();
    
    // Mapear resultados con campos alineados a la entidad Usuario
    const adminsPendientes = result.Items.map(user => ({
      userId: user.userId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt, // Campo correcto
      registrationSource: user.registrationSource,
      picture: user.picture
    }));
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        count: adminsPendientes.length,
        admins: adminsPendientes
      })
    };
  } catch (error) {
    console.error('Error listando administradores pendientes:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error al procesar la solicitud',
        error: error.message
      })
    };
  }
};