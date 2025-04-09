const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { USUARIOS_TABLE } = process.env; // Asegúrate que la variable se llama igual en tu .env

module.exports.listUsers = async (event) => {
  try {
    const params = {
      TableName: USUARIOS_TABLE,
    };

    const result = await dynamoDB.scan(params).promise();
    const usuarios = result.Items || [];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: usuarios.length > 0 ? 'Usuarios obtenidos exitosamente' : 'No hay usuarios registrados',
        data: usuarios,
      }),
    };
  } catch (error) {
    console.error('Error al listar los usuarios:', error);

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
