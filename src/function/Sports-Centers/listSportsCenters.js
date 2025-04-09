//src/function/Sports-Centers/listSportsCenters.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.listSportsCenters = async (event) => {
  try {
    if (!process.env.CENTROS_DEPORTIVOS_TABLE) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tabla no configurada" })
      };
    }

    // Verificar si se proporciona un ID en los query parameters
    const centroId = event.queryStringParameters?.id;

    let response;
    if (centroId) {
      // Buscar por ID específico
      const command = new GetCommand({
        TableName: process.env.CENTROS_DEPORTIVOS_TABLE,
        Key: { id: centroId }
      });
      response = await docClient.send(command);
      
      if (!response.Item) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Centro no encontrado" })
        };
      }
    } else {
      // Listar todos los centros
      const command = new ScanCommand({
        TableName: process.env.CENTROS_DEPORTIVOS_TABLE
      });
      response = await docClient.send(command);
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(centroId ? response.Item : response.Items || [])
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error interno del servidor" })
    };
  }
};