//src/function/Reservation/deleteReservation.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.deleteReservation = async (event) => {
  console.log('Evento recibido:', event);
  try {
    const ReservaId = event.pathParameters?.ReservaId;
    
    if (!ReservaId) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'ID de reserva no proporcionado' }),
      };
    }

    const params = {
      TableName: process.env.RESERVAS_TABLE,
      Key: { ReservaId },
      ReturnValues: 'ALL_OLD' // ← Clave agregada para obtener datos eliminados
    };

    const result = await docClient.send(new DeleteCommand(params));

    if (result.Attributes) {
      return {
        statusCode: 200, // ← Cambiado de 204 a 200
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({
          message: 'Reserva eliminada con éxito', // ← Mensaje de éxito
          deletedItem: result.Attributes // Opcional: incluir datos eliminados
        }),
      };
    } else {
      return {
        statusCode: 404,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'Reserva no encontrada' }),
      };
    }
  } catch (error) {
    console.error('Error eliminando reserva:', error);
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message
      }),
    };
  }
};