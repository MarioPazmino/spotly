// src/infrastructure/repositories/horariosRepository.js
const { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const Horario = require('../../domain/entities/horarios');

const TABLE_NAME = process.env.SCHEDULES_TABLE || 'Horarios-dev';
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports = {
  /**
   * Crea un nuevo horario
   */
  async create(horarioData) {
    const horario = new Horario(horarioData); // Valida datos
    const params = {
      TableName: TABLE_NAME,
      Item: marshall(horario)
    };
    await client.send(new PutItemCommand(params));
    return horario;
  },

  /**
   * Obtiene un horario por su ID
   */
  async getById(horarioId) {
    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ horarioId })
    };
    const result = await client.send(new GetItemCommand(params));
    if (!result.Item) return null;
    return new Horario(unmarshall(result.Item));
  },

  /**
   * Lista horarios por cancha y rango de fechas (usando GSI CanchaFechaIndex)
   */
  async listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, limit = 20, exclusiveStartKey = null, estado = null) {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'CanchaFechaIndex',
      KeyConditionExpression: 'canchaId = :canchaId AND fecha BETWEEN :fechaInicio AND :fechaFin',
      ExpressionAttributeValues: {
        ':canchaId': { S: canchaId },
        ':fechaInicio': { S: fechaInicio },
        ':fechaFin': { S: fechaFin }
      },
      Limit: limit
    };
    if (exclusiveStartKey) {
      params.ExclusiveStartKey = exclusiveStartKey;
    }
    const result = await client.send(new QueryCommand(params));
    return {
      items: (result.Items || []).map(item => new Horario(unmarshall(item))),
      lastEvaluatedKey: result.LastEvaluatedKey || null
    };
  },

  async listByCanchaAndFecha(canchaId, fecha, limit = 20, exclusiveStartKey = null) {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'CanchaFechaIndex',
      KeyConditionExpression: 'canchaId = :canchaId and fecha = :fecha',
      ExpressionAttributeValues: {
        ':canchaId': { S: canchaId },
        ':fecha': { S: fecha }
      },
      Limit: limit
    };
    if (exclusiveStartKey) {
      params.ExclusiveStartKey = exclusiveStartKey;
    }
    const result = await client.send(new QueryCommand(params));
    return {
      items: (result.Items || []).map(item => new Horario(unmarshall(item))),
      lastEvaluatedKey: result.LastEvaluatedKey || null
    };
  },

  /**
   * Lista horarios por reservaId (usando GSI ReservaIdIndex)
   */
  async listByReservaId(reservaId, limit = 20, exclusiveStartKey = null) {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'ReservaIdIndex',
      KeyConditionExpression: 'reservaId = :reservaId',
      ExpressionAttributeValues: {
        ':reservaId': { S: reservaId }
      },
      Limit: limit
    };
    if (exclusiveStartKey) {
      params.ExclusiveStartKey = exclusiveStartKey;
    }
    const result = await client.send(new QueryCommand(params));
    return {
      items: (result.Items || []).map(item => new Horario(unmarshall(item))),
      lastEvaluatedKey: result.LastEvaluatedKey || null
    };
  },

  /**
   * Actualiza un horario existente
   */
  async update(horarioId, updates) {
    // Solo permitimos actualizar ciertos campos
    const allowedFields = ['estado', 'reservaId', 'updatedAt'];
    const updateExpr = [];
    const exprAttrNames = {};
    const exprAttrValues = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        updateExpr.push(`#${key} = :${key}`);
        exprAttrNames[`#${key}`] = key;
        exprAttrValues[`:${key}`] = marshall({ [key]: updates[key] })[key];
      }
    }
    if (updateExpr.length === 0) throw new Error('Nada para actualizar');
    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ horarioId }),
      UpdateExpression: 'SET ' + updateExpr.join(', '),
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW'
    };
    const result = await client.send(new UpdateItemCommand(params));
    return new Horario(unmarshall(result.Attributes));
  },

  /**
   * Elimina un horario por ID
   */
  async delete(horarioId) {
    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ horarioId })
    };
    await client.send(new DeleteItemCommand(params));
    return true;
  }
};