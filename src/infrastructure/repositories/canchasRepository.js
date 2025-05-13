// src/infrastructure/repositories/canchasRepository.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const Cancha = require('../../domain/entities/cancha');

class CanchasRepository {
  constructor() {
    this.CANCHAS_TABLE = process.env.CANCHAS_TABLE || 'Canchas';
  }

  async save(cancha) {
    const params = {
      TableName: this.CANCHAS_TABLE,
      Item: cancha
    };
    await dynamoDB.put(params).promise();
    return cancha;
  }

  async findById(canchaId) {
    const params = {
      TableName: this.CANCHAS_TABLE,
      Key: { canchaId }
    };
    const result = await dynamoDB.get(params).promise();
    return result.Item || null;
  }

  async update(canchaId, updateData) {
    const updateExpression = [];
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    for (const key in updateData) {
      updateExpression.push(`#${key} = :${key}`);
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = updateData[key];
    }
    const params = {
      TableName: this.CANCHAS_TABLE,
      Key: { canchaId },
      UpdateExpression: 'SET ' + updateExpression.join(', '),
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    const result = await dynamoDB.update(params).promise();
    return result.Attributes;
  }

  async delete(canchaId) {
    const params = {
      TableName: this.CANCHAS_TABLE,
      Key: { canchaId }
    };
    await dynamoDB.delete(params).promise();
    return { canchaId };
  }

  async findAll(options = {}) {
    const params = {
      TableName: this.CANCHAS_TABLE,
      Limit: options.limit ? Number(options.limit) : undefined,
      ExclusiveStartKey: options.lastEvaluatedKey || undefined
    };
    // Eliminar propiedades undefined
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
    const result = await dynamoDB.scan(params).promise();
    let items = result.Items || [];
    
    // Filtros simples en memoria
    if (options.tipo) {
      items = items.filter(c => c.tipo === options.tipo);
    }
    if (options.disponible !== undefined) {
      if (options.disponible) {
        items = items.filter(c => c.estado === 'activa' && c.capacidad > 0);
      } else {
        items = items.filter(c => c.estado !== 'activa' || c.capacidad <= 0);
      }
    }
    if (options.centroId) {
      items = items.filter(c => c.centroId === options.centroId);
    }
    
    return {
      items,
      lastEvaluatedKey: result.LastEvaluatedKey || null,
      count: items.length
    };
  }
  
  async findAllByCentro(centroId, options = {}) {
    // Usar el índice CentroIdIndex que coincide con el campo centroId de la entidad
    const params = {
      TableName: this.CANCHAS_TABLE,
      IndexName: 'CentroIdIndex',
      KeyConditionExpression: 'centroId = :centroId',
      ExpressionAttributeValues: {
        ':centroId': centroId
      },
      Limit: options.limit ? Number(options.limit) : undefined,
      ExclusiveStartKey: options.lastEvaluatedKey || undefined
    };
    // Eliminar propiedades undefined
    Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);
    const result = await dynamoDB.query(params).promise();
    
    // Ya no necesitamos mapear los resultados porque el campo en la tabla y en la entidad es el mismo
    let items = result.Items || [];
    
    // Filtros simples en memoria: tipo y disponible
    if (options.tipo) {
      items = items.filter(c => c.tipo === options.tipo);
    }
    if (options.disponible !== undefined) {
      if (options.disponible) {
        items = items.filter(c => c.estado === 'activa' && c.capacidad > 0);
      } else {
        items = items.filter(c => c.estado !== 'activa' || c.capacidad <= 0);
      }
    }
    
    return {
      items,
      lastEvaluatedKey: result.LastEvaluatedKey || null,
      count: items.length
    };
  }
}

module.exports = new CanchasRepository();
