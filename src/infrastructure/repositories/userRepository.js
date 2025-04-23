//src/infrastructure/repositories/userRepository.js

const AWS = require('aws-sdk');
const { USUARIOS_TABLE } = process.env;
const dynamoDB = new AWS.DynamoDB.DocumentClient();

class UserRepository {
  async findByEmail(email) {
    const params = {
      TableName: USUARIOS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    };
    
    const result = await dynamoDB.query(params).promise();
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  }

  async save(user) {
    const params = {
      TableName: USUARIOS_TABLE,
      Item: user,
    };
    
    await dynamoDB.put(params).promise();
    return user;
  }

  async findById(userId) {
    const params = {
      TableName: USUARIOS_TABLE,
      Key: {
        userId: userId,
      },
    };
    
    const result = await dynamoDB.get(params).promise();
    return result.Item || null;
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
      TableName: USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    
    const result = await dynamoDB.update(params).promise();
    return result.Attributes || null;
  }

  async delete(userId) {
    const params = {
      TableName: USUARIOS_TABLE,
      Key: {
        userId: userId,
      },
      ReturnValues: 'ALL_OLD',
    };
    
    const result = await dynamoDB.delete(params).promise();
    return result.Attributes || null;
  }

  async findAll() {
    const params = {
      TableName: USUARIOS_TABLE,
    };
    
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
  }
}

module.exports = UserRepository;