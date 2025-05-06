//src/infrastructure/repositories/pagosRepository.js
const { v4: uuidv4 } = require('uuid');
const Pago = require('../../domain/entities/pagos');
const { DynamoDB } = require('aws-sdk');
const AWS = require('aws-sdk');

class PagosRepository {
  constructor() {
    this.tableName = process.env.PAGOS_TABLE || 'Pagos';
    this.dynamoDb = new DynamoDB.DocumentClient();
    this.dynamoDB = new AWS.DynamoDB.DocumentClient();
  }

  async crearPago(data) {
    const pagoId = data.pagoId || uuidv4();
    const fechaActual = new Date().toISOString();
    const pagoData = {
      ...data,
      pagoId,
      createdAt: data.createdAt || fechaActual,
      updatedAt: fechaActual
    };
    const pago = new Pago(pagoData);
    await this.dynamoDb.put({ TableName: this.tableName, Item: pago }).promise();
    return pago;
  }

  async obtenerPagoPorId(pagoId) {
    const result = await this.dynamoDb.get({ TableName: this.tableName, Key: { pagoId } }).promise();
    return result.Item ? new Pago(result.Item) : null;
  }

  async obtenerPagosPorReserva(reservaId) {
    const params = {
      TableName: this.tableName,
      IndexName: 'ReservaIdIndex', // Debe existir un GSI en reservaId
      KeyConditionExpression: 'reservaId = :reservaId',
      ExpressionAttributeValues: { ':reservaId': reservaId },
    };
    const result = await this.dynamoDb.query(params).promise();
    return (result.Items || []).map(item => new Pago(item));
  }

  async actualizarPago(pagoId, updates) {
    // No permitir cambiar campos críticos
    const camposNoPermitidos = ['metodoPago', 'userId', 'reservaId', 'monto', 'createdAt', 'pagoId'];
    for (const campo of camposNoPermitidos) {
      if (updates[campo] !== undefined) {
        throw new Error(`No está permitido modificar el campo '${campo}' en un pago existente.`);
      }
    }
    updates.updatedAt = new Date().toISOString();
    // Solo permite actualizar estado y detallesPago
    const allowedFields = ['estado', 'detallesPago', 'updatedAt'];
    const updateExpr = [];
    const exprAttrNames = {};
    const exprAttrValues = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateExpr.push(`#${field} = :${field}`);
        exprAttrNames[`#${field}`] = field;
        exprAttrValues[`:${field}`] = updates[field];
      }
    }
    if (updateExpr.length === 0) throw new Error('No hay campos válidos para actualizar');
    const params = {
      TableName: this.tableName,
      Key: { pagoId },
      UpdateExpression: 'SET ' + updateExpr.join(', '),
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    };
    const result = await this.dynamoDb.update(params).promise();
    return new Pago(result.Attributes);
  }

  async eliminarPago(pagoId) {
    await this.dynamoDb.delete({ TableName: this.tableName, Key: { pagoId } }).promise();
    return true;
  }

  /**
   * Lista pagos con paginación y filtros
   * @param {Object} filters - Filtros: userId, centroId, estado, metodoPago
   * @param {Object} options - Opciones de paginación: limit, lastEvaluatedKey
   * @returns {Promise<Object>} - { items, lastEvaluatedKey, count }
   */
  async findAll(filters = {}, options = {}) {
    const { userId, centroId, estado, metodoPago } = filters;
    let params = {
      TableName: this.tableName,
      Limit: options.limit || 20
    };

    // Si hay filtros específicos, usar el índice correspondiente
    if (userId) {
      params.IndexName = 'UserIdIndex';
      params.KeyConditionExpression = 'userId = :uid';
      params.ExpressionAttributeValues = { ':uid': userId };
    } else if (centroId) {
      params.IndexName = 'CentroIdIndex';
      params.KeyConditionExpression = 'centroId = :cid';
      params.ExpressionAttributeValues = { ':cid': centroId };
    }

    // Agregar filtros adicionales si existen
    if (estado || metodoPago) {
      params.FilterExpression = [];
      params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};

      if (estado) {
        params.FilterExpression.push('estado = :est');
        params.ExpressionAttributeValues[':est'] = estado;
      }

      if (metodoPago) {
        params.FilterExpression.push('metodoPago = :met');
        params.ExpressionAttributeValues[':met'] = metodoPago;
      }

      params.FilterExpression = params.FilterExpression.join(' AND ');
    }

    if (options.lastEvaluatedKey) {
      params.ExclusiveStartKey = options.lastEvaluatedKey;
    }

    const result = await this.dynamoDb.scan(params).promise();
    return {
      items: (result.Items || []).map(item => new Pago(item)),
      lastEvaluatedKey: result.LastEvaluatedKey,
      count: result.Count
    };
  }

  /**
   * Lista pagos por centro deportivo con paginación
   * @param {string} centroId - ID del centro deportivo
   * @param {Object} options - Opciones de paginación: limit, lastEvaluatedKey
   * @returns {Promise<Object>} - { items, lastEvaluatedKey, count }
   */
  async findAllByCentro(centroId, options = {}) {
    const params = {
      TableName: this.tableName,
      IndexName: 'CentroIdIndex',
      KeyConditionExpression: 'centroId = :cid',
      ExpressionAttributeValues: {
        ':cid': centroId
      },
      Limit: options.limit || 20
    };

    if (options.lastEvaluatedKey) {
      params.ExclusiveStartKey = options.lastEvaluatedKey;
    }

    const result = await this.dynamoDb.query(params).promise();
    return {
      items: (result.Items || []).map(item => new Pago(item)),
      lastEvaluatedKey: result.LastEvaluatedKey,
      count: result.Count
    };
  }

  /**
   * Lista pagos por usuario con paginación
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de paginación: limit, lastEvaluatedKey
   * @returns {Promise<Object>} - { items, lastEvaluatedKey, count }
   */
  async findAllByUser(userId, options = {}) {
    const params = {
      TableName: this.tableName,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      },
      Limit: options.limit || 20
    };

    if (options.lastEvaluatedKey) {
      params.ExclusiveStartKey = options.lastEvaluatedKey;
    }

    const result = await this.dynamoDb.query(params).promise();
    return {
      items: (result.Items || []).map(item => new Pago(item)),
      lastEvaluatedKey: result.LastEvaluatedKey,
      count: result.Count
    };
  }

  /**
   * Obtener pago por ID de transacción de Braintree
   * @param {string} transactionId - ID de la transacción
   * @returns {Promise<Object>} Pago encontrado
   */
  async findByTransactionId(transactionId) {
    const params = {
      TableName: this.tableName,
      IndexName: 'TransactionIdIndex',
      KeyConditionExpression: 'braintreeTransactionId = :tid',
      ExpressionAttributeValues: {
        ':tid': transactionId
      }
    };

    const result = await this.dynamoDB.query(params).promise();
    return result.Items[0];
  }
}

module.exports = PagosRepository;
