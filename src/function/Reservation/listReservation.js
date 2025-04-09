//src/function/Reservation/listReservation.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.listReservation = async (event) => {
  console.log('Listando reservas...');
  try {
    if (!process.env.RESERVAS_TABLE) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Tabla de reservas no configurada' }),
      };
    }

    // Obtener parámetros de consulta
    const queryParams = event.queryStringParameters || {};
    const { ReservaId, userId, estado } = queryParams;

    let params;

    // Si se proporciona reservaId, buscar por ID específico
    if (ReservaId) {
      params = {
        TableName: process.env.RESERVAS_TABLE,
        Key: { ReservaId } // Asegúrate que "reservaId" coincida con el nombre de tu clave primaria en DynamoDB
      };
      
      const data = await docClient.send(new GetCommand(params));
      return data.Item
        ? {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(data.Item),
          }
        : {
            statusCode: 404,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: 'Reserva no encontrada' }),
          };
    }

    // Si no hay reservaId, hacer un scan con filtros opcionales
    params = {
      TableName: process.env.RESERVAS_TABLE,
      FilterExpression: [],
      ExpressionAttributeValues: {},
    };

    // Agregar filtros según parámetros recibidos
    if (userId) {
      params.FilterExpression.push('userId = :userId');
      params.ExpressionAttributeValues[':userId'] = userId;
    }
    
    if (estado) {
      params.FilterExpression.push('estado = :estado');
      params.ExpressionAttributeValues[':estado'] = estado;
    }

    // Si hay filtros, construir la expresión
    if (params.FilterExpression.length > 0) {
      params.FilterExpression = params.FilterExpression.join(' AND ');
    } else {
      delete params.FilterExpression;
      delete params.ExpressionAttributeValues;
    }

    const data = await docClient.send(new ScanCommand(params));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data.Items || []),
    };

  } catch (error) {
    console.error('Error listando reservas:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        error: 'Error interno del servidor',
        details: error.message
      }),
    };
  }
};