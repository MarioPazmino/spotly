// src/infrastructure/services/user/userAuthorizationService.js
const Boom = require('@hapi/boom');
const logger = require('../../../utils/logger');

/**
 * Servicio para manejar la autorización de usuarios
 */
class UserAuthorizationService {
  constructor() {
    this.SUPER_ADMIN_ROLE = 'super_admin';
    this.ADMIN_CENTRO_ROLE = 'admin_centro';
    this.CLIENTE_ROLE = 'cliente';
  }

  /**
   * Verifica si un usuario tiene permisos de administrador
   * @param {string} userId - ID del usuario que realiza la acción
   * @param {string} requiredRole - Rol requerido para la acción
   * @param {Object} userRepository - Repositorio de usuarios
   * @returns {Promise<boolean>} - true si tiene permisos
   * @throws {Error} Si no tiene permisos
   */
  async verifyAdminPermissions(userId, requiredRole, userRepository) {
    const user = await userRepository.findById(userId);

    if (!user || user.role !== requiredRole) {
      logger.warn(`Usuario ${userId} intentó realizar una acción que requiere rol ${requiredRole}`);
      throw Boom.forbidden(`Se requiere rol ${requiredRole}`);
    }

    // Para admins de centro, verificar que estén aprobados
    if (user.role === this.ADMIN_CENTRO_ROLE && user.pendienteAprobacion === 'true') {
      logger.warn(`Admin centro ${userId} pendiente de aprobación intentó realizar una acción restringida`);
      throw Boom.forbidden('Administrador pendiente de aprobación');
    }

    return true;
  }

  /**
   * Verifica si un usuario puede modificar a otro usuario
   * @param {string} targetUserId - ID del usuario a modificar
   * @param {string} requesterId - ID del usuario que realiza la acción
   * @param {Object} userRepository - Repositorio de usuarios
   * @returns {Promise<boolean>} - true si tiene permisos
   * @throws {Error} Si no tiene permisos
   */
  async canModifyUser(targetUserId, requesterId, userRepository) {
    // Si es el mismo usuario, puede modificarse a sí mismo
    if (targetUserId === requesterId) {
      return true;
    }
    
    // Si no es el mismo usuario, verificar si es super_admin
    return await this.verifyAdminPermissions(requesterId, this.SUPER_ADMIN_ROLE, userRepository);
  }

  /**
   * Verifica si un usuario puede modificar campos sensibles
   * @param {Object} updateData - Datos a actualizar
   * @param {string} targetUserId - ID del usuario a modificar
   * @param {string} requesterId - ID del usuario que realiza la acción
   * @returns {Promise<boolean>} - true si tiene permisos
   * @throws {Error} Si no tiene permisos
   */
  canModifySensitiveFields(updateData, targetUserId, requesterId) {
    const sensitiveFields = ['role', 'pendienteAprobacion'];
    const attemptedSensitiveFields = Object.keys(updateData).filter(field =>
      sensitiveFields.includes(field)
    );

    if (attemptedSensitiveFields.length > 0 && targetUserId !== requesterId) {
      logger.warn(`Usuario ${requesterId} intentó modificar campos sensibles de ${targetUserId}`);
      throw Boom.forbidden('No tienes permisos para modificar campos sensibles');
    }

    return true;
  }
}

module.exports = new UserAuthorizationService();
