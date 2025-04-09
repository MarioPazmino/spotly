//src/function/Canchas/addCanchas.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const Cancha = require("../../domain/entities/cancha");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.addCanchas = async (event) => {
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
      console.error('Error al parsear el cuerpo JSON:', parseError);
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'El cuerpo de la solicitud no es un JSON válido' }),
      };
    }

    console.log('Datos recibidos:', data);

    // Validación de campos requeridos
    const requiredFields = [
      'centroDeportivoId',
      'nombre',
      'tipo',
      'capacidad',
      'precioPorHora',
      'superficie'
    ];

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

    // Validación de tipos numéricos
    if (typeof data.capacidad !== 'number' || typeof data.precioPorHora !== 'number') {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'Capacidad y precio por hora deben ser números' }),
      };
    }

    // Crear entidad Cancha
    const nuevaCancha = new Cancha({
      id: data.id || randomUUID(),
      centroDeportivoId: data.centroDeportivoId,
      nombre: data.nombre,
      tipo: data.tipo,
      capacidad: data.capacidad,
      precioPorHora: data.precioPorHora,
      descripcion: data.descripcion || '',
      imagenes: data.imagenes || [],
      tamano: data.tamano,
      superficie: data.superficie,
      disponible: data.disponible !== false // Por defecto true si no se especifica
    });

    console.log('Cancha a guardar:', nuevaCancha);

    // Verificar tabla de canchas
    if (!process.env.CANCHAS_TABLE) {
      console.error('Variable de entorno CANCHAS_TABLE no definida');
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Error de configuración: tabla de canchas no definida',
        }),
      };
    }

    // Guardar en DynamoDB
    await docClient.send(new PutCommand({
      TableName: process.env.CANCHAS_TABLE,
      Item: nuevaCancha
    }));

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(nuevaCancha),
    };

  } catch (error) {
    console.error('Error al crear cancha:', error);
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