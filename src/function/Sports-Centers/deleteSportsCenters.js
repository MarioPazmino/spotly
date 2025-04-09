//src/function/Sports-Centers/deleteSportsCenters.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.deleteSportsCenter = async (event) => {
  try {
    // Validar variables de entorno
    if (!process.env.CENTROS_DEPORTIVOS_TABLE) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tabla no configurada" })
      };
    }

    // Obtener ID del path parameter
    const centroId = event.pathParameters?.id;
    if (!centroId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "ID del centro no proporcionado" })
      };
    }

    // Eliminar registro en DynamoDB
    const command = new DeleteCommand({
        TableName: process.env.CENTROS_DEPORTIVOS_TABLE,
        Key: { id: centroId },
        ReturnValues: 'ALL_OLD' // ← Clave agregada
      });
      
    const response = await docClient.send(command);

    // Verificar si se eliminó correctamente
    if (response.Attributes) {
        return {
          statusCode: 200, // ← Cambiado de 204 a 200
          headers: { 
            "Content-Type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          },
          body: JSON.stringify({ 
            message: "Centro eliminado con éxito",
            deletedItem: response.Attributes // Opcional: Devuelve los datos eliminados
          })
        };
      } else {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Centro no encontrado" })
      };
    }

  } catch (error) {
    console.error("Error al eliminar centro deportivo:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error interno del servidor" })
    };
  }
};