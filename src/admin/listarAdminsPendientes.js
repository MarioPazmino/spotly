// src/admin/listarAdminsPendientes.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
exports.handler = async (event) => {
  try {
    // Verificar si el usuario autenticado es super_admin
    const groups = event.requestContext.authorizer.claims['cognito:groups'];
    if (!groups || !groups.includes('super_admin')) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'No tienes permisos para realizar esta acción' })
      };
    }
    const USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    // Consultar usuarios pendientes de aprobación
    const result = await dynamoDB.query({
      TableName: USUARIOS_TABLE,
      IndexName: 'PendienteAprobacionIndex',
      KeyConditionExpression: 'pendienteAprobacion = :pendiente',
      ExpressionAttributeValues: {
        ':pendiente': 'true'
      }
    }).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        admins: result.Items,
        count: result.Count
      })
    };
  } catch (error) {
    console.error('Error al listar administradores pendientes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al procesar la solicitud', error: error.message })
    };
  }
};