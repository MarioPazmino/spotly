// src/interfaces/middlewares/auth/checkCentroOwnershipMiddleware.js
/**
 * Middleware para verificar que el usuario autenticado es dueño del centro deportivo
 * Utiliza los servicios refactorizados authUtils y permissionService
 */
const Boom = require('@hapi/boom');
const { checkCentroOwnership } = require('../../../utils/authUtils');
const logger = require('../../../utils/logger');

/**
 * Middleware para verificar que el usuario autenticado es dueño del centro deportivo
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
module.exports = async function checkCentroOwnershipMiddleware(req, res, next) {
  try {
    const user = req.user;
    // Usar sub o userId (compatibilidad con desarrollo y producción)
    const userId = user.sub || user.userId;
    
    // Obtener el rol del usuario (compatibilidad con diferentes formatos)
    let userRole;
    if (user['cognito:groups'] && user['cognito:groups'].length > 0) {
      userRole = user['cognito:groups'][0];
    } else if (user.groups && user.groups.length > 0) {
      userRole = user.groups[0];
    } else {
      userRole = user.role;
    }
    
    const centroId = req.params.centroId;
    
    logger.info('Verificando permisos de centro deportivo:', { userId, userRole, centroId });

    // Utilizar la función refactorizada de authUtils
    await checkCentroOwnership(userId, centroId, userRole);
    
    // Si llegamos aquí, el usuario tiene permisos
    logger.info('Acceso permitido al centro deportivo:', { userId, centroId });
    next();
  } catch (error) {
    logger.error('Error al verificar permisos de centro deportivo:', { 
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};
