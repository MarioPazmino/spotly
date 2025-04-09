//src/function/Payments/updatePayments.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.updatePayment = async (event) => {
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

    let updateData;
    try {
      updateData = JSON.parse(event.body);
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

    // Validar que haya al menos un campo válido para actualizar
    const updatableFields = ['monto', 'metodoPago', 'estado'];
    const updateFields = Object.keys(updateData).filter(
      key => updatableFields.includes(key)
    );

    if (updateFields.length === 0) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'No hay campos válidos para actualizar' }),
      };
    }

    // Construir parámetros de actualización
    const updateExpressions = updateFields.map(field => `${field} = :${field}`);
    const expressionAttributeValues = updateFields.reduce((acc, field) => {
      acc[`:${field}`] = updateData[field];
      return acc;
    }, {
      ':updatedAt': new Date().toISOString() // Actualiza timestamp automáticamente
    });

    const params = {
      TableName: process.env.PAGOS_TABLE,
      Key: { pagoId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}, updatedAt = :updatedAt`,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const { Attributes: updatedPayment } = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(updatedPayment),
    };

  } catch (error) {
    console.error('Error al actualizar pago:', error);
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