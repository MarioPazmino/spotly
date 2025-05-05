//src/infrastructure/repositories/pagosRepository.js
const { v4: uuidv4 } = require('uuid');
const Pago = require('../../domain/entities/pagos');
const { DynamoDB } = require('aws-sdk');

class PagosRepository {
  constructor() {
    this.tableName = process.env.PAGOS_TABLE || 'Pagos';
    this.dynamoDb = new DynamoDB.DocumentClient();
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
    const camposNoPermitidos = ['metodoPago', 'userId', 'reservaId', 'monto', 'createdAt', 'comisionPlataforma', 'pagoId'];
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
}

module.exports = PagosRepository;
