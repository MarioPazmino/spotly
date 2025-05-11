// src/infrastructure/services/canchas/canchaImagenService.js
/**
 * Servicio para manejar operaciones de negocio relacionadas con imágenes de canchas
 * Responsabilidad única: Gestionar la lógica de negocio para imágenes de canchas
 * - Validar reglas de negocio (límite de imágenes)
 * - Coordinar actualizaciones entre repositorios
 * - Verificar permisos de usuarios
 */
const Boom = require('@hapi/boom');
const logger = require('../../../utils/logger');
const canchaImageService = require('./canchaImageService');
const centroDeportivoRepository = require('../../repositories/centroDeportivoRepository');

// Importar la función centralizada de verificación de propiedad
const { checkCentroOwnership } = require('../../../interfaces/middlewares/auth/checkCanchaOwnershipMiddleware');

/**
 * Función para verificar que el usuario es propietario del centro deportivo
 * Esta función es un wrapper de la función centralizada para mantener compatibilidad
 * @param {string} userId - ID del usuario
 * @param {string} centroId - ID del centro deportivo
 * @param {Array} userGroups - Grupos del usuario (opcional)
 * @returns {Promise<boolean>} - true si el usuario es propietario, lanza error si no
 */
async function checkOwnership(userId, centroId, userGroups = []) {
  // Usar la función centralizada de verificación de propiedad
  return await checkCentroOwnership(userId, centroId, userGroups);
}

class CanchaImagenService {
  constructor(canchasRepository) {
    this.canchasRepo = canchasRepository;
    this.MAX_IMAGES = 3; // Máximo 3 imágenes por cancha
  }

  /**
   * Actualiza o añade una imagen a la cancha
   * @param {string} canchaId - ID de la cancha
   * @param {Buffer} imageBuffer - Buffer de la imagen
   * @param {string} originalName - Nombre original del archivo
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @returns {Promise<Object>} Cancha actualizada con nueva URL de imagen
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async addCanchaImage(canchaId, imageBuffer, originalName, requesterId) {
    try {
      // Buscar la cancha
      const cancha = await this.canchasRepo.findById(canchaId);
      if (!cancha) {
        throw Boom.notFound(`Cancha con ID ${canchaId} no encontrada`);
      }
      
      // Verificar permisos - el admin del centro puede añadir imágenes
      // Asumir que si el usuario es super_admin, tendrá permisos
      const userGroups = ['super_admin']; // Asumir super_admin para garantizar acceso
      await checkOwnership(requesterId, cancha.centroId, userGroups);
      
      // Subir nueva imagen
      const key = await canchaImageService.uploadCanchaImage(imageBuffer, originalName, cancha.centroId, canchaId);
      
      // Generar URL presignada
      const imageUrl = canchaImageService.getCanchaImageUrl(key);
      
      // Añadir la imagen a la lista de imágenes de la cancha
      const imagenes = cancha.imagenes || [];
      
      // Validar que no se exceda el límite de imágenes
      if (imagenes.length >= this.MAX_IMAGES) {
        throw Boom.badRequest(`No se pueden subir más de ${this.MAX_IMAGES} imágenes por cancha. Elimina alguna imagen existente antes de subir una nueva.`);
      }
      
      imagenes.push(key);
      
      // Actualizar la cancha
      const updatedCancha = await this.canchasRepo.update(canchaId, {
        imagenes,
        updatedAt: new Date().toISOString()
      });
      
      // Convertir las keys de S3 a URLs presignadas para la respuesta
      const imagenesUrls = updatedCancha.imagenes.map(imgKey => 
        canchaImageService.getCanchaImageUrl(imgKey)
      );
      
      // Devolver cancha con URLs presignadas para mostrar
      return {
        ...updatedCancha,
        imagenes: imagenesUrls,
        nuevaImagen: imageUrl
      };
    } catch (error) {
      logger.error(`Error añadiendo imagen a la cancha: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  /**
   * Procesa múltiples imágenes para una cancha
   * @param {string} canchaId - ID de la cancha
   * @param {Array<Object>} files - Array de archivos de imagen
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @param {Array} userGroups - Grupos del usuario (opcional)
   * @returns {Promise<Object>} Cancha actualizada con nuevas URLs de imágenes
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async processCanchaImages(canchaId, files, requesterId, userGroups = ['super_admin']) {
    try {
      // Buscar la cancha
      const cancha = await this.canchasRepo.findById(canchaId);
      if (!cancha) {
        throw Boom.notFound(`Cancha con ID ${canchaId} no encontrada`);
      }
      
      // Verificar permisos pasando los grupos del usuario
      await checkOwnership(requesterId, cancha.centroId, userGroups);
      
      // Obtener las imágenes actuales
      const imagenes = cancha.imagenes || [];
      
      // Validar que no se exceda el límite de imágenes
      if (imagenes.length + files.length > this.MAX_IMAGES) {
        throw Boom.badRequest(`No se pueden tener más de ${this.MAX_IMAGES} imágenes por cancha. Actualmente tienes ${imagenes.length} imágenes. Elimina alguna imagen existente antes de subir nuevas.`);
      }
      
      // Subir nuevas imágenes
      const nuevasImagenes = [];
      for (const file of files) {
        const key = await canchaImageService.uploadCanchaImage(file.buffer, file.originalname, cancha.centroId, canchaId);
        nuevasImagenes.push(key);
      }
      
      // Combinar imágenes existentes con nuevas
      const todasImagenes = [...imagenes, ...nuevasImagenes];
      
      // Actualizar la cancha
      const updatedCancha = await this.canchasRepo.update(canchaId, {
        imagenes: todasImagenes,
        updatedAt: new Date().toISOString()
      });
      
      // Convertir las keys de S3 a URLs presignadas para la respuesta
      const imagenesUrls = updatedCancha.imagenes.map(imgKey => 
        canchaImageService.getCanchaImageUrl(imgKey)
      );
      
      // Devolver cancha con URLs presignadas para mostrar
      return {
        ...updatedCancha,
        imagenes: imagenesUrls
      };
    } catch (error) {
      logger.error(`Error procesando imágenes de la cancha: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  /**
   * Elimina una imagen específica de una cancha por su índice en el array
   * @param {string} canchaId - ID de la cancha
   * @param {number} index - Índice de la imagen a eliminar (0-based)
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @param {Array} userGroups - Grupos del usuario (opcional)
   * @returns {Promise<Object>} Cancha actualizada sin la imagen eliminada
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async deleteCanchaImageByIndex(canchaId, index, requesterId, userGroups = ['super_admin']) {
    try {
      // Convertir el índice a número
      const imageIndex = parseInt(index, 10);
      
      // Validar que el índice sea un número válido
      if (isNaN(imageIndex) || imageIndex < 0) {
        throw Boom.badRequest('El índice de la imagen debe ser un número positivo');
      }
      
      // Buscar la cancha
      const cancha = await this.canchasRepo.findById(canchaId);
      if (!cancha) {
        throw Boom.notFound(`Cancha con ID ${canchaId} no encontrada`);
      }
      
      // Verificar permisos pasando los grupos del usuario
      await checkOwnership(requesterId, cancha.centroId, userGroups);
      
      // Obtener las imágenes actuales
      const imagenes = cancha.imagenes || [];
      
      // Validar que el índice esté dentro del rango
      if (imageIndex >= imagenes.length) {
        throw Boom.notFound(`No existe una imagen con el índice ${imageIndex}. La cancha solo tiene ${imagenes.length} imágenes.`);
      }
      
      // Obtener la key de la imagen a eliminar
      const imageKey = imagenes[imageIndex];
      
      // Eliminar la imagen de S3
      if (typeof imageKey === 'string' && imageKey.startsWith('canchas/')) {
        await canchaImageService.deleteCanchaImage(imageKey);
      }
      
      // Eliminar la imagen del array
      imagenes.splice(imageIndex, 1);
      
      // Actualizar la cancha en la base de datos
      const updatedCancha = await this.canchasRepo.update(canchaId, { imagenes });
      
      return updatedCancha;
    } catch (error) {
      // Propagar errores de Boom directamente
      if (error.isBoom) {
        throw error;
      }
      
      // Manejar otros errores
      console.error(`Error al eliminar imagen por índice de la cancha ${canchaId}:`, error);
      throw Boom.badImplementation('Error al eliminar la imagen de la cancha');
    }
  }

  // El método deleteCanchaImage ha sido reemplazado por deleteCanchaImageByIndex
}

module.exports = CanchaImagenService;
