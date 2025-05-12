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
    console.log("Repository: Actualizando cupón", cuponId);
    console.log("Updates recibidos:", JSON.stringify(updates));
    
    // Asegurar que no estamos actualizando el cuponId incorrecto
    if (updates.cuponId && updates.cuponId !== cuponId) {
      console.warn("⚠️ Advertencia: El cuponId en updates no coincide con el cuponId proporcionado");
    }
    
    // Solo permitimos actualizar estos campos
    const allowed = ['codigo', 'tipoDescuento', 'valor', 'fechaInicio', 'fechaFin', 'maximoUsos', 'updatedAt'];
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
    
    console.log("Params para DynamoDB update:", JSON.stringify(params));
    
    const result = await dynamoDB.update(params).promise();
    console.log("Resultado de update:", JSON.stringify(result.Attributes));
    
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
      IndexName: 'CentroIdCodigoIndex', // Usamos el índice que ya existe
      KeyConditionExpression: 'centroId = :centroId',
      ExpressionAttributeValues: { ':centroId': centroId },
      Limit: limit
    };
    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }
    try {
      const result = await dynamoDB.query(params).promise();
      return {
        items: (result.Items || []).map(item => new CuponDescuento(item)),
        lastKey: result.LastEvaluatedKey || null
      };
    } catch (error) {
      console.error('Error al buscar cupones por centroId:', error);
      throw new Error(`Error al buscar cupones: ${error.message}`);
    }
  }
  
  // Buscar cupón por código (sin importar el centro)
  async findByCodigo(codigo) {
    try {
      // Usamos scan porque no tenemos un índice específico para buscar solo por código
      const params = {
        TableName: this.CUPONES_DESCUENTO_TABLE,
        FilterExpression: 'codigo = :codigo',
        ExpressionAttributeValues: { ':codigo': codigo }
      };
      
      const result = await dynamoDB.scan(params).promise();
      return result.Items && result.Items.length > 0 ? new CuponDescuento(result.Items[0]) : null;
    } catch (error) {
      console.error('Error al buscar cupón por código:', error);
      throw new Error(`Error al buscar cupón: ${error.message}`);
    }
  }

  async delete(cuponId) {
    console.log("Repository: Eliminando cupón", cuponId);
    
    try {
      const params = {
        TableName: this.CUPONES_DESCUENTO_TABLE,
        Key: { cuponId },
        ReturnValues: 'ALL_OLD'  // Devuelve el elemento eliminado
      };
      
      const result = await dynamoDB.delete(params).promise();
      
      if (!result.Attributes) {
        throw new Error(`No se encontró el cupón con ID: ${cuponId}`);
      }
      
      console.log("Resultado de delete:", JSON.stringify(result.Attributes));
      
      return {
        eliminado: true,
        cuponId: cuponId,
        detalles: result.Attributes 
      };
    } catch (error) {
      console.error("Error al eliminar cupón:", error);
      throw error;
    }
  }
}

module.exports = new CuponDescuentoRepository();