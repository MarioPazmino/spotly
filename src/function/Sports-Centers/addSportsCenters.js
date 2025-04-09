const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.addSportsCenters = async (event) => {
  console.log('Evento recibido:', event);
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'No se proporcionó un cuerpo en la solicitud' }),
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: 'El cuerpo de la solicitud no es un JSON válido' }),
      };
    }

    const requiredFields = ['nombre', 'direccion', 'telefono', 'userId'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          statusCode: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ error: `Falta el campo obligatorio: ${field}` }),
        };
      }
    }

    const centroDeportivo = {
      CentroId: randomUUID(),
      Nombre: data.nombre,
      Direccion: data.direccion,
      Telefono: data.telefono,
      UserId: data.userId,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: process.env.CENTROS_DEPORTIVOS_TABLE,
      Item: centroDeportivo,
    };

    await docClient.send(new PutCommand(params));

    return {
      statusCode: 201,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(centroDeportivo),
    };
  } catch (error) {
    console.error('Error al crear centro deportivo:', error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message,
      }),
    };
  }
};
