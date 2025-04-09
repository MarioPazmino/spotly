//src/function/Schedules/updateSchedules.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const Horario = require("../../domain/entities/horarios");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.updateSchedule = async (event) => {
  console.log('Evento recibido:', event);
  try {
    const horarioId = event.pathParameters?.horarioId;
    
    if (!horarioId) {
      return {
        statusCode: 400,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'Falta el parámetro horarioId' }),
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

    // Verificar existencia del horario
    const getParams = {
      TableName: process.env.SCHEDULES_TABLE,
      Key: { horarioId }
    };

    // Corrección principal: Uso de GetCommand
    const getCommand = new GetCommand(getParams);
    const { Item: existingItem } = await docClient.send(getCommand);

    if (!existingItem) {
      return {
        statusCode: 404,
        headers: { 
          "Content-Type": "application/json", 
          "Access-Control-Allow-Origin": "*" 
        },
        body: JSON.stringify({ error: 'Horario no encontrado' }),
      };
    }

    // Construir expresión de actualización
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const [key, value] of Object.entries(data)) {
      if (key === 'horarioId') continue; // Ignorar el ID en el body
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = value;
    }

    // Añadir timestamp de actualización
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: process.env.SCHEDULES_TABLE,
      Key: { horarioId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const updateCommand = new UpdateCommand(params);
    const response = await docClient.send(updateCommand);
    const updatedData = response.Attributes;

    // Crear instancia de la entidad Horario
    const updatedHorario = new Horario({
      ...updatedData,
      horarioId: horarioId
    });

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(updatedHorario),
    };
  } catch (error) {
    console.error('Error al actualizar horario:', error);
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