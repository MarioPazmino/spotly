//src/function/Canchas/updateCanchas.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.updateCanchas = async (event) => {
  try {
    const canchaId = event.pathParameters.id;
    if (!canchaId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'ID de cancha no proporcionado' }),
      };
    }

    let updateData;
    try {
      updateData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'Cuerpo de solicitud inválido' }),
      };
    }

    if (Object.keys(updateData).length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'No hay datos para actualizar' }),
      };
    }

    const updateExpression = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id') {
        const placeholder = `#${key}`;
        expressionAttributeNames[placeholder] = key;
        updateExpression.push(`${placeholder} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    // Agregar updatedAt
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: process.env.CANCHAS_TABLE,
      Key: { id: canchaId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error('Error al actualizar cancha:', error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message
      }),
    };
  }
};