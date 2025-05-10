// src/utils/permissionService.js
const Boom = require('@hapi/boom');
const logger = require('../utils/logger');

/**
 * Servicio para manejar permisos y autorización
 */
class PermissionService {
  /**
   * Verifica si un usuario tiene rol de super_admin
   * @param {string} userRole - Rol del usuario
   * @returns {boolean} True si el usuario es super_admin
   */
  isSuperAdmin(userRole) {
    const isSuperAdmin = userRole === 'super_admin' || 
      (Array.isArray(userRole) && userRole.includes('super_admin'));
    
    if (isSuperAdmin) {
      logger.info('Usuario tiene permisos de super_admin');
    }
    
    return isSuperAdmin;
  }

  /**
   * Verifica si un usuario tiene rol de admin_centro
   * @param {string} userRole - Rol del usuario
   * @returns {boolean} True si el usuario es admin_centro
   */
  isAdminCentro(userRole) {
    return userRole === 'admin_centro' || 
      (Array.isArray(userRole) && userRole.includes('admin_centro'));
  }

  /**
   * Verifica si un usuario es el propietario de un centro deportivo
   * @param {string} userId - ID del usuario
   * @param {Object} centro - Centro deportivo
   * @returns {boolean} True si el usuario es propietario
   */
  isCentroOwner(userId, centro) {
    return centro && centro.adminId === userId;
  }
}

module.exports = new PermissionService();
