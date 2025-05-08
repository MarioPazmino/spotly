// src/infrastructure/repositories/cuponDescuentoRepository.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const CuponDescuento = require('../../domain/entities/cupon-descuento');

class CuponDescuentoRepository {
  constructor() {
    this.CUPONES_DESCUENTO_TABLE = process.env.CUPONES_DESCUENTO_TABLE;
  }

  async create(data) {
    const cuponId = data.cuponId || require('uuid').v4();
    const fechaActual = new Date().toISOString();
    const cupon = {
      ...data,
      cuponId,
      createdAt: fechaActual,
      updatedAt: fechaActual
    };
    await dynamoDB.put({
      TableName: this.CUPONES_DESCUENTO_TABLE,
      Item: cupon
    }).promise();
    return new CuponDescuento(cupon);
  }

  async update(cuponId, updates) {
    const allowed = ['centroId', 'codigo', 'tipoDescuento', 'valor', 'fechaInicio', 'fechaFin', 'maximoUsos', 'updatedAt'];
    const updateExpr = [];
    const exprAttrNames = {};
    const exprAttrValues = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        updateExpr.push(`#${key} = :${key}`);
        exprAttrNames[`#${key}`] = key;
        exprAttrValues[`:${key}`] = updates[key];
      }
    }
    if (updateExpr.length === 0) throw new Error('Nada para actualizar');
    exprAttrValues[':updatedAt'] = new Date().toISOString();
    updateExpr.push('#updatedAt = :updatedAt');
    exprAttrNames['#updatedAt'] = 'updatedAt';
    const params = {
      TableName: this.CUPONES_DESCUENTO_TABLE,
      Key: { cuponId },
      UpdateExpression: 'SET ' + updateExpr.join(', '),
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW'
    };
    const result = await dynamoDB.update(params).promise();
    return new CuponDescuento(result.Attributes);
  }

  async getById(cuponId) {
    const result = await dynamoDB.get({
      TableName: this.CUPONES_DESCUENTO_TABLE,
      Key: { cuponId }
    }).promise();
    return result.Item ? new CuponDescuento(result.Item) : null;
  }

  // Buscar cupón por centroId y código usando el índice CentroIdCodigoIndex
  async findByCentroIdYCodigo(centroId, codigo) {
    const params = {
      TableName: this.CUPONES_DESCUENTO_TABLE,
      IndexName: 'CentroIdCodigoIndex',
      KeyConditionExpression: 'centroId = :centroId AND codigo = :codigo',
      ExpressionAttributeValues: {
        ':centroId': centroId,
        ':codigo': codigo
      }
    };
    const result = await dynamoDB.query(params).promise();
    return result.Items && result.Items.length ? new CuponDescuento(result.Items[0]) : null;
  }

  // Obtener todos los cupones de un centro
  async findAllByCentroId(centroId, limit = 20, lastKey = undefined) {
    const params = {
      TableName: this.CUPONES_DESCUENTO_TABLE,
      IndexName: 'CentroIdIndex', // Debes tener un GSI en centroId
      KeyConditionExpression: 'centroId = :centroId',
      ExpressionAttributeValues: { ':centroId': centroId },
      Limit: limit
    };
    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }
    const result = await dynamoDB.query(params).promise();
    return {
      items: (result.Items || []).map(item => new CuponDescuento(item)),
      lastKey: result.LastEvaluatedKey || null
    };
  }
}

module.exports = CuponDescuentoRepository;