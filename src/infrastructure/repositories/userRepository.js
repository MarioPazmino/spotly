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


  async findAll(options = {}) {
    const { limit = 20, lastEvaluatedKey = null, role = null, searchTerm = null } = options;
    
    // Configuración básica para scan
    const params = {
      TableName: this.USUARIOS_TABLE,
      Limit: limit
    };
    
    // Agregar filtros si se especifican
    let filterExpressions = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};
    
    // Filtrar por rol si se especifica
    if (role) {
      filterExpressions.push('#role = :role');
      expressionAttributeValues[':role'] = role;
      expressionAttributeNames['#role'] = 'role';
    }
    
    // Filtrar por término de búsqueda si se especifica
    if (searchTerm) {
      filterExpressions.push('contains(#name, :searchTerm) OR contains(#email, :searchTerm)');
      expressionAttributeValues[':searchTerm'] = searchTerm;
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeNames['#email'] = 'email';
    }
    
    // Agregar expresiones de filtro si existen
    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
      params.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    // Agregar clave de inicio para paginación
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }
    
    try {
      const result = await this.dynamoDB.scan(params).promise();
      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count
      };
    } catch (error) {
      console.error('Error al listar usuarios:', error);
      throw error;
    }
  }

  async update(userId, updateData) {
    // Primero verificar si el usuario existe
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new Error(`Usuario con ID ${userId} no encontrado`);
    }
    
    // Crear una copia de los datos para no modificar el objeto original
    const dataToUpdate = { ...updateData };
    
    // Siempre actualizar el updatedAt, pero asegurarse de que no esté duplicado
    dataToUpdate.updatedAt = new Date().toISOString();
    
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const [key, value] of Object.entries(dataToUpdate)) {
      const valueKey = `:${key}`;
      const nameKey = `#${key}`;
      updateExpressionParts.push(`${nameKey} = ${valueKey}`);
      expressionAttributeValues[valueKey] = value;
      expressionAttributeNames[nameKey] = key;
    }

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

  async delete(userId) {
    const params = {
      TableName: this.USUARIOS_TABLE,
      Key: { userId },
      ReturnValues: 'ALL_OLD'
    };
    
    try {
      const result = await this.dynamoDB.delete(params).promise();
      return result.Attributes || { userId, deleted: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = UserRepository;