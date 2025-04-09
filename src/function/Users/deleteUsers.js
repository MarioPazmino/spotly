//src/funtion/Users/deleteUsers.js

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { USERS_TABLE } = process.env;

module.exports.deleteUser = async (event) => {
  try {
    // Extraer el ID del usuario de los parámetros de la ruta
    const userId = event.pathParameters?.id;

    // Validar que se haya proporcionado un ID
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'El ID del usuario es requerido.',
        }),
      };
    }

    // Parámetros para DynamoDB
    const params = {
      TableName: USERS_TABLE,
      Key: {
        id: userId,
      },
    };

    // Eliminar el usuario de DynamoDB
    const result = await dynamoDB.delete(params).promise();

    // Verificar si el usuario fue eliminado
    if (result.Attributes) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Usuario eliminado exitosamente',
        }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: 'Usuario no encontrado',
        }),
      };
    }
  } catch (error) {
    console.error('Error al eliminar el usuario:', error);

    // Respuesta de error
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message,
      }),
    };
  }
};