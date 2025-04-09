//src/function/Reservation/updateReservation.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const Reserva = require("../../domain/entities/reserva");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.updateReservation = async (event) => {
  try {
    // 1. Obtener ReservaId (con mayúscula)
    const ReservaId = event.pathParameters?.ReservaId; // ✅ Cambiado a mayúscula

    if (!ReservaId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ID de reserva no proporcionado' }),
      };
    }

    // 2. Validar existencia de la reserva
    const getParams = {
      TableName: process.env.RESERVAS_TABLE,
      Key: { ReservaId } // ✅ Clave con mayúscula
    };

    const { Item: existingItem } = await docClient.send(new GetCommand(getParams));
    
    if (!existingItem) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Reserva no encontrada' }) };
    }

    // 3. Procesar datos de actualización
    let updateData = JSON.parse(event.body);

    // Prevenir modificaciones de campos críticos
    delete updateData.ReservaId; // ✅ Eliminar campo inmutable
    delete updateData.createdAt;

    // Construir expresión de actualización
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const [key, value] of Object.entries(updateData)) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    // Añadir timestamp de actualización
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    // 4. Actualizar en DynamoDB
    const updateParams = {
      TableName: process.env.RESERVAS_TABLE,
      Key: { ReservaId }, // ✅ Clave con mayúscula
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const { Attributes: updatedItem } = await docClient.send(new UpdateCommand(updateParams));

    // 5. Validar entidad actualizada
    const reservaActualizada = new Reserva({
      ...updatedItem,
      ReservaId // ✅ Usar mayúscula
    });

    return {
      statusCode: 200,
      body: JSON.stringify(reservaActualizada),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' }),
    };
  }
};