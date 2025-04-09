// src/function/Canchas/updateCanchas.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.updateCanchas = async (event) => {
  try {
    const tableName = process.env.CANCHAS_TABLE;

    if (!tableName) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tabla de canchas no configurada" }),
      };
    }

    const canchaId = event.pathParameters?.id;

    if (!canchaId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "CanchaId no proporcionado en la URL" }),
      };
    }

    let updateData;
    try {
      updateData = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "El cuerpo de la solicitud no es un JSON válido" }),
      };
    }

    const camposPermitidos = ['CentroId', 'Tipo', 'Capacidad', 'PrecioPorHora'];
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = { ':UpdatedAt': new Date().toISOString() };

    for (const campo of camposPermitidos) {
      if (updateData[campo] !== undefined) {
        updateExpression.push(`#${campo} = :${campo}`);
        expressionAttributeNames[`#${campo}`] = campo;
        expressionAttributeValues[`:${campo}`] = updateData[campo];
      }
    }

    if (updateExpression.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No se proporcionaron campos válidos para actualizar" }),
      };
    }

    updateExpression.push('#UpdatedAt = :UpdatedAt');
    expressionAttributeNames['#UpdatedAt'] = 'UpdatedAt';

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { CanchaId: canchaId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);

    if (!result.Attributes) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Cancha no encontrada" }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Cancha actualizada exitosamente",
        data: result.Attributes,
      }),
    };
  } catch (error) {
    console.error("Error al actualizar cancha:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: "Error interno del servidor",
        details: error.message,
      }),
    };
  }
};
