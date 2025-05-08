// src/utils/authUtils.js
const Boom = require('@hapi/boom');
const CentroDeportivoRepository = require('../infrastructure/repositories/centroDeportivoRepository');

/**
 * Verifica si un usuario es el propietario/administrador de un centro deportivo
 * @param {string} userId - ID del usuario
 * @param {string} centroId - ID del centro deportivo
 * @throws {Error} Si el usuario no es propietario del centro
 */
async function checkCentroOwnership(userId, centroId) {
  if (!centroId) {
    throw Boom.badRequest('Se requiere el ID del centro deportivo');
  }
  
  // Obtener el centro deportivo
  const centro = await CentroDeportivoRepository.findById(centroId);
  
  if (!centro) {
    throw Boom.notFound('Centro deportivo no encontrado');
  }
  
  // Verificar si el usuario es el administrador del centro
  if (centro.adminId !== userId) {
    throw Boom.forbidden('No tienes permisos para realizar esta acción en este centro deportivo');
  }
  
  return true;
}

/**
 * Verifica si un usuario tiene permisos para gestionar una cancha
 * @param {string} userId - ID del usuario
 * @param {string} canchaId - ID de la cancha
 * @param {Object} canchasRepository - Repositorio de canchas
 * @throws {Error} Si el usuario no tiene permisos para la cancha
 */
async function checkCanchaPermission(userId, canchaId, canchasRepository) {
  if (!canchaId) {
    throw Boom.badRequest('Se requiere el ID de la cancha');
  }
  
  // Obtener la cancha
  const cancha = await canchasRepository.findById(canchaId);
  
  if (!cancha) {
    throw Boom.notFound('Cancha no encontrada');
  }
  
  // Obtener el centro deportivo asociado a la cancha
  const centro = await CentroDeportivoRepository.findById(cancha.centroDeportivoId);
  
  if (!centro) {
    throw Boom.notFound('Centro deportivo asociado no encontrado');
  }
  
  // Verificar si el usuario es el administrador del centro
  if (centro.adminId !== userId) {
    throw Boom.forbidden('No tienes permisos para realizar esta acción en esta cancha');
  }
  
  return true;
}

module.exports = {
  checkCentroOwnership,
  checkCanchaPermission
};
