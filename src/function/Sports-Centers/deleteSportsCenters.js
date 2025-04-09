const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.deleteSportsCenter = async (event) => {
  try {
    const tableName = process.env.CENTROS_DEPORTIVOS_TABLE;

    if (!tableName) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tabla no configurada" })
      };
    }

    const centroId = event.pathParameters?.id;
    if (!centroId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "CentroId no proporcionado en la ruta" })
      };
    }

    const command = new DeleteCommand({
      TableName: tableName,
      Key: { CentroId: centroId },
      ReturnValues: 'ALL_OLD'
    });

    const response = await docClient.send(command);

    if (response.Attributes) {
      return {
        statusCode: 200,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ 
          message: "Centro deportivo eliminado con éxito",
          deletedItem: response.Attributes
        })
      };
    } else {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Centro deportivo no encontrado" })
      };
    }

  } catch (error) {
    console.error("Error al eliminar centro deportivo:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error interno del servidor", details: error.message })
    };
  }
};
