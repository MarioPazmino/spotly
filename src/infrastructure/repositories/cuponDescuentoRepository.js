// src/infrastructure/repositories/cuponDescuentoRepository.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const CuponDescuento = require('../../domain/entities/cupon-descuento');
const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');

const TABLE_NAME = process.env.CUPONES_DESCUENTO_TABLE || 'CuponesDescuento';

class CuponDescuentoRepository {
  async create(data) {
    const cupon = new CuponDescuento({ ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await dynamoDB.put({ TableName: TABLE_NAME, Item: cupon }).promise();
    return cupon;
  }
  async getById(cuponId) {
    const result = await dynamoDB.get({ TableName: TABLE_NAME, Key: { cuponId } }).promise();
    return result.Item ? new CuponDescuento(result.Item) : null;
  }
  async findByCodigo(codigo) {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'CodigoIndex', // Debes tener un GSI en codigo
      KeyConditionExpression: 'codigo = :codigo',
      ExpressionAttributeValues: { ':codigo': codigo }
    };
    const result = await dynamoDB.query(params).promise();
    return result.Items && result.Items.length ? new CuponDescuento(result.Items[0]) : null;
  }
  async update(cuponId, updates) {
    const allowed = ['centroId', 'codigo', 'tipoDescuento', 'valor', 'fechaInicio', 'fechaFin', 'maximoUsos', 'usosRestantes', 'updatedAt'];
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
      TableName: TABLE_NAME,
      Key: { cuponId },
      UpdateExpression: 'SET ' + updateExpr.join(', '),
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW'
    };
    const result = await dynamoDB.update(params).promise();
    return new CuponDescuento(result.Attributes);
  }
  async delete(cuponId) {
    await dynamoDB.delete({ TableName: TABLE_NAME, Key: { cuponId } }).promise();
    return true;
  }

  // Buscar cupón por centroId y código usando el índice CentroIdCodigoIndex
  async findByCentroIdYCodigo(centroId, codigo) {
    const params = {
      TableName: TABLE_NAME,
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

  // Descuenta un uso de forma atómica y segura
  async descontarUsoSeguro(cuponId) {
    const params = {
      TableName: TABLE_NAME,
      Key: { cuponId },
      UpdateExpression: 'SET usosRestantes = usosRestantes - :uno',
      ConditionExpression: 'usosRestantes > :cero',
      ExpressionAttributeValues: {
        ':uno': 1,
        ':cero': 0
      },
      ReturnValues: 'ALL_NEW'
    };
    try {
      const result = await dynamoDB.update(params).promise();
      return new CuponDescuento(result.Attributes);
    } catch (err) {
      if (err.code === 'ConditionalCheckFailedException') return null;
      throw err;
    }
  }

  // Obtener todos los cupones de un centro
  async findAllByCentroId(centroId, limit = 20, lastKey = undefined) {
    const params = {
      TableName: TABLE_NAME,
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