//src/function/listReservation.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.listReservation = async (event) => {
  try {
    // Escanear la tabla de reservas
    const command = new ScanCommand({
      TableName: process.env.RESERVAS_TABLE,
    });

    const { Items } = await docClient.send(command);

    // Respuesta en formato API Gateway
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",  // Habilita CORS
      },
      body: JSON.stringify({
        total: Items.length,
        reservas: Items.map(item => ({
          id: item.id,
          canchaId: item.canchaId,
          fecha: item.fecha,
          hora: item.hora,
          usuarioId: item.usuarioId,
          createdAt: item.createdAt,
        })),
      }),
    };
  } catch (error) {
    console.error("Error al listar reservas:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};