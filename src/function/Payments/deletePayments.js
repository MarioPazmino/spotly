//src/function/Payments/deletePayments.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.deletePayment = async (event) => {
  console.log('Evento recibido:', event);
  try {
    const pagoId = event.pathParameters?.pagoId;

    if (!pagoId) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'Falta el ID del pago' }),
      };
    }

    const params = {
      TableName: process.env.PAGOS_TABLE,
      Key: { pagoId }
    };

    // Verificamos si el pago existe antes de eliminar
    const deleteResult = await docClient.send(new DeleteCommand(params));

    // Si no hay error, retornamos éxito
    return {
      statusCode: 200, // Cambiado de 204 a 200
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({
        message: `Pago ${pagoId} eliminado correctamente`,
        pagoId: pagoId
      }),
    };
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    return {
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message,
      }),
    };
  }
};