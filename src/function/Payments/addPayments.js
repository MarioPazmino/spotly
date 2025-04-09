//src/function/Payments/addPayments.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const Pago = require("../../domain/entities/pagos");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.addPayment = async (event) => {
  console.log('Evento recibido:', event);
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'No se proporcionó un cuerpo en la solicitud' }),
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'El cuerpo de la solicitud no es un JSON válido' }),
      };
    }

    const requiredFields = ['ReservaId', 'userId', 'monto', 'metodoPago', 'estado'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers: { 
            "Content-Type": "application/json", 
            "Access-Control-Allow-Origin": "*" 
          },
          body: JSON.stringify({ error: `Falta el campo obligatorio: ${field}` }),
        };
      }
    }

    const nuevoPago = new Pago({
      pagoId: randomUUID(),
      ReservaId: data.ReservaId,
      userId: data.userId,
      monto: data.monto,
      metodoPago: data.metodoPago,
      estado: data.estado,
      // createdAt y updatedAt se asignan automáticamente en el constructor
    });

    const params = {
      TableName: process.env.PAGOS_TABLE,
      Item: nuevoPago
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(nuevoPago),
    };
  } catch (error) {
    console.error('Error al crear pago:', error);
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