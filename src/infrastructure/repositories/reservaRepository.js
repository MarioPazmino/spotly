// src/infrastructure/repositories/reservaRepository.js
const { DynamoDB } = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Reserva = require('../../domain/entities/reserva');
const Boom = require('@hapi/boom');
const HorariosRepository = require('./horariosRepository');
const CuponDescuentoRepository = require('./cuponDescuentoRepository');

class ReservaRepository {
  constructor() {
    this.tableName = process.env.RESERVAS_TABLE || 'Reservas';
    this.dynamoDb = new DynamoDB.DocumentClient();
  }

  async crearReserva(data) {
    // Validar cupón si se aplica
    if (data.codigoPromoAplicado) {
      const cuponRepo = CuponDescuentoRepository;
      const cupon = await cuponRepo.findByCodigo(data.codigoPromoAplicado);
      if (!cupon) {
        throw Boom.notFound('El cupón no existe.');
      }
      const hoy = new Date();
      const inicio = new Date(cupon.fechaInicio);
      const fin = new Date(cupon.fechaFin);
      if (hoy < inicio || hoy > fin) {
        throw Boom.badRequest('El cupón no está vigente.');
      }
    }

    // Validar que los horarioIds no estén ocupados
    const horariosRepository = require('../repositories/horariosRepository');
    if (!Array.isArray(data.horarioIds) || data.horarioIds.length === 0) {
      throw Boom.badRequest('La reserva debe incluir al menos un horario.');
    }
    // Buscar si alguno de los horarios ya está reservado
    for (const horarioId of data.horarioIds) {
      const horario = await horariosRepository.getById(horarioId);
      if (!horario) {
        throw Boom.notFound(`El horario ${horarioId} no existe.`);
      }
      // Considera ocupado si tiene reservaId asignado o estado Reservado/Pagado
      if (horario.reservaId || ['Reservado', 'Pagado', 'Ocupado'].includes(horario.estado)) {
        throw Boom.conflict(`El horario ${horarioId} ya está reservado u ocupado.`);
      }
    }

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
      // Primero guardamos la reserva
      await this.dynamoDb.put({
        TableName: this.tableName,
        Item: reserva
      }).promise();
      
      // Después actualizamos el estado de los horarios a 'Reservado'
      const horariosRepository = require('../repositories/horariosRepository');
      console.log(`Actualizando estado de ${data.horarioIds.length} horarios a 'Reservado' para reserva ${reservaId}`);
      
      let horariosActualizados = 0;
      let erroresActualizacion = [];
      
      for (const horarioId of data.horarioIds) {
        try {
          // Verificar que el horario exista y esté disponible
          const horario = await horariosRepository.getById(horarioId);
          if (!horario) {
            throw new Error(`El horario ${horarioId} no existe`);
          }
          
          if (horario.estado !== 'Disponible') {
            throw new Error(`El horario ${horarioId} no está disponible (estado actual: ${horario.estado})`);
          }
          
          // Actualizar el estado del horario y asociarlo con esta reserva
          await horariosRepository.update(horarioId, {
            estado: 'Reservado',
            reservaId: reservaId,
            updatedAt: new Date().toISOString()
          });
          
          // Verificar que se haya actualizado correctamente
          const horarioActualizado = await horariosRepository.getById(horarioId);
          if (horarioActualizado.estado !== 'Reservado' || horarioActualizado.reservaId !== reservaId) {
            throw new Error(`El horario ${horarioId} no se actualizó correctamente. Estado: ${horarioActualizado.estado}, ReservaId: ${horarioActualizado.reservaId}`);
          }
          
          console.log(`Horario ${horarioId} actualizado exitosamente a estado 'Reservado' para reserva ${reservaId}`);
          horariosActualizados++;
        } catch (horarioError) {
          console.error(`Error al actualizar el horario ${horarioId}:`, horarioError.message);
          erroresActualizacion.push({
            horarioId,
            error: horarioError.message
          });
          // Continuamos con los demás horarios aunque falle uno
        }
      }
      
      console.log(`Actualización de horarios completada: ${horariosActualizados}/${data.horarioIds.length} actualizados correctamente`);
      
      // Si hay errores pero algunos horarios se actualizaron, continuamos pero registramos los errores
      if (erroresActualizacion.length > 0) {
        console.warn(`Se encontraron ${erroresActualizacion.length} errores al actualizar horarios:`, JSON.stringify(erroresActualizacion));
      }
      
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

  async obtenerReservasPorUsuario(userId, options = {}) {
    try {
      // Intenta usar el índice UserIdIndex si existe
      try {
        const indexParams = {
          TableName: this.tableName,
          IndexName: 'UserIdIndex', // Nombre del GSI que debería existir
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId
          }
        };

        if (options.limit) {
          indexParams.Limit = options.limit;
        }

        if (options.lastKey) {
          indexParams.ExclusiveStartKey = options.lastKey;
        }

        console.log(`Buscando reservas para el usuario: ${userId} usando índice UserIdIndex`);
        const indexResult = await this.dynamoDb.query(indexParams).promise();
        console.log(`Reservas encontradas con índice: ${indexResult.Items ? indexResult.Items.length : 0}`);
        return {
          items: indexResult.Items || [],
          lastKey: indexResult.LastEvaluatedKey
        };
      } catch (indexError) {
        // Si el índice no existe o hay otro error, fallback a scan
        console.warn(`No se pudo usar el índice UserIdIndex: ${indexError.message}. Usando scan como alternativa.`);
        
        // Fallback a scan con filter
        const scanParams = {
          TableName: this.tableName,
          FilterExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId
          }
        };

        if (options.limit) {
          scanParams.Limit = options.limit;
        }

        if (options.lastKey) {
          scanParams.ExclusiveStartKey = options.lastKey;
        }

        console.log(`Fallback: Buscando reservas para el usuario: ${userId} usando scan con filtro`);
        const result = await this.dynamoDb.scan(scanParams).promise();
        console.log(`Reservas encontradas con scan: ${result.Items ? result.Items.length : 0}`);
        return {
          items: result.Items || [],
          lastKey: result.LastEvaluatedKey
        };
      }
    } catch (error) {
      console.error('Error al obtener reservas por usuario:', error);
      throw new Error(`Error al obtener reservas: ${error.message}`);
    }
  }

  async obtenerReservasPorCancha(canchaId, options = {}) {
    const params = {
      TableName: this.tableName,
      IndexName: 'CanchaIdIndex', // Usando el índice secundario global que ya está definido
      KeyConditionExpression: 'canchaId = :canchaId',
      ExpressionAttributeValues: {
        ':canchaId': canchaId
      }
    };

    if (options.limit) {
      params.Limit = options.limit;
    }

    if (options.lastKey) {
      params.ExclusiveStartKey = options.lastKey;
    }

    try {
      console.log(`Buscando reservas para la cancha: ${canchaId} usando índice CanchaIdIndex`);
      const result = await this.dynamoDb.query(params).promise();
      console.log(`Reservas encontradas: ${result.Items ? result.Items.length : 0}`);
      return {
        items: result.Items || [],
        lastKey: result.LastEvaluatedKey
      };
    } catch (error) {
      console.error('Error al obtener reservas por cancha:', error);
      throw new Error(`Error al obtener reservas por cancha: ${error.message}`);
    }
  }

  // El método obtenerReservasPorCancha ya está implementado arriba usando scan con FilterExpression



  async eliminarReserva(reservaId) {
    try {
      // Verificar que la reserva existe y obtener sus datos
      const reserva = await this.obtenerReservaPorId(reservaId);
      
      // Liberar los horarios asociados a la reserva
      if (reserva.horarioIds && Array.isArray(reserva.horarioIds) && reserva.horarioIds.length > 0) {
        const horariosRepository = require('../repositories/horariosRepository');
        console.log(`Liberando ${reserva.horarioIds.length} horarios asociados a la reserva ${reservaId}`);
        
        for (const horarioId of reserva.horarioIds) {
          try {
            // Actualizar el estado del horario a 'Disponible' y quitar la referencia a la reserva
            await horariosRepository.update(horarioId, {
              estado: 'Disponible',
              reservaId: null,
              updatedAt: new Date().toISOString(),
              _fromReservaService: true // Indicador especial para permitir actualizar reservaId
            });
            console.log(`Horario ${horarioId} liberado y marcado como 'Disponible'`);
          } catch (horarioError) {
            console.error(`Error al liberar el horario ${horarioId}:`, horarioError);
            // Continuamos con los demás horarios aunque falle uno
          }
        }
      }
      
      // Eliminar la reserva
      await this.dynamoDb.delete({
        TableName: this.tableName,
        Key: { reservaId }
      }).promise();
      
      return { eliminado: true, reservaId, mensaje: 'Reserva eliminada y horarios liberados correctamente' };
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