const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.updateSportsCenter = async (event) => {
  try {
    const tableName = process.env.CENTROS_DEPORTIVOS_TABLE;

    if (!tableName) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Tabla no configurada" })
      };
    }

    const centroId = event.pathParameters?.id;
    if (!centroId) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "CentroId no proporcionado en la URL" })
      };
    }

    let data;
    try {
      data = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "El cuerpo no es un JSON válido" })
      };
    }

    const camposValidos = ['Nombre', 'Direccion', 'Telefono', 'UserId'];
    const updateExpressionParts = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = { ':UpdatedAt': new Date().toISOString() };

    for (const campo of camposValidos) {
      if (data[campo] !== undefined) {
        updateExpressionParts.push(`#${campo} = :${campo}`);
        expressionAttributeNames[`#${campo}`] = campo;
        expressionAttributeValues[`:${campo}`] = data[campo];
      }
    }

    if (updateExpressionParts.length === 0) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "No se proporcionaron campos válidos para actualizar" })
      };
    }

    updateExpressionParts.push('#UpdatedAt = :UpdatedAt');
    expressionAttributeNames['#UpdatedAt'] = 'UpdatedAt';

    const command = new UpdateCommand({
      TableName: tableName,
      Key: { CentroId: centroId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);

    if (!result.Attributes) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Centro deportivo no encontrado" })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Centro deportivo actualizado correctamente",
        data: result.Attributes
      })
    };

  } catch (error) {
    console.error("Error al actualizar centro deportivo:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Error interno del servidor", details: error.message })
    };
  }
};
