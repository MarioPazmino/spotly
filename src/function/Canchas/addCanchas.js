const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.addCanchas = async (event) => {
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
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'El cuerpo de la solicitud no es un JSON válido' }),
      };
    }

    // Validar campos requeridos
    const requiredFields = ['CentroId', 'Tipo', 'Capacidad', 'PrecioPorHora'];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: `Falta el campo obligatorio: ${field}` })
        };
      }
    }

    if (typeof data.Capacidad !== 'number' || typeof data.PrecioPorHora !== 'number') {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Capacidad y PrecioPorHora deben ser números' })
      };
    }

    const nuevaCancha = {
      CanchaId: randomUUID(),
      CentroId: data.CentroId,
      Tipo: data.Tipo,
      Capacidad: data.Capacidad,
      PrecioPorHora: data.PrecioPorHora,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: process.env.CANCHAS_TABLE,
      Item: nuevaCancha,
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(nuevaCancha),
    };
  } catch (error) {
    console.error('Error al crear cancha:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: 'Error interno del servidor', error: error.message }),
    };
  }
};
