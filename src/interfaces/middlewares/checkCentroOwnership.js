// src/interfaces/middlewares/checkCentroOwnership.js
const Boom = require('@hapi/boom');
const centroDeportivoService = require('../../infrastructure/services/centroDeportivoService');

/**
 * Middleware para verificar que el usuario autenticado es dueño del centro deportivo
 * Permite acceso a super_admin o admin_centro dueño (puede tener varios centros)
 */
module.exports = async function checkCentroOwnership(req, res, next) {
  try {
    const user = req.user;
    const userId = user.sub;
    const userRole = user['cognito:groups']?.[0] || user.role;
    const centroId = req.params.centroId;

    // Permitir siempre a super_admin
    if (userRole === 'super_admin') return next();

    // Para admin_centro, verificar ownership
    if (userRole === 'admin_centro') {
      const centro = await centroDeportivoService.getCentroById(centroId);
      if (!centro) throw Boom.notFound('Centro deportivo no encontrado');
      if (centro.userId === userId) return next();
      return next(Boom.forbidden('No tienes permisos sobre este centro deportivo'));
    }

    // Otros roles: denegar
    return next(Boom.forbidden('No tienes permisos sobre este centro deportivo'));
  } catch (error) {
    next(error);
  }
};
