const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.listSportsCenters = async (event) => {
  try {
    const tableName = process.env.CENTROS_DEPORTIVOS_TABLE;

    if (!tableName) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tabla no configurada" })
      };
    }

    const centroId = event.queryStringParameters?.id;

    let result;
    if (centroId) {
      // Obtener un centro por su ID
      const command = new GetCommand({
        TableName: tableName,
        Key: { CentroId: centroId }
      });
      const response = await docClient.send(command);

      if (!response.Item) {
        return {
          statusCode: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: "Centro deportivo no encontrado" })
        };
      }

      result = response.Item;
    } else {
      // Obtener todos los centros
      const command = new ScanCommand({
        TableName: tableName,
        ProjectionExpression: 'CentroId, Nombre, Direccion, Telefono, UserId, CreatedAt, UpdatedAt'
      });
      const response = await docClient.send(command);
      result = response.Items || [];
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Error al listar centros deportivos:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error interno del servidor", details: error.message })
    };
  }
};
