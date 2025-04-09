// src/function/Canchas/deleteCanchas.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.deleteCanchas = async (event) => {
  try {
    const tableName = process.env.CANCHAS_TABLE;

    if (!tableName) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'Tabla de canchas no configurada' })
      };
    }

    const canchaId = event.pathParameters?.id;
    if (!canchaId) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'CanchaId no proporcionado en la ruta' })
      };
    }

    const command = new DeleteCommand({
      TableName: tableName,
      Key: { CanchaId: canchaId },
      ReturnValues: 'ALL_OLD'
    });

    const result = await docClient.send(command);

    if (result.Attributes) {
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Cancha eliminada exitosamente',
          deletedItem: result.Attributes
        })
      };
    } else {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'Cancha no encontrada' })
      };
    }

  } catch (error) {
    console.error('❌ Error al eliminar cancha:', error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message
      })
    };
  }
};
