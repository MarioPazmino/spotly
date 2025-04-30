// src/admin/aprobarAdminCentro.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
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
    const userId = event.pathParameters.userId;
    const USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
    const ADMIN_CENTRO_GROUP_NAME = process.env.ADMIN_CENTRO_GROUP_NAME;
    // Actualizar estado de aprobación en DynamoDB
    await dynamoDB.update({
      TableName: USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: 'set pendienteAprobacion = :pendiente, fechaAprobacion = :fecha',
      ExpressionAttributeValues: {
        ':pendiente': 'false',
        ':fecha': new Date().toISOString()
      }
    }).promise();
    // Actualizar atributos en Cognito
    await cognito.adminUpdateUserAttributes({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: userId,
      UserAttributes: [
        {
          Name: 'custom:pendiente_aprobacion',
          Value: 'false'
        }
      ]
    }).promise();
    // Añadir al grupo de admin_centro
    await cognito.adminAddUserToGroup({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: userId,
      GroupName: ADMIN_CENTRO_GROUP_NAME
    }).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Administrador aprobado correctamente',
        userId
      })
    };
  } catch (error) {
    console.error('Error al aprobar administrador:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error al procesar la solicitud', error: error.message })
    };
  }
};