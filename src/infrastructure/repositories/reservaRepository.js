// src/infrastructure/repositories/reservaRepository.js
const { DynamoDB } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Reserva = require('../../domain/entities/reserva');
const Boom = require('@hapi/boom');

class ReservaRepository {
  constructor() {
    this.tableName = process.env.RESERVAS_TABLE || 'Reservas';
    this.dynamoDb = new DynamoDB.DocumentClient();
  }

  async crearReserva(data) {
    const reservaId = data.reservaId || uuidv4();
    const fechaActual = new Date().toISOString();
    
    const reservaData = {
      ...data,
      reservaId,
      createdAt: data.createdAt || fechaActual,
      updatedAt: fechaActual,
      estado: data.estado || 'Pendiente'
    };

    // Crear la entidad para validar datos
    const reserva = new Reserva(reservaData);
    
    // Guardar en DynamoDB
    try {
      await this.dynamoDb.put({
        TableName: this.tableName,
        Item: reserva
      }).promise();
      
      return reserva;
    } catch (error) {
      console.error('Error al crear reserva:', error);
      throw Boom.badImplementation('Error al guardar la reserva en la base de datos');
    }
  }

  async obtenerReservaPorId(reservaId) {
    try {
      const resultado = await this.dynamoDb.get({
        TableName: this.tableName,
        Key: { reservaId }
      }).promise();

      if (!resultado.Item) {
        throw Boom.notFound(`No se encontró la reserva con ID: ${reservaId}`);
      }

      return new Reserva(resultado.Item);
    } catch (error) {
      if (error.isBoom) throw error;
      console.error('Error al obtener reserva:', error);
      throw Boom.badImplementation('Error al consultar la reserva');
    }
  }

  async obtenerReservasPorUsuario(userId) {
    const params = {
      TableName: this.tableName,
      IndexName: 'UserIdIndex', // Asumiendo que existe un índice secundario para userId
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    try {
      const resultado = await this.dynamoDb.query(params).promise();
      return resultado.Items.map(item => new Reserva(item));
    } catch (error) {
      console.error('Error al consultar reservas del usuario:', error);
      throw Boom.badImplementation('Error al consultar las reservas del usuario');
    }
  }

  async obtenerReservasPorCancha(canchaId) {
    const params = {
      TableName: this.tableName,
      IndexName: 'CanchaIdIndex', // Asumiendo que existe un índice secundario para canchaId
      KeyConditionExpression: 'canchaId = :canchaId',
      ExpressionAttributeValues: {
        ':canchaId': canchaId
      }
    };

    try {
      const resultado = await this.dynamoDb.query(params).promise();
      return resultado.Items.map(item => new Reserva(item));
    } catch (error) {
      console.error('Error al consultar reservas de la cancha:', error);
      throw Boom.badImplementation('Error al consultar las reservas de la cancha');
    }
  }

  async actualizarReserva(reservaId, datosActualizados) {
    try {
      // Primero obtenemos la reserva actual
      const reservaActual = await this.obtenerReservaPorId(reservaId);
      
      // Preparamos los datos actualizados manteniendo los campos no modificados
      const reservaData = {
        ...reservaActual,
        ...datosActualizados,
        reservaId, // Aseguramos mantener el ID original
        updatedAt: new Date().toISOString()
      };
      
      // Validamos con la entidad
      const reservaActualizada = new Reserva(reservaData);
      
      // Actualizar en DynamoDB
      await this.dynamoDb.put({
        TableName: this.tableName,
        Item: reservaActualizada
      }).promise();
      
      return reservaActualizada;
    } catch (error) {
      if (error.isBoom) throw error;
      console.error('Error al actualizar reserva:', error);
      throw Boom.badImplementation('Error al actualizar la reserva');
    }
  }

  async eliminarReserva(reservaId) {
    try {
      // Verificar que la reserva existe
      await this.obtenerReservaPorId(reservaId);
      
      // Eliminar la reserva
      await this.dynamoDb.delete({
        TableName: this.tableName,
        Key: { reservaId }
      }).promise();
      
      return { eliminado: true, reservaId };
    } catch (error) {
      if (error.isBoom) throw error;
      console.error('Error al eliminar reserva:', error);
      throw Boom.badImplementation('Error al eliminar la reserva');
    }
  }

  async cambiarEstadoReserva(reservaId, nuevoEstado, motivoCancelacion = null) {
    try {
      const reserva = await this.obtenerReservaPorId(reservaId);
      
      // Validar transiciones de estado permitidas
      const estadoActual = reserva.estado;
      const transicionesValidas = {
        'Pendiente': ['Pagado', 'Cancelado'],
        'Pagado': ['Cancelado'],
        'Cancelado': []
      };
      if (!transicionesValidas[estadoActual] || !transicionesValidas[estadoActual].includes(nuevoEstado)) {
        throw Boom.badRequest(`Transición inválida de '${estadoActual}' a '${nuevoEstado}'`);
      }
      if (estadoActual === nuevoEstado) {
        throw Boom.badRequest('La reserva ya está en el estado solicitado');
      }
      
      // Preparar datos actualizados
      const datosActualizados = {
        estado: nuevoEstado,
        updatedAt: new Date().toISOString()
      };
      
      // Agregar motivo de cancelación si aplica
      if (nuevoEstado === 'Cancelado' && motivoCancelacion) {
        datosActualizados.cancelacionMotivo = motivoCancelacion;
      }
      
      return await this.actualizarReserva(reservaId, datosActualizados);
    } catch (error) {
      if (error.isBoom) throw error;
      console.error('Error al cambiar estado de reserva:', error);
      throw Boom.badImplementation('Error al cambiar el estado de la reserva');
    }
  }

 

  async buscarReservas(filtros = {}, opciones = {}) {
    // Construir expresiones dinámicas para la consulta
    let filterExpression = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};
    
    // Procesamiento de filtros
    if (filtros.estado) {
      filterExpression.push('#estado = :estado');
      expressionAttributeNames['#estado'] = 'estado';
      expressionAttributeValues[':estado'] = filtros.estado;
    }
    
    if (filtros.fechaDesde) {
      // Asumiendo que hay un campo fecha en la reserva para filtrar
      // Podrías ajustar esto según tu modelo de datos
      filterExpression.push('fechaReserva >= :fechaDesde');
      expressionAttributeValues[':fechaDesde'] = filtros.fechaDesde;
    }
    
    if (filtros.fechaHasta) {
      filterExpression.push('fechaReserva <= :fechaHasta');
      expressionAttributeValues[':fechaHasta'] = filtros.fechaHasta;
    }
    
    // Parámetros para scan (podría ser query si hay índices adecuados)
    const params = {
      TableName: this.tableName,
      Limit: opciones.limite || 100,
      ExclusiveStartKey: opciones.paginationToken
    };
    
    // Agregar filtros si existen
    if (filterExpression.length > 0) {
      params.FilterExpression = filterExpression.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
      
      if (Object.keys(expressionAttributeNames).length > 0) {
        params.ExpressionAttributeNames = expressionAttributeNames;
      }
    }
    
    try {
      const resultado = await this.dynamoDb.scan(params).promise();
      
      return {
        items: resultado.Items.map(item => new Reserva(item)),
        lastEvaluatedKey: resultado.LastEvaluatedKey // Para paginación
      };
    } catch (error) {
      console.error('Error al buscar reservas:', error);
      throw Boom.badImplementation('Error al buscar reservas');
    }
  }
}

module.exports = new ReservaRepository();