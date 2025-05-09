//src/infrastructure/services/userService.js
const AWS = require('aws-sdk');
const Boom = require('@hapi/boom');
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
    this.MAX_SIZE_BYTES = 5 * 1024 * 1024; // Cambia el límite de tamaño máximo de imagen a 5MB
  }

  async registerUser(userData) {
    try {
      // Validar datos de entrada
      this.validateRegistrationData(userData);

      // Crear usuario en Cognito
      const cognitoUser = await this.cognito.adminCreateUser({
        UserPoolId: this.COGNITO_USER_POOL_ID,
        Username: userData.email,
        UserAttributes: [
          { Name: 'email', Value: userData.email },
          { Name: 'name', Value: userData.name },
          { Name: 'custom:pendiente_aprobacion', Value: userData.role === 'admin_centro' ? 'true' : 'false' },
          { Name: 'custom:role', Value: userData.role }
        ]
      }).promise();

      // Obtener el sub (ID único generado por Cognito)
      const userId = cognitoUser.User.Attributes.find(attr => attr.Name === 'sub').Value;

      // Crear usuario en base de datos
      const newUser = {
        userId,
        ...userData,
        pendienteAprobacion: userData.role === 'admin_centro' ? 'true' : 'false',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await this.userRepository.save(newUser);

      // Asignar al grupo correspondiente
      const groupName = this.getGroupNameByRole(userData.role);
      if (groupName) {
        await this.cognito.adminAddUserToGroup({
          UserPoolId: this.COGNITO_USER_POOL_ID,
          Username: userData.email,
          GroupName: groupName
        }).promise();
      }

      return newUser;
    } catch (error) {
      logger.error(`Error registering user: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  async approveAdminCenter(userId, requesterId) {
    try {
      // Verificar permisos del superadmin
      await this.verifyAdminPermissions(requesterId, 'super_admin');

      // Obtener usuario pendiente
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw Boom.notFound('Usuario no encontrado');
      }
      if (user.role !== 'admin_centro') {
        throw Boom.badRequest('El usuario no es un administrador de centro');
      }
      if (user.pendienteAprobacion !== 'true') {
        throw Boom.badRequest('El usuario ya ha sido aprobado');
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
      // Manejar imagenPerfil: S3, externa o null
      if (user.imagenPerfil && typeof user.imagenPerfil === 'string') {
        if (user.imagenPerfil.startsWith('usuarios/')) {
          user.imagenPerfil = this.getPresignedUrl(user.imagenPerfil);
        } else if (user.imagenPerfil.startsWith('http')) {
          // Es una URL externa (Facebook, Google, etc.), se deja tal cual
        } else {
          user.imagenPerfil = null;
        }
      } else {
        user.imagenPerfil = null;
      }
      return user;
    } catch (error) {
      logger.error(`Error obteniendo usuario: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  async listUsers(options = {}) {
    try {
      const result = await this.userRepository.findAll(options);
      // Convertir solo keys S3 válidas a presigned URLs o dejar URL externa
      result.items = result.items.map(user => {
        if (user.imagenPerfil && typeof user.imagenPerfil === 'string') {
          if (user.imagenPerfil.startsWith('usuarios/')) {
            user.imagenPerfil = this.getPresignedUrl(user.imagenPerfil);
          } else if (user.imagenPerfil.startsWith('http')) {
            // Es una URL externa (Facebook, Google, etc.), se deja tal cual
          } else {
            user.imagenPerfil = null;
          }
        } else {
          user.imagenPerfil = null;
        }
        return user;
      });
      return result;
    } catch (error) {
      logger.error(`Error listando usuarios: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  async updateUserProfile(userId, updateData, requesterId) {
    try {
      if (userId !== requesterId) {
        await this.verifyAdminPermissions(requesterId, 'super_admin');
      }

      // Validar campos sensibles
      const sensitiveFields = ['role', 'pendienteAprobacion'];
      const attemptedSensitiveFields = Object.keys(updateData).filter(field =>
        sensitiveFields.includes(field)
      );

      if (attemptedSensitiveFields.length > 0 && userId !== requesterId) {
        throw Boom.forbidden('No tienes permisos para modificar campos sensibles');
      }

      // Validar tamaño de imagen
      if (updateData.imagenPerfil && updateData.imagenPerfil.size > this.MAX_SIZE_BYTES) {
        throw Boom.badRequest('La imagen supera el tamaño máximo permitido de 5MB');
      }

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
      // Obtener datos del usuario para eliminar imágenes de S3
      const user = await this.getUserById(userId);
      if (user && user.imagenPerfil && typeof user.imagenPerfil === 'string' && user.imagenPerfil.startsWith('usuarios/')) {
        const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
        const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
        const deleteParams = {
          Bucket: BUCKET,
          Delete: {
            Objects: [{ Key: user.imagenPerfil }],
            Quiet: true
          }
        };
        await s3.deleteObjects(deleteParams).promise();
      }
      // Eliminar usuario de la base de datos
      return await this.userRepository.delete(userId);
    } catch (error) {
      logger.error(`Error eliminando usuario: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  validateRegistrationData(userData) {
    // Validaciones básicas
    if (!userData.email || !userData.name) {
      throw Boom.badRequest('Email y nombre son requeridos');
    }

    // Validar rol permitido
    if (!['cliente', 'admin_centro', 'super_admin'].includes(userData.role)) {
      throw Boom.badRequest('Rol no permitido');
    }
  }

  async verifyAdminPermissions(userId, requiredRole) {
    const user = await this.userRepository.findById(userId);

    if (!user || user.role !== requiredRole) {
      throw Boom.forbidden(`Se requiere rol ${requiredRole}`);
    }

    // Para admins de centro, verificar que estén aprobados
    if (user.role === 'admin_centro' && user.pendienteAprobacion === 'true') {
      throw Boom.forbidden('Administrador pendiente de aprobación');
    }

    return true;
  }

  getPresignedUrl(key) {
    const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
    const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
    const params = {
      Bucket: BUCKET,
      Key: key,
      Expires: 60 * 60 // 1 hora
    };
    return s3.getSignedUrl('getObject', params);
  }
}

module.exports = UserService;