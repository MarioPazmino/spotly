const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.listCanchas = async (event) => {
  try {
    const tableName = process.env.CANCHAS_TABLE;

    if (!tableName) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'Tabla de canchas no configurada' }),
      };
    }

    // Búsqueda por CanchaId
    if (event.queryStringParameters?.id) {
      const canchaId = event.queryStringParameters.id;

      const params = {
        TableName: tableName,
        Key: { CanchaId: canchaId }
      };

      const result = await docClient.send(new GetCommand(params));

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify({ error: 'Cancha no encontrada' }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(result.Item),
      };
    }

    // Listado general de canchas
    const scanResult = await docClient.send(new ScanCommand({ TableName: tableName }));
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(scanResult.Items || []),
    };

  } catch (error) {
    console.error('Error al listar canchas:', error);
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
