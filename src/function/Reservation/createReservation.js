//src/fucntion/Reservation/createReservation.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const Reserva = require("../../domain/entities/reserva");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.createReservation = async (event) => {
  console.log('Evento recibido:', event);
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Solicitud sin cuerpo' }),
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'JSON inválido' }),
      };
    }

    // Validación de campos requeridos
    const requiredFields = [
      'userId',
      'canchaId',
      'horarioId',
      'fecha',
      'horaInicio',
      'horaFin',
      'total'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: `Falta campo obligatorio: ${field}` }),
        };
      }
    }

    // Verificar existencia del horario
    const horarioParams = {
      TableName: process.env.SCHEDULES_TABLE,
      Key: { horarioId: data.horarioId }
    };
    
    const horarioExists = await docClient.send(new GetCommand(horarioParams));
    if (!horarioExists.Item) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Horario no encontrado' }),
      };
    }

    // Crear entidad de reserva
    const nuevaReserva = new Reserva({
        ReservaId: randomUUID(), // Cambiado a mayúscula inicial
        userId: data.userId,
        canchaId: data.canchaId,
        horarioId: data.horarioId,
        fecha: data.fecha,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        estado: data.estado || 'Pendiente',
        total: data.total,
      });

    // Validar tabla de reservas
    if (!process.env.RESERVAS_TABLE) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Tabla de reservas no configurada' }),
      };
    }

    // Guardar reserva
    await docClient.send(new PutCommand({
      TableName: process.env.RESERVAS_TABLE,
      Item: nuevaReserva
    }));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(nuevaReserva),
    };

  } catch (error) {
    console.error('Error creando reserva:', error);
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