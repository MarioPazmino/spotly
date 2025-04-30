//src/infrastructure/repositories/userRepository.js
const AWS = require('aws-sdk');
const { USUARIOS_TABLE } = process.env;
const dynamoDB = new AWS.DynamoDB.DocumentClient();

class UserRepository {
  constructor() {
    this.USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    this.dynamoDB = new AWS.DynamoDB.DocumentClient();
  }
  // Obtener usuario por email con manejo de errores
  async findByEmail(email) {
    const params = {
      TableName: this.USUARIOS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email
      }
    };
    try {
      const result = await this.dynamoDB.query(params).promise();
      return result.Items?.[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }
  // Guardar usuario con validación de datos básicos
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
  // Obtener usuario por ID
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
  // Actualizar usuario con control de campos sensibles
  async update(userId, updateData) {
    // Validar que no se intenten modificar campos sensibles sin autorización
    const sensitiveFields = ['role', 'pendienteAprobacion'];
    const attemptedSensitiveFields = Object.keys(updateData).filter(field => 
      sensitiveFields.includes(field)
    );
    if (attemptedSensitiveFields.length > 0) {
      throw new Error(`Cannot update sensitive fields: ${attemptedSensitiveFields.join(', ')}`);
    }
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
  // Eliminar usuario
  async delete(userId) {
    const params = {
      TableName: this.USUARIOS_TABLE,
      Key: { userId },
      ReturnValues: 'ALL_OLD'
    };
    try {
      const result = await this.dynamoDB.delete(params).promise();
      return result.Attributes || null;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  // Obtener administradores pendientes con paginación
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
  // Actualizar estado de aprobación (permite actualizar otros campos relacionados)
  async updateApprovalStatus(userId, status, additionalUpdates = {}) {
    return this.update(userId, {
      pendienteAprobacion: status,
      ...additionalUpdates
    });
  }
  // Validar rol del usuario con mensajes detallados
  async validateUserRole(userId, requiredRole) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    if (user.role !== requiredRole) {
      throw new Error(`User ${userId} has role '${user.role}' but required role is '${requiredRole}'`);
    }
    return true;
  }
  // Validación especializada para clientes
  async ensureIsCliente(userId) {
    const user = await this.findById(userId);
    if (!user || user.role !== 'cliente') {
      throw new Error(`User ${userId} is not a cliente`);
    }
    return true;
  }

  // Validación especializada para administradores (incluye pendientes)
  async ensureIsAdmin(userId, mustBeApproved = true) {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    const isAdmin = user.role === 'admin_centro' || user.role === 'super_admin';
    if (!isAdmin) {
      throw new Error(`User ${userId} is not an administrator`);
    }
    if (mustBeApproved && user.pendienteAprobacion === 'true') {
      throw new Error(`Administrator ${userId} is pending approval`);
    }
    return true;
  }
}
module.exports = new UserRepository();