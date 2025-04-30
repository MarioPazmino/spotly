// src/interfaces/http/controllers/v1/UserController.js
const Joi = require('joi');
const Boom = require('@hapi/boom');
const UserService = require('../../../../infrastructure/services/userService');

const schemas = {
  createUser: Joi.object({
    email: Joi.string().email().required().description('Email del usuario'),
    name: Joi.string().required().description('Nombre del usuario'),
    cognitoId: Joi.string().description('ID de Cognito (opcional si se registra manualmente)'),
    role: Joi.string().valid('super_admin', 'admin_centro', 'cliente').default('cliente')
      .description('Rol del usuario'),
    picture: Joi.string().uri().description('URL de la foto de perfil'),
    registrationSource: Joi.string().default('cognito').description('Fuente de registro')
  }),
  updateUser: Joi.object({
    email: Joi.string().email().description('Email del usuario'),
    name: Joi.string().description('Nombre del usuario'),
    picture: Joi.string().uri().description('URL de la foto de perfil')
  }).min(1)
};

class UserController {
  static async createUser(req, res, next) {
    try {
      const { error, value: userData } = schemas.createUser.validate(req.body);
      if (error) {
        throw Boom.badRequest(error.message);
      }
      const userRepository = req.app.get('userRepository');
      const userService = new UserService(userRepository);
      const usuario = await userService.createUser(userData);
      return res.status(201).json(usuario);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return next(Boom.isBoom(error) ? error : Boom.internal('Error interno al crear el usuario', error));
    }
  }
  static async getAllUsers(req, res, next) {
    try {
      const options = {
        limit: parseInt(req.query.limit) || 20,
        lastEvaluatedKey: req.query.nextToken || null,
        filters: {}
      };
      if (req.query.role) {
        options.filters.role = req.query.role;
      }
      const userRepository = req.app.get('userRepository');
      const userService = new UserService(userRepository);
      const result = await userService.getAllUsers(options);
      return res.status(200).json({
        message: result.items.length > 0 ? 'Usuarios obtenidos exitosamente' : 'No hay usuarios registrados',
        data: result.items,
        pagination: {
          nextToken: result.lastEvaluatedKey,
          count: result.count
        }
      });
    } catch (error) {
      console.error('Error al listar los usuarios:', error);
      return next(Boom.internal('Error al listar usuarios', error));
    }
  }
  static async updateUser(req, res, next) {
    try {
      const userId = req.params.userId;
      if (!userId) {
        throw Boom.badRequest('El campo UserId es requerido en los parámetros de la ruta');
      }
      const { error, value: updateData } = schemas.updateUser.validate(req.body);
      if (error) {
        throw Boom.badRequest(error.message);
      } 
      const userRepository = req.app.get('userRepository');
      const userService = new UserService(userRepository);
      const updatedUser = await userService.updateUser(userId, updateData);
      return res.status(200).json({
        message: 'Usuario actualizado exitosamente',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error al actualizar el usuario:', error);
      return next(Boom.isBoom(error) ? error : Boom.internal('Error al actualizar el usuario', error));
    }
  }
  static async deleteUser(req, res, next) {
    try {
      const userId = req.params.userId;
      if (!userId) {
        throw Boom.badRequest('El campo UserId es requerido en los parámetros');
      }
      const userRepository = req.app.get('userRepository');
      const userService = new UserService(userRepository);
      await userService.deleteUser(userId);
      return res.status(200).json({
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      return next(Boom.isBoom(error) ? error : Boom.internal('Error al eliminar el usuario', error));
    }
  }
  static async getUserById(req, res, next) {
    try {
      const userId = req.params.userId;
      if (!userId) {
        throw Boom.badRequest('El campo UserId es requerido en los parámetros');
      }
      const userRepository = req.app.get('userRepository');
      const userService = new UserService(userRepository);
      const user = await userService.getUserById(userId);
      return res.status(200).json({
        message: 'Usuario encontrado exitosamente',
        data: user,
      });
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      return next(Boom.isBoom(error) ? error : Boom.internal('Error al obtener el usuario', error));
    }
  }
}
module.exports = UserController;