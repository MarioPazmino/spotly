//src/infrastructure/repositories/centroDeportivoRepository.js
const AWS = require('aws-sdk');
const CentroDeportivo = require('../../domain/entities/centro-deportivo');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

class CentroDeportivoRepository {
  constructor() {
    this.TABLE_NAME = process.env.CENTROS_DEPORTIVOS_TABLE;
  }

  async save(centro) {
    const params = {
      TableName: this.TABLE_NAME,
      Item: centro
    };
    await dynamoDB.put(params).promise();
    return centro;
  }

  async findById(centroId) {
    const params = {
      TableName: this.TABLE_NAME,
      Key: { centroId }
    };
    const result = await dynamoDB.get(params).promise();
    return result.Item ? new CentroDeportivo(result.Item) : null;
  }

  async update(centroId, updateData) {
    // Construye la expresión de actualización dinámicamente
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const [key, value] of Object.entries(updateData)) {
      updateExpressionParts.push(`#${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
      expressionAttributeNames[`#${key}`] = key;
    }
    const params = {
      TableName: this.TABLE_NAME,
      Key: { centroId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    const result = await dynamoDB.update(params).promise();
    return result.Attributes ? new CentroDeportivo(result.Attributes) : null;
  }

  async delete(centroId) {
    const params = {
      TableName: this.TABLE_NAME,
      Key: { centroId }
    };
    await dynamoDB.delete(params).promise();
    return { centroId, deleted: true };
  }

  // Puedes agregar más métodos como buscar por usuario, listar todos, etc.
}

module.exports = CentroDeportivoRepository;