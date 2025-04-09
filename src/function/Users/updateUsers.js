//src/function/Users/updateUsers.js

const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { USERS_TABLE } = process.env;
const Usuario = require('../../domain/entities/usuario'); // Importar el modelo

module.exports.updateUser = async (event) => {
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

    // Parsear el cuerpo de la solicitud
    const requestBody = JSON.parse(event.body);

    // Validar que se hayan proporcionado datos para actualizar
    if (Object.keys(requestBody).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'No se proporcionaron datos para actualizar.',
        }),
      };
    }

    // Validar que los datos enviados sean consistentes con el modelo Usuario
    const usuarioActualizado = new Usuario({
      id: userId,
      email: requestBody.email || undefined, // Permitir omitir campos opcionales
      nombre: requestBody.nombre || undefined,
      apellido: requestBody.apellido || undefined,
      telefono: requestBody.telefono || undefined,
      tipo: requestBody.tipo || undefined,
      centroDeportivoId: requestBody.centroDeportivoId || undefined,
      createdAt: requestBody.createdAt || undefined,
      updatedAt: new Date().toISOString(), // Siempre actualizar este campo
    });

    // Preparar los atributos a actualizar
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const [key, value] of Object.entries(usuarioActualizado)) {
      if (value !== undefined && key !== 'id') {
        updateExpressionParts.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    // Validar que haya algo que actualizar
    if (updateExpressionParts.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'No hay datos válidos para actualizar.',
        }),
      };
    }

    // Parámetros para DynamoDB
    const params = {
      TableName: USERS_TABLE,
      Key: {
        id: userId,
      },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW', // Devuelve el usuario actualizado
    };

    // Actualizar el usuario en DynamoDB
    const result = await dynamoDB.update(params).promise();

    // Verificar si el usuario fue actualizado
    if (result.Attributes) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Usuario actualizado exitosamente',
          data: result.Attributes,
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
    console.error('Error al actualizar el usuario:', error);

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