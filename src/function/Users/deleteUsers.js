const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { USUARIOS_TABLE } = process.env;

module.exports.deleteUsers = async (event) => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'El campo UserId es requerido en los parámetros.',
        }),
      };
    }

    const params = {
      TableName: USUARIOS_TABLE,
      Key: {
        userId: userId,
      },
      ReturnValues: 'ALL_OLD',
    };

    const result = await dynamoDB.delete(params).promise();

    if (result.Attributes) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Usuario eliminado exitosamente',
        }),
      };
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Usuario no encontrado',
        }),
      };
    }
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message,
      }),
    };
  }
};
