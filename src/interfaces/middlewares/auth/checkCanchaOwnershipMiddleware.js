// src/interfaces/middlewares/auth/checkCanchaOwnershipMiddleware.js
/**
 * Middleware para verificar que el usuario autenticado es dueño del centro deportivo asociado a una cancha
 */
const Boom = require('@hapi/boom');
const centroDeportivoRepository = require('../../../infrastructure/repositories/centroDeportivoRepository');
const canchasRepository = require('../../../infrastructure/repositories/canchasRepository');
const logger = require('../../../utils/logger');

/**
 * Verifica si un usuario es propietario del centro deportivo, es superadmin o admin_centro
 * @param {string} userId - ID del usuario
 * @param {string} centroId - ID del centro deportivo
 * @param {Array} userGroups - Grupos a los que pertenece el usuario
 * @returns {Promise<boolean>} - true si el usuario tiene permisos, lanza error si no
 */
async function checkCentroOwnership(userId, centroId, userGroups = []) {
  // Verificar si el usuario es superadmin
  if (userGroups.includes('super_admin')) {
    return true; // Los superadmins tienen acceso a todo
  }
  
  if (!centroId) {
    throw Boom.badRequest('ID del centro deportivo no proporcionado');
  }

  // Buscar el centro deportivo
  const centro = await centroDeportivoRepository.findById(centroId);
  if (!centro) {
    throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
  }

  // Verificar si el usuario es admin_centro (tiene acceso a todos los centros)
  if (userGroups.includes('admin_centro')) {
    // Los usuarios con rol admin_centro tienen acceso a todos los centros deportivos
    return true;
  }
  
  // Verificar si el usuario es el administrador del centro (para otros roles)
  if (centro.userId !== userId) {
    throw Boom.forbidden('No tienes permiso para realizar esta acción en este centro deportivo');
  }

  return true;
}

/**
 * Verifica si un usuario tiene permisos para gestionar una cancha
 * @param {string} userId - ID del usuario
 * @param {string} canchaId - ID de la cancha
 * @param {Array} userGroups - Grupos a los que pertenece el usuario
 * @returns {Promise<boolean>} - true si el usuario tiene permisos, lanza error si no
 */
async function checkCanchaPermission(userId, canchaId, userGroups = []) {
  // Verificar si el usuario es superadmin
  if (userGroups.includes('super_admin')) {
    return true; // Los superadmins tienen acceso a todo
  }
  
  if (!canchaId) {
    throw Boom.badRequest('ID de la cancha no proporcionado');
  }

  // Buscar la cancha
  const cancha = await canchasRepository.findById(canchaId);
  if (!cancha) {
    throw Boom.notFound(`Cancha con ID ${canchaId} no encontrada`);
  }

  // Verificar propiedad del centro deportivo asociado
  return await checkCentroOwnership(userId, cancha.centroId, userGroups);
}

/**
 * Middleware para verificar que el usuario autenticado es dueño del centro deportivo de una cancha
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
async function checkCanchaOwnershipMiddleware(req, res, next) {
  try {
    const userId = req.user.sub || req.user.userId;
    const { canchaId } = req.params;
    
    // Obtener los grupos del usuario
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    
    // Registrar información para depuración
    logger.info(`Verificando permisos para usuario ${userId} con grupos ${JSON.stringify(userGroups)}`);
    
    await checkCanchaPermission(userId, canchaId, userGroups);
    next();
  } catch (error) {
    logger.error(`Error en verificación de propiedad de cancha: ${error.message}`);
    if (error.isBoom) {
      return res.status(error.output.statusCode).json(error.output.payload);
    }
    next(error);
  }
}

module.exports = {
  checkCanchaOwnershipMiddleware,
  checkCanchaPermission,
  checkCentroOwnership
};
