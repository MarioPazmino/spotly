// src/function/Schedules/deleteSchedules.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.deleteSchedule = async (event) => {
  console.log('Evento recibido:', event);
  try {
    const horarioId = event.pathParameters?.horarioId;

    if (!horarioId) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'Falta el parámetro horarioId' }),
      };
    }

    // Verificar existencia del horario
    const getParams = {
      TableName: process.env.SCHEDULES_TABLE,
      Key: { horarioId }
    };

    const { Item: existingItem } = await docClient.send(new GetCommand(getParams));

    if (!existingItem) {
      return {
        statusCode: 404,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'Horario no encontrado' }),
      };
    }

    // Eliminar el horario
    await docClient.send(new DeleteCommand({
      TableName: process.env.SCHEDULES_TABLE,
      Key: { horarioId }
    }));

    // Respuesta corregida: 200 con mensaje
    return {
      statusCode: 200, // Cambiado de 204 a 200
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({ 
        message: 'Horario eliminado con éxito',
        horarioId: horarioId // Opcional: incluir el ID eliminado
      }),
    };

  } catch (error) {
    console.error('Error al eliminar horario:', error);
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