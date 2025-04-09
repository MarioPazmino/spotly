//src/function/Schedules/addSchedules.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const Horario = require("../../domain/entities/horarios"); // <<--- Nueva línea

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.addSchedule = async (event) => {
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

    const requiredFields = ['canchaId', 'fecha', 'horaInicio', 'horaFin', 'estado'];
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

    // Crear instancia de Horario usando la entidad
    const nuevoHorario = new Horario({
      horarioId: randomUUID(),
      canchaId: data.canchaId,
      fecha: data.fecha,
      horaInicio: data.horaInicio,
      horaFin: data.horaFin,
      estado: data.estado,
      userId: data.userId || null,
      reservaId: data.reservaId || null
    });

    const params = {
      TableName: process.env.SCHEDULES_TABLE,
      Item: nuevoHorario // Usamos directamente la instancia
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(nuevoHorario),
    };

  } catch (error) {
    console.error('Error al crear horario:', error);
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