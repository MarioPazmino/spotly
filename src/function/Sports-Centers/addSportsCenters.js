//src/function/Sports-Centers/addSportsCenters.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");
const CentroDeportivo = require("../../domain/entities/centro-deportivo");

// Eliminar la redeclaración de clase que causaba el error

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Exportamos directamente la función (formato CommonJS)
exports.addSportsCenters = async (event) => {
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

    const requiredFields = [
      'nombre',
      'direccion',
      'coordenadas',
      'telefono',
      'horarioApertura',
      'horarioCierre',
      'diasOperacion'
    ];
   
    // Validación de campos requeridos
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
   
    // Validación de coordenadas
    if (
      !data.coordenadas ||
      typeof data.coordenadas.lat !== 'number' ||
      typeof data.coordenadas.lng !== 'number'
    ) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'Las coordenadas deben ser números válidos' }),
      };
    }
   
    // Crear entidad
    const centroDeportivo = new CentroDeportivo({
      id: data.id || randomUUID(),
      nombre: data.nombre,
      direccion: data.direccion,
      coordenadas: data.coordenadas,
      telefono: data.telefono,
      horarioApertura: data.horarioApertura,
      horarioCierre: data.horarioCierre,
      diasOperacion: data.diasOperacion,
      imagenes: data.imagenes || []
    });
   
    console.log('Centro deportivo a guardar:', centroDeportivo);
    console.log('Usando tabla:', process.env.CENTROS_DEPORTIVOS_TABLE);

    // Verificar que el nombre de la tabla es correcto
    if (!process.env.CENTROS_DEPORTIVOS_TABLE) {
      console.error('Variable de entorno CENTROS_DEPORTIVOS_TABLE no definida');
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          message: 'Error de configuración: tabla no definida',
        }),
      };
    }

    // Guardar en DynamoDB
    await docClient.send(new PutCommand({
      TableName: process.env.CENTROS_DEPORTIVOS_TABLE,
      Item: centroDeportivo
    }));
   
    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(centroDeportivo),
    };
  } catch (error) {
    console.error('Error al crear centro deportivo:', error);
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