// src/infrastructure/repositories/horariosRepository.js
const { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const Horario = require('../../domain/entities/horarios');

const TABLE_NAME = process.env.SCHEDULES_TABLE || 'Horarios-dev';
const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

function normalizarHoraRepo(hora) {
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(hora)) return hora;
  if (/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(hora)) return hora.slice(0, 5);
  throw new Error('El formato de hora debe ser HH:mm');
}

module.exports = {
  /**
   * Crea un nuevo horario
   */
  async create(horarioData) {
    // Normalizar horas a HH:mm
    if (horarioData.horaInicio) horarioData.horaInicio = normalizarHoraRepo(horarioData.horaInicio);
    if (horarioData.horaFin) horarioData.horaFin = normalizarHoraRepo(horarioData.horaFin);
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

  async listByCanchaAndFecha(canchaId, fecha, limit = 20, exclusiveStartKey = null, estado = null) {
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
  async listByReservaId(reservaId, limit = 20, exclusiveStartKey = null, estado = null) {
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
  // Permite actualizar solo los campos válidos
  const allowed = ['canchaId', 'fecha', 'horaInicio', 'horaFin', 'estado', 'reservaId'];
  const updateExpr = [];
  const exprAttrNames = {};
  const exprAttrValues = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      // Normalizar horas a HH:mm
      if ((key === 'horaInicio' || key === 'horaFin') && updates[key]) {
        updates[key] = normalizarHoraRepo(updates[key]);
      }
      updateExpr.push(`#${key} = :${key}`);
      exprAttrNames[`#${key}`] = key;
      exprAttrValues[`:${key}`] = updates[key];
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
   * Elimina todos los horarios de una cancha en un rango de fechas
   */
  async deleteByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin) {
    // 1. Obtener todos los horarios en el rango
    const { items } = await this.listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, 1000);
    const eliminados = [];
    if (!items.length) return eliminados;
    // 2. Eliminar en lotes de hasta 25 (BatchWriteCommand)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const params = {
        RequestItems: {
          [TABLE_NAME]: batch.map(horario => ({
            DeleteRequest: {
              Key: marshall({ horarioId: horario.horarioId })
            }
          }))
        }
      };
      await client.send(new BatchWriteCommand(params));
      eliminados.push(...batch.map(h => h.horarioId));
    }
    return eliminados;
  },

  async bulkUpdate(updatesArray) {
    if (!Array.isArray(updatesArray) || updatesArray.length === 0) {
      throw new Error('Debe enviar un array de actualizaciones');
    }
    const actualizados = [];
    for (const upd of updatesArray) {
      if (!upd.horarioId) throw new Error('Falta horarioId en una actualización');
      const actualizado = await this.update(upd.horarioId, upd);
      actualizados.push(actualizado);
    }
    return actualizados;
  },

  async delete(horarioId) {
    const params = {
      TableName: TABLE_NAME,
      Key: marshall({ horarioId })
    };
    await client.send(new DeleteItemCommand(params));
    return true;
  }
};