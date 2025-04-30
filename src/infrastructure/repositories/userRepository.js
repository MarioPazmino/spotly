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

  async findByCognitoId(cognitoId) {
    const params = {
      TableName: USUARIOS_TABLE,
      IndexName: 'CognitoIdIndex',
      KeyConditionExpression: 'cognitoId = :cognitoId',
      ExpressionAttributeValues: {
        ':cognitoId': cognitoId,
      },
    };
    const result = await dynamoDB.query(params).promise();
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  }
  async findByRole(role, options = {}) {
    const params = {
      TableName: USUARIOS_TABLE,
      FilterExpression: 'role = :role',
      ExpressionAttributeValues: {
        ':role': role
      }
    };
    const result = await dynamoDB.scan(params).promise();
    return result.Items || [];
  }
  
  async updateLastLogin(userId) {
    const params = {
      TableName: USUARIOS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET lastLogin = :now, updatedAt = :now',
      ExpressionAttributeValues: {
        ':now': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };
    const result = await dynamoDB.update(params).promise();
    return result.Attributes || null;
  }

  async findAll(options = {}) {
    const { limit = 20, lastEvaluatedKey, filters = {} } = options;
    let params = {
      TableName: USUARIOS_TABLE,
      Limit: limit
    };
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastEvaluatedKey, 'base64').toString());
    }
    if (Object.keys(filters).length > 0) {
      const filterExpressions = [];
      params.ExpressionAttributeValues = {};
      params.ExpressionAttributeNames = {};
      Object.entries(filters).forEach(([key, value]) => {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        filterExpressions.push(`${attrName} = ${attrValue}`);
        params.ExpressionAttributeValues[attrValue] = value;
        params.ExpressionAttributeNames[attrName] = key;
      });
      params.FilterExpression = filterExpressions.join(' AND ');
    }
    const result = await dynamoDB.scan(params).promise();
    return {
      items: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') 
        : null,
      count: result.Count
    };
  }
}

module.exports = UserRepository;