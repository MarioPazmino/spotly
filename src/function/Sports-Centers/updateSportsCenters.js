//src/function/Sports-Centers/updateSportsCenters.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.updateSportsCenter = async (event) => {
  try {
    // Validar variables de entorno
    if (!process.env.CENTROS_DEPORTIVOS_TABLE) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tabla no configurada" })
      };
    }

    // Obtener ID del path parameter
    const centroId = event.pathParameters?.id;
    if (!centroId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "ID del centro no proporcionado" })
      };
    }

    // Parsear y validar el body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Cuerpo de la solicitud no es un JSON válido" })
      };
    }

    // Validar campos requeridos
    const requiredFields = [
      'nombre',
      'direccion',
      'coordenadas',
      'telefono',
      'horarioApertura',
      'horarioCierre',
      'diasOperacion'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: `Falta el campo obligatorio: ${field}` })
        };
      }
    }

    // Validar coordenadas
    if (
      !data.coordenadas ||
      typeof data.coordenadas.lat !== 'number' ||
      typeof data.coordenadas.lng !== 'number'
    ) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'Las coordenadas deben ser números válidos' })
      };
    }

    // Construir el comando de actualización
    const command = new UpdateCommand({
      TableName: process.env.CENTROS_DEPORTIVOS_TABLE,
      Key: { id: centroId },
      UpdateExpression: 
        'SET #nombre = :nombre, ' +
        '#direccion = :direccion, ' +
        '#coordenadas = :coordenadas, ' +
        '#telefono = :telefono, ' +
        '#horarioApertura = :horarioApertura, ' +
        '#horarioCierre = :horarioCierre, ' +
        '#diasOperacion = :diasOperacion, ' +
        '#imagenes = :imagenes',
      ExpressionAttributeNames: {
        '#nombre': 'nombre',
        '#direccion': 'direccion',
        '#coordenadas': 'coordenadas',
        '#telefono': 'telefono',
        '#horarioApertura': 'horarioApertura',
        '#horarioCierre': 'horarioCierre',
        '#diasOperacion': 'diasOperacion',
        '#imagenes': 'imagenes'
      },
      ExpressionAttributeValues: {
        ':nombre': data.nombre,
        ':direccion': data.direccion,
        ':coordenadas': data.coordenadas,
        ':telefono': data.telefono,
        ':horarioApertura': data.horarioApertura,
        ':horarioCierre': data.horarioCierre,
        ':diasOperacion': data.diasOperacion,
        ':imagenes': data.imagenes || []
      },
      ReturnValues: 'ALL_NEW'
    });

    const response = await docClient.send(command);

    // Verificar si el ítem existía
    if (!response.Attributes) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Centro deportivo no encontrado" })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(response.Attributes)
    };

  } catch (error) {
    console.error("Error al actualizar centro deportivo:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error interno del servidor" })
    };
  }
};