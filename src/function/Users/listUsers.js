//src/function/Users/listUsers.js

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { USERS_TABLE } = process.env;


module.exports.listUsers = async (event) => {
  try {
    // Parámetros para DynamoDB
    const params = {
      TableName: USERS_TABLE,
    };

    // Obtener todos los usuarios de DynamoDB
    const result = await dynamoDB.scan(params).promise();

    // Extraer los usuarios del resultado
    const usuarios = result.Items || [];

    // Respuesta exitosa
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Usuarios obtenidos exitosamente',
        data: usuarios,
      }),
    };
  } catch (error) {
    console.error('Error al listar los usuarios:', error);

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