// src/interfaces/http/controllers/v1/UserController.js
const Boom = require('@hapi/boom');
const UserService = require('../../../../infrastructure/services/userService');
const UserProfileService = require('../../../../infrastructure/services/user/userProfileService');
const UserRepository = require('../../../../infrastructure/repositories/userRepository');
const { 
  validateRegistration, 
  validateProfileUpdate, 
  validateAllowedFields 
} = require('../../../validation/userValidation');

// Instanciar los servicios
const userService = new UserService();
const userRepository = new UserRepository();
const userProfileService = new UserProfileService(userRepository);

exports.createUser = async (req, res, next) => {
  try {
    const { error, value } = validateRegistration(req.body);
    if (error) throw Boom.badRequest(error.message);

    const clientId = req.headers['x-client-id'] || process.env.COGNITO_MOBILE_CLIENT_ID;

    const user = await userService.registerUser(value, clientId);
    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    try {
      const user = await userProfileService.getUserProfile(userId);
      return res.status(200).json(user);
    } catch (error) {
      // Capturar el error específico de usuario no encontrado
      if (error.output && error.output.statusCode === 404) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: `No se encontró ningún usuario con el ID: ${userId}`,
          details: 'Verifique que el ID sea correcto y que el usuario exista en el sistema',
          code: 'USER_NOT_FOUND'
        });
      }
      throw error; // Re-lanzar otros errores para que sean manejados por el middleware de errores
    }
  } catch (error) {
    console.error(`Error al obtener usuario con ID ${req.params.userId}:`, error);
    next(error);
  }
};

exports.updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Verificar campos incorrectos antes de la validación
    const fieldValidation = validateAllowedFields(req.body);
    
    if (!fieldValidation.isValid) {
      // Encontrar campos similares para sugerir correcciones
      return res.status(400).json({
        error: 'Campos no permitidos',
        message: `Los siguientes campos no están permitidos: ${fieldValidation.camposInvalidos.join(', ')}`,
        details: `Solo se permiten los campos: ${fieldValidation.camposPermitidos.join(', ')}`,
        sugerencias: fieldValidation.sugerencias,
        code: 'INVALID_FIELDS'
      });
    }

    // Validar los datos de entrada
    const { error, value } = validateProfileUpdate(req.body);
    if (error) {
      // Mejorar el mensaje de error de validación
      return res.status(400).json({
        error: 'Error de validación',
        message: error.message,
        details: 'Verifique que los campos cumplan con el formato requerido',
        code: 'VALIDATION_ERROR'
      });
    }

    // Usar los datos validados directamente
    const dataToUpdate = { ...value };

    const requesterId = req.user.sub; // Suponiendo que el middleware de autenticación inyecta esto
    
    try {
      const updated = await userProfileService.updateUserProfile(userId, dataToUpdate, requesterId);
      return res.status(200).json(updated);
    } catch (error) {
      // Capturar el error específico de usuario no encontrado
      if (error.message && error.message.includes('Usuario con ID') && error.message.includes('no encontrado')) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: `No se encontró ningún usuario con el ID: ${userId}`,
          details: 'Verifique que el ID sea correcto y que el usuario exista en el sistema',
          code: 'USER_NOT_FOUND'
        });
      }
      throw error; // Re-lanzar otros errores para que sean manejados por el middleware de errores
    }
  } catch (error) {
    console.error(`Error al actualizar usuario con ID ${req.params.userId}:`, error);
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.sub;
    
    try {
      const deleted = await userService.deleteUser(userId, requesterId);
      return res.status(200).json({
        message: 'Usuario eliminado correctamente',
        userId
      });
    } catch (error) {
      // Capturar el error específico de usuario no encontrado
      if (error.message && error.message.includes('Usuario con ID') && error.message.includes('no encontrado')) {
        return res.status(404).json({
          error: 'Usuario no encontrado',
          message: `No se encontró ningún usuario con el ID: ${userId}`,
          details: 'Verifique que el ID sea correcto y que el usuario exista en el sistema',
          code: 'USER_NOT_FOUND'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error al eliminar usuario con ID ${req.params.userId}:`, error);
    next(error);
  }
};

exports.listPendingAdmins = async (req, res, next) => {
  try {
    const { limit, nextToken } = req.query;
    const admins = await userService.getPendingAdmins(limit, nextToken);
    return res.status(200).json(admins);
  } catch (error) {
    next(error);
  }
};

exports.approveAdminCenter = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.sub;
    const result = await userService.approveAdminCenter(userId, requesterId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Lista todos los usuarios del sistema
// Solo accesible para super_admin
exports.listAllUsers = async (req, res, next) => {
  try {
    // Extraer parámetros de consulta
    const { limit = 20, nextToken, role, searchTerm } = req.query;
    
    // Convertir limit a número
    const limitNum = parseInt(limit, 10);
    
    // Preparar opciones para el servicio
    const options = {
      limit: limitNum > 100 ? 100 : limitNum, // Limitar a máximo 100 resultados
      lastEvaluatedKey: nextToken ? JSON.parse(Buffer.from(nextToken, 'base64').toString()) : null,
      role: role || null,
      searchTerm: searchTerm || null
    };
    
    // Obtener usuarios
    const result = await userService.listUsers(options);
    
    // Preparar respuesta
    const response = {
      users: result.items,
      count: result.count,
      nextToken: result.lastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64') 
        : null
    };
    
    // Agregar mensaje informativo si no hay resultados
    if (result.items.length === 0) {
      if (role || searchTerm) {
        response.message = `No se encontraron usuarios que coincidan con los criterios de búsqueda${role ? ` para el rol '${role}'` : ''}${searchTerm ? ` y el término '${searchTerm}'` : ''}.`;
      } else {
        response.message = 'No hay usuarios registrados en el sistema.';
      }
    }
    
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Los métodos de triggers de Cognito han sido movidos a funciones Lambda independientes
// definidas en src/cognito/
