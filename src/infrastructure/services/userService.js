//src/infrastructure/services/userService.js
const AWS = require('aws-sdk');
const Boom = require('@hapi/boom');
const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/userRepository');
const logger = require('../../utils/logger');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.cognito = new AWS.CognitoIdentityServiceProvider();
    this.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
    this.ADMIN_CENTRO_GROUP_NAME = process.env.ADMIN_CENTRO_GROUP_NAME;
    this.SUPER_ADMIN_GROUP_NAME = process.env.SUPER_ADMIN_GROUP_NAME;
    this.CLIENTE_GROUP_NAME = process.env.CLIENTE_GROUP_NAME;
  }
  async registerUser(userData, clientId) {
    try {
      // Validar datos de entrada
      this.validateRegistrationData(userData, clientId);

      // Crear usuario en base de datos
      const userId = uuidv4();
      const newUser = {
        userId,
        ...userData,
        pendienteAprobacion: userData.role === 'admin_centro' ? 'true' : 'false', // Pendiente solo para admin_centro
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.userRepository.save(newUser);

      // Crear usuario en Cognito
      await this.cognito.adminCreateUser({
        UserPoolId: this.COGNITO_USER_POOL_ID,
        Username: userId,
        UserAttributes: [
          { Name: 'email', Value: userData.email },
          { Name: 'name', Value: userData.name },
          { Name: 'custom:pendiente_aprobacion', Value: newUser.pendienteAprobacion },
          { Name: 'custom:role', Value: userData.role }
        ]
      }).promise();

      // Asignar al grupo correspondiente
      const groupName = this.getGroupNameByRole(userData.role);
      if (groupName) {
        await this.cognito.adminAddUserToGroup({
          UserPoolId: this.COGNITO_USER_POOL_ID,
          Username: userId,
          GroupName: groupName
        }).promise();
      }

      return newUser;
    } catch (error) {
      logger.error(`Error registering user: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  async approveAdminCenter(userId, adminId) {
    try {
      // Verificar permisos del superadmin
      await this.verifyAdminPermissions(adminId, 'super_admin');

      // Obtener usuario pendiente
      const user = await this.userRepository.findById(userId);
      if (!user || user.pendienteAprobacion !== 'true') {
        throw Boom.notFound('Usuario pendiente no encontrado');
      }

      // Actualizar estado en DynamoDB
      await this.userRepository.updateApprovalStatus(userId, 'false', {
        fechaAprobacion: new Date().toISOString()
      });

      // Actualizar atributos en Cognito
      await this.cognito.adminUpdateUserAttributes({
        UserPoolId: this.COGNITO_USER_POOL_ID,
        Username: userId,
        UserAttributes: [
          { Name: 'custom:pendiente_aprobacion', Value: 'false' }
        ]
      }).promise();

      logger.info(`Admin aprobado correctamente: ${userId}`);
      return { message: 'Administrador aprobado correctamente', userId };
    } catch (error) {
      logger.error(`Error aprobando admin: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  getGroupNameByRole(role) {
    switch (role) {
      case 'super_admin':
        return this.SUPER_ADMIN_GROUP_NAME;
      case 'admin_centro':
        return this.ADMIN_CENTRO_GROUP_NAME;
      case 'cliente':
        return this.CLIENTE_GROUP_NAME;
      default:
        return null;
    }
  }

  async getPendingAdmins(limit = 20, lastEvaluatedKey = null) {
    try {
      return await this.userRepository.findPendingAdmins(limit, lastEvaluatedKey);
    } catch (error) {
      logger.error(`Error obteniendo admins pendientes: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  async getUserById(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw Boom.notFound('Usuario no encontrado');
      }
      return user;
    } catch (error) {
      logger.error(`Error obteniendo usuario: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  async updateUserProfile(userId, updateData, requesterId) {
    try {
      if (userId !== requesterId) {
        await this.verifyAdminPermissions(requesterId, 'super_admin');
      }
      this.validateUpdateData(updateData, userId, requesterId);
      return await this.userRepository.update(userId, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error actualizando usuario: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  async deleteUser(userId, requesterId) {
    try {
      // Solo super admins pueden eliminar usuarios
      await this.verifyAdminPermissions(requesterId, 'super_admin');
      // Eliminar usuario
      return await this.userRepository.delete(userId);
    } catch (error) {
      logger.error(`Error eliminando usuario: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  // Métodos auxiliares
  validateRegistrationData(userData, clientId) {
    // Validaciones básicas
    if (!userData.email || !userData.name) {
      throw Boom.badRequest('Email y nombre son requeridos');
    }
    // Validar según tipo de registro
    const isWebRegistration = clientId === process.env.COGNITO_WEB_CLIENT_ID;
    if (isWebRegistration && userData.role !== 'admin_centro') {
      throw Boom.badRequest('Los registros desde web deben ser admin_centro');
    }
    
    if (!isWebRegistration && userData.role !== 'cliente') {
      throw Boom.badRequest('Los registros desde móvil deben ser cliente');
    }
  }

  validateUpdateData(updateData, userId, requesterId) {
    // No permitir modificar ciertos campos sensibles sin permisos
    const sensitiveFields = ['role', 'pendienteAprobacion'];
    const attemptedSensitiveFields = Object.keys(updateData).filter(field => 
      sensitiveFields.includes(field)
    );
    
    if (attemptedSensitiveFields.length > 0 && userId !== requesterId) {
      throw Boom.forbidden('No tienes permisos para modificar campos sensibles');
    }
  }

  async verifyAdminPermissions(userId, requiredRole) {
    const user = await this.userRepository.findById(userId);
    
    if (!user || 
        (requiredRole === 'super_admin' && user.role !== 'super_admin') ||
        (requiredRole === 'admin' && !['super_admin', 'admin_centro'].includes(user.role))) {
      throw Boom.forbidden(`Se requiere rol ${requiredRole}`);
    }
    // Para admins de centro, verificar que estén aprobados
    if (user.role === 'admin_centro' && user.pendienteAprobacion === 'true') {
      throw Boom.forbidden('Administrador pendiente de aprobación');
    }
    return true;
  }
}

module.exports = new UserService();