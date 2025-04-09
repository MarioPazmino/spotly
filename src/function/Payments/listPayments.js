//src/function/Payments/listPayments.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.listPayments = async (event) => {
  console.log('Evento recibido:', event);
  try {
    const queryParams = event.queryStringParameters || {};
    const params = {
      TableName: process.env.PAGOS_TABLE,
    };

    // Construir filtro dinámico si hay parámetros
    if (Object.keys(queryParams).length > 0) {
      const filterExpressions = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {}; // Ahora se construye dinámicamente

      for (const [key, value] of Object.entries(queryParams)) {
        if (['pagoId', 'ReservaId', 'userId', 'estado'].includes(key)) {
          // Validar valores vacíos
          if (!value || value.trim() === '') {
            throw new Error(`El parámetro ${key} no puede estar vacío`);
          }

          filterExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key; // Se añade dinámicamente
          expressionAttributeValues[`:${key}`] = value;
        }
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
        params.ExpressionAttributeValues = expressionAttributeValues;
        params.ExpressionAttributeNames = expressionAttributeNames; // Asignación dinámica
      }
    }

    const { Items } = await docClient.send(new ScanCommand(params));
    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(Items || []),
    };
  } catch (error) {
    console.error('Error al listar pagos:', error);
    return {
      statusCode: error.message.includes('vacío') ? 400 : 500,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({
        message: error.message || 'Error interno del servidor',
        error: error.message
      }),
    };
  }
};