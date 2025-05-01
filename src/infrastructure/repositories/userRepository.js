//src/infrastructure/repositories/userRepository.js
const AWS = require('aws-sdk');

class UserRepository {
  constructor() {
    this.USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    this.dynamoDB = new AWS.DynamoDB.DocumentClient();
  }

  async save(user) {
    if (!user.userId || !user.email) {
      throw new Error('User must have userId and email');
    }
    const params = {
      TableName: this.USUARIOS_TABLE,
      Item: user
    };
    try {
      await this.dynamoDB.put(params).promise();
      return user;
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  async findById(userId) {
    const params = {
      TableName: this.USUARIOS_TABLE,
      Key: { userId }
    };
    try {
      const result = await this.dynamoDB.get(params).promise();
      return result.Item || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findPendingAdmins(limit = 20, lastEvaluatedKey = null) {
    const params = {
      TableName: this.USUARIOS_TABLE,
      IndexName: 'PendienteAprobacionIndex',
      KeyConditionExpression: 'pendienteAprobacion = :pendiente',
      ExpressionAttributeValues: {
        ':pendiente': 'true'
      },
      Limit: limit
    };
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    try {
      const result = await this.dynamoDB.query(params).promise();
      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count
      };
    } catch (error) {
      console.error('Error finding pending admins:', error);
      throw error;
    }
  }

  async updateApprovalStatus(userId, status) {
    const params = {
      TableName: this.USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: 'set pendienteAprobacion = :status, updatedAt = :now',
      ExpressionAttributeValues: {
        ':status': status,
        ':now': new Date().toISOString()
      }
    };
    try {
      await this.dynamoDB.update(params).promise();
    } catch (error) {
      console.error('Error actualizando estado de aprobación:', error);
      throw error;
    }
  }


  async update(userId, updateData) {
    const updateExpressionParts = [];
    const expressionAttributeValues = { ':updatedAt': new Date().toISOString() };
    const expressionAttributeNames = { '#updatedAt': 'updatedAt' };

    for (const [key, value] of Object.entries(updateData)) {
      const valueKey = `:${key}`;
      const nameKey = `#${key}`;
      updateExpressionParts.push(`${nameKey} = ${valueKey}`);
      expressionAttributeValues[valueKey] = value;
      expressionAttributeNames[nameKey] = key;
    }

    updateExpressionParts.push('#updatedAt = :updatedAt');

    const params = {
      TableName: this.USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    try {
      const result = await this.dynamoDB.update(params).promise();
      return result.Attributes || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

module.exports = new UserRepository();