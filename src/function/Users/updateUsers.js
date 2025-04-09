const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const { USUARIOS_TABLE } = process.env;
const Usuario = require('../../domain/entities/usuario'); // Modelo actualizado

module.exports.updateUsers = async (event) => {
  try {
    const userId = event.pathParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'El campo UserId es requerido en los parámetros de la ruta.',
        }),
      };
    }

    const requestBody = JSON.parse(event.body);

    if (Object.keys(requestBody).length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'No se proporcionaron datos para actualizar.',
        }),
      };
    }

    // Campos válidos que se pueden actualizar
    const camposPermitidos = ['email', 'passwordHash', 'role'];

    // Construir expresiones dinámicas
    const updateExpressionParts = [];
    const expressionAttributeValues = { ':updatedAt': new Date().toISOString() };
    const expressionAttributeNames = { '#updatedAt': 'updatedAt' };

    for (const key of camposPermitidos) {
      if (requestBody[key] !== undefined) {
        const valueKey = `:${key}`;
        const nameKey = `#${key}`;
        updateExpressionParts.push(`${nameKey} = ${valueKey}`);
        expressionAttributeValues[valueKey] = requestBody[key];
        expressionAttributeNames[nameKey] = key;
      }
    }

    if (updateExpressionParts.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'No hay campos válidos para actualizar.',
        }),
      };
    }

    // Siempre actualiza updatedAt
    updateExpressionParts.push('#updatedAt = :updatedAt');

    const params = {
      TableName: USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };

    const result = await dynamoDB.update(params).promise();

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

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message,
      }),
    };
  }
};
