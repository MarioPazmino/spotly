// src/interfaces/http/controllers/v1/UserController.js

const Joi = require('joi');
const Boom = require('@hapi/boom');
const UserRepository = require('../../../../infrastructure/repositories/userRepository');
const UserService = require('../../../../infrastructure/services/userService');

// Esquemas de validación (mantener igual a lo que ya tenías)
const schemas = {
  createUser: Joi.object({
    email: Joi.string().email().required().description('Email del usuario'),
    passwordHash: Joi.string().required().description('Hash de la contraseña'),
    role: Joi.string().valid('super_admin', 'admin_centro', 'cliente').required()
      .description('Rol del usuario')
  }),
  
  updateUser: Joi.object({
    email: Joi.string().email().description('Email del usuario'),
    passwordHash: Joi.string().description('Hash de la contraseña'),
    role: Joi.string().valid('super_admin', 'admin_centro', 'cliente')
      .description('Rol del usuario')
  }).min(1)
};

// Inicializar el repositorio y servicio
const userRepository = new UserRepository();
const userService = new UserService(userRepository);

/**
 * Clase controladora para operaciones de Usuarios - Versión 1
 * Ahora solo maneja la interacción HTTP (no lógica de negocio)
 */
class UserController {
  /**
   * Crea un nuevo usuario
   */
  static async createUser(req, res, next) {
    try {
      // Validar el cuerpo de la solicitud con Joi
      const { error, value: userData } = schemas.createUser.validate(req.body);
      if (error) {
        throw Boom.badRequest(error.message);
      }

      // Llamar al servicio para crear el usuario
      const usuario = await userService.createUser(userData);

      return res.status(201).json(usuario);
    } catch (error) {
      console.error('Error al crear usuario:', error);
      return next(Boom.isBoom(error) ? error : Boom.internal('Error interno al crear el usuario', error));
    }
  }

  /**
   * Lista todos los usuarios
   */
  static async getAllUsers(req, res, next) {
    try {
      const usuarios = await userService.getAllUsers();

      return res.status(200).json({
        message: usuarios.length > 0 ? 'Usuarios obtenidos exitosamente' : 'No hay usuarios registrados',
        data: usuarios,
      });
    } catch (error) {
      console.error('Error al listar los usuarios:', error);
      return next(Boom.internal('Error al listar usuarios', error));
    }
  }

  /**
   * Actualiza un usuario existente
   */
  static async updateUser(req, res, next) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        throw Boom.badRequest('El campo UserId es requerido en los parámetros de la ruta');
      }

      // Validar el cuerpo de la solicitud con Joi
      const { error, value: updateData } = schemas.updateUser.validate(req.body);
      if (error) {
        throw Boom.badRequest(error.message);
      }

      // Actualizar usuario a través del servicio
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

  /**
   * Elimina un usuario
   */
  static async deleteUser(req, res, next) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        throw Boom.badRequest('El campo UserId es requerido en los parámetros');
      }

      await userService.deleteUser(userId);

      return res.status(200).json({
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error al eliminar el usuario:', error);
      return next(Boom.isBoom(error) ? error : Boom.internal('Error al eliminar el usuario', error));
    }
  }

  /**
   * Obtiene un usuario por su ID
   */
  static async getUserById(req, res, next) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        throw Boom.badRequest('El campo UserId es requerido en los parámetros');
      }

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