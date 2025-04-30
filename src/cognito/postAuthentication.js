// src/cognito/postAuthentication.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
exports.handler = async (event) => {
  console.log('PostAuthentication triggered', JSON.stringify(event, null, 2));
  try {
    const { triggerSource, request } = event;
    const { userAttributes } = request;
    const userId = event.userName;
    const USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    // Actualizar último login en la tabla de usuarios
    await dynamoDB.update({
      TableName: USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: 'set ultimoLogin = :now',
      ExpressionAttributeValues: {
        ':now': new Date().toISOString()
      }
    }).promise();
    console.log('PostAuthentication completed', JSON.stringify(event, null, 2));
    return event;
  } catch (error) {
    console.error('Error en PostAuthentication:', error);
    // No interrumpir el flujo de autenticación si hay un error
    return event;
  }
};
