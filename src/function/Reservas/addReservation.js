const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

//1. Usar variables de entorno definidas en serverless.yml
const RESERVAS_TABLE = process.env.RESERVAS_TABLE;
const INDEX_NAME = "CanchaFechaIndex";

//2. Cliente de DynamoDB configurado correctamente
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.addReservation = async (event) => {
  try {
    // 📥 3. Validación estricta de entrada
    const data = JSON.parse(event.body || "{}");
    const { canchaId, fecha, hora, usuarioId } = data;

    if (!canchaId || !fecha || !hora || !usuarioId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Faltan campos requeridos: canchaId, fecha, hora, usuarioId",
        }),
      };
    }

    //4. Verificación de reserva existente (mejorable con esquema optimizado)
    const queryCommand = new QueryCommand({
      TableName: RESERVAS_TABLE,
      IndexName: INDEX_NAME,
      KeyConditionExpression: "canchaId = :canchaId AND fecha = :fecha",
      ExpressionAttributeValues: {
        ":canchaId": canchaId,
        ":fecha": fecha,
      },
    });

    const queryResult = await docClient.send(queryCommand);

    // ⚠️ Validación en memoria (recomiendo optimizar el GSI)
    const yaReservada = queryResult.Items.some(
      (item) => item.hora === hora
    );

    if (yaReservada) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          error: "La cancha ya está reservada para esa fecha y hora",
        }),
      };
    }

    //5. Creación de reserva con timestamp
    const nuevaReserva = {
      id: uuidv4(),
      canchaId,
      fecha,
      hora,
      usuarioId,
      createdAt: new Date().toISOString(), // Mejora: Auditoría
    };

    await docClient.send(
      new PutCommand({
        TableName: RESERVAS_TABLE,
        Item: nuevaReserva,
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "Reserva creada exitosamente",
        reserva: nuevaReserva,
      }),
    };
  } catch (error) {
    console.error("[ERROR] addReservation:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};