// src/infrastructure/repositories/horariosRepository.js
const { DynamoDBClient, PutItemCommand, GetItemCommand, QueryCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const Horario = require('../../domain/entities/horarios');

const client = new DynamoDBClient();

function getSchedulesTable() {
  return process.env.SCHEDULES_TABLE || 'Horarios';
}

function normalizarHoraRepo(hora) {
  // Asegurar formato HH:mm
  return hora.includes(':') ? hora : `${hora}:00`;
}

module.exports = {
  /**
   * Crea un nuevo horario
   */
  async create(horarioData) {
    // Generar un UUID para horarioId si no se proporciona
    if (!horarioData.horarioId) {
      const { v4: uuidv4 } = require('uuid');
      horarioData.horarioId = uuidv4();
    }
    
    // Normalizar horas a HH:mm
    if (horarioData.horaInicio) horarioData.horaInicio = normalizarHoraRepo(horarioData.horaInicio);
    if (horarioData.horaFin) horarioData.horaFin = normalizarHoraRepo(horarioData.horaFin);
    
    // Por defecto, un horario nuevo siempre está disponible, pero respetamos el estado si ya viene definido
    // Esto es importante para las actualizaciones donde queremos cambiar el estado a 'Reservado'
    if (!horarioData.estado) {
      horarioData.estado = 'Disponible';
    }
    
    // Creamos una copia limpia de los datos para el horario
    const horarioDataLimpio = {
      horarioId: horarioData.horarioId,
      canchaId: horarioData.canchaId,
      fecha: horarioData.fecha,
      horaInicio: horarioData.horaInicio,
      horaFin: horarioData.horaFin,
      estado: horarioData.estado,
      // Incluir reservaId si existe (importante para las reservas)
      ...(horarioData.reservaId ? { reservaId: horarioData.reservaId } : {}),
      createdAt: horarioData.createdAt || new Date().toISOString(),
      updatedAt: horarioData.updatedAt || new Date().toISOString()
    };
    
    const horario = new Horario(horarioDataLimpio); // Valida datos
    
    const params = {
      TableName: getSchedulesTable(),
      Item: marshall(horario, { convertClassInstanceToMap: true })
    };
    
    await client.send(new PutItemCommand(params));
    return horario;
  },

  /**
   * Obtiene un horario por su ID
   */
  async getById(horarioId) {
    const params = {
      TableName: getSchedulesTable(),
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
      TableName: getSchedulesTable(),
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

  /**
   * Lista horarios por cancha y fecha (usando GSI CanchaFechaIndex)
   */
  async listByCanchaAndFecha(canchaId, fecha, limit = 20, exclusiveStartKey = null, estado = null) {
    const params = {
      TableName: getSchedulesTable(),
      IndexName: 'CanchaFechaIndex',
      KeyConditionExpression: 'canchaId = :canchaId AND fecha = :fecha',
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
   * Actualiza un horario existente
   */
  async update(horarioId, updates) {
    // Primero obtenemos el horario actual para verificar su estado
    const horarioActual = await this.getById(horarioId);
    if (!horarioActual) {
      throw new Error(`Horario con ID ${horarioId} no encontrado`);
    }

    // Permite actualizar solo los campos válidos
    // No permitimos actualizar canchaId para evitar que un horario se mueva a otra cancha
    const allowed = ['fecha', 'horaInicio', 'horaFin', 'estado', 'reservaId'];
    
    // Crear un objeto con solo los campos permitidos
    const datosActualizados = {};
    
    // Añadir updatedAt automáticamente
    datosActualizados.updatedAt = new Date().toISOString();
    
    // Copiar solo los campos permitidos
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        // Normalizar horas a HH:mm
        if ((key === 'horaInicio' || key === 'horaFin') && updates[key]) {
          datosActualizados[key] = normalizarHoraRepo(updates[key]);
        } else {
          datosActualizados[key] = updates[key];
        }
      }
    }
    
    // Imprimir los datos para depuración
    console.log('Datos a actualizar:', JSON.stringify(datosActualizados));
    console.log('Updates recibidos:', JSON.stringify(updates));
    
    // Verificar si se está actualizando el estado y el reservaId
    if (updates.estado === 'Reservado' && updates.reservaId) {
      console.log(`Actualizando horario ${horarioId} a estado Reservado con reservaId ${updates.reservaId}`);
      // Asegurar que estos campos estén incluidos en datosActualizados
      datosActualizados.estado = 'Reservado';
      datosActualizados.reservaId = updates.reservaId;
    }
    
    // Combinar los datos actuales con los actualizados
    const horarioActualizado = {
      ...horarioActual,
      ...datosActualizados
    };
    
    console.log('Horario actualizado completo:', JSON.stringify(horarioActualizado));
    
    // Usar el método create del mismo módulo para actualizar el horario
    // Esto sobrescribe el horario completo con los nuevos datos
    return await module.exports.create(horarioActualizado);
  },

  // Método deleteByCanchaAndRangoFechas eliminado porque no se usa en las rutas actuales

  // Método bulkUpdate eliminado porque no se usa en las rutas actuales

  /**
   * Elimina un horario por su ID
   */
  async delete(horarioId) {
    const params = {
      TableName: getSchedulesTable(),
      Key: marshall({ horarioId })
    };
    await client.send(new DeleteItemCommand(params));
    return { eliminado: true, horarioId };
  }
};