//src/function/Schedules/listSchedules.js

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const Horario = require("../../domain/entities/horarios");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.listSchedules = async (event) => {
  console.log('Evento recibido:', event);
  try {
    const queryParams = event.queryStringParameters || {};
    const { 
      canchaId, 
      fecha, 
      estado, 
      horaInicio, 
      horaFin, 
      limit = 10, 
      lastEvaluatedKey 
    } = queryParams;

    let params;
    let command;

    if (canchaId) {
      // Consulta optimizada usando el índice
      const keyConditions = ['canchaId = :canchaId'];
      const expressionValues = { ':canchaId': canchaId };

      if (fecha) {
        keyConditions.push('fecha = :fecha');
        expressionValues[':fecha'] = fecha;
      }

      // Filtros adicionales
      const filterConditions = [];
      if (estado) {
        filterConditions.push('estado = :estado');
        expressionValues[':estado'] = estado;
      }
      if (horaInicio) {
        filterConditions.push('horaInicio >= :horaInicio');
        expressionValues[':horaInicio'] = horaInicio;
      }
      if (horaFin) {
        filterConditions.push('horaFin <= :horaFin');
        expressionValues[':horaFin'] = horaFin;
      }

      params = {
        TableName: process.env.SCHEDULES_TABLE,
        IndexName: 'CanchaFechaIndex',
        KeyConditionExpression: keyConditions.join(' AND '),
        FilterExpression: filterConditions.length ? filterConditions.join(' AND ') : undefined,
        ExpressionAttributeValues: expressionValues,
        Limit: parseInt(limit),
        ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
      };

      command = new QueryCommand(params);
    } else {
      // Búsqueda genérica con scan (menos eficiente)
      const filterConditions = [];
      const expressionValues = {};

      if (estado) {
        filterConditions.push('estado = :estado');
        expressionValues[':estado'] = estado;
      }
      if (fecha) {
        filterConditions.push('fecha = :fecha');
        expressionValues[':fecha'] = fecha;
      }
      if (horaInicio) {
        filterConditions.push('horaInicio >= :horaInicio');
        expressionValues[':horaInicio'] = horaInicio;
      }
      if (horaFin) {
        filterConditions.push('horaFin <= :horaFin');
        expressionValues[':horaFin'] = horaFin;
      }

      params = {
        TableName: process.env.SCHEDULES_TABLE,
        FilterExpression: filterConditions.length ? filterConditions.join(' AND ') : undefined,
        ExpressionAttributeValues: Object.keys(expressionValues).length ? expressionValues : undefined,
        Limit: parseInt(limit),
        ExclusiveStartKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
      };

      command = new ScanCommand(params);
    }

    const results = await docClient.send(command);
    const horarios = results.Items.map(item => new Horario(item));

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({
        horarios,
        count: horarios.length,
        lastEvaluatedKey: results.LastEvaluatedKey ? 
          JSON.stringify(results.LastEvaluatedKey) : null,
        scannedCount: results.ScannedCount
      }),
    };

  } catch (error) {
    console.error('Error al listar horarios:', error);
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