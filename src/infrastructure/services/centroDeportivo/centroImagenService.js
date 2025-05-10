// src/infrastructure/services/centroDeportivo/centroImagenService.js
/**
 * Servicio para manejar operaciones de negocio relacionadas con imágenes de centros deportivos
 * Responsabilidad única: Gestionar la lógica de negocio para imágenes de centros deportivos
 * - Validar reglas de negocio (límite de imágenes)
 * - Coordinar actualizaciones entre repositorios
 * - Verificar permisos de usuarios
 */
const Boom = require('@hapi/boom');
const logger = require('../../../utils/logger');
const centroImageService = require('./centroImageService');
const { checkCentroOwnership } = require('../../../utils/authUtils');
const permissionService = require('../../../utils/permissionService');

class CentroImagenService {
  constructor(centroDeportivoRepository) {
    this.centroRepo = centroDeportivoRepository;
    this.MAX_IMAGES = 3; // Máximo 3 imágenes por centro deportivo
  }

  /**
   * Actualiza o añade una imagen al centro deportivo
   * @param {string} centroId - ID del centro deportivo
   * @param {Buffer} imageBuffer - Buffer de la imagen
   * @param {string} originalName - Nombre original del archivo
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @param {string} userRole - Rol del usuario que realiza la solicitud
   * @returns {Promise<Object>} Centro deportivo actualizado con nueva URL de imagen
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async addCentroImage(centroId, imageBuffer, originalName, requesterId, userRole) {
    try {
      // Verificar permisos - el admin del centro o super_admin pueden añadir imágenes
      await checkCentroOwnership(requesterId, centroId, userRole);
      
      // Subir nueva imagen
      const key = await centroImageService.uploadCentroImage(imageBuffer, originalName, centroId);
      
      // Generar URL presignada
      const imageUrl = centroImageService.getCentroImageUrl(key);
      
      // Buscar el centro deportivo
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
      }
      
      // Añadir la imagen a la lista de imágenes del centro
      const imagenes = centro.imagenes || [];
      
      // Validar que no se exceda el límite de imágenes
      if (imagenes.length >= this.MAX_IMAGES) {
        throw Boom.badRequest(`No se pueden subir más de ${this.MAX_IMAGES} imágenes por centro deportivo. Elimina alguna imagen existente antes de subir una nueva.`);
      }
      
      imagenes.push(key);
      
      // Actualizar el centro deportivo
      const updatedCentro = await this.centroRepo.update(centroId, {
        imagenes
        // El campo updatedAt se actualiza automáticamente en el repositorio
      });
      
      // Convertir las keys de S3 a URLs presignadas para la respuesta
      const imagenesUrls = updatedCentro.imagenes.map(imgKey => 
        centroImageService.getCentroImageUrl(imgKey)
      );
      
      // Devolver centro con URLs presignadas para mostrar
      return {
        ...updatedCentro,
        imagenes: imagenesUrls,
        nuevaImagen: imageUrl
      };
    } catch (error) {
      logger.error(`Error añadiendo imagen al centro deportivo: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  /**
   * Elimina una imagen del centro deportivo
   * @param {string} centroId - ID del centro deportivo
   * @param {string} imageIndex - Índice de la imagen a eliminar
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @param {string} userRole - Rol del usuario que realiza la solicitud
   * @returns {Promise<Object>} Centro deportivo actualizado sin la imagen
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async deleteCentroImage(centroId, imageIndex, requesterId, userRole) {
    try {
      // Verificar permisos - el admin del centro o super_admin pueden eliminar imágenes
      await checkCentroOwnership(requesterId, centroId, userRole);
      
      // Buscar el centro deportivo
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
      }
      
      // Verificar que el índice sea válido
      if (!centro.imagenes || !centro.imagenes[imageIndex]) {
        const totalImagenes = centro.imagenes ? centro.imagenes.length : 0;
        
        // Crear un error con formato para Postman
        const error = Boom.badRequest('Imagen no encontrada');
        
        // Configurar el payload para que se muestre correctamente en Postman
        error.output.payload = {
          ...error.output.payload,
          statusCode: 400,
          error: 'Bad Request',
          message: `Imagen con índice ${imageIndex} no encontrada`,
          details: {
            disponibles: totalImagenes,
            indicesValidos: totalImagenes > 0 ? `0-${totalImagenes - 1}` : 'ninguno',
            sugerencia: 'Verifica el número de imágenes disponibles antes de intentar eliminar una específica'
          }
        };
        
        throw error;
      }
      
      // Obtener la key de la imagen a eliminar
      const imageKey = centro.imagenes[imageIndex];
      
      // Eliminar la imagen de S3
      await centroImageService.deleteCentroImage(imageKey);
      
      // Eliminar la imagen de la lista de imágenes del centro
      const imagenes = [...centro.imagenes];
      imagenes.splice(imageIndex, 1);
      
      // Actualizar el centro deportivo
      const updatedCentro = await this.centroRepo.update(centroId, {
        imagenes
        // El campo updatedAt se actualiza automáticamente en el repositorio
      });
      
      // Convertir las keys de S3 a URLs presignadas para la respuesta
      const imagenesUrls = updatedCentro.imagenes.map(imgKey => 
        centroImageService.getCentroImageUrl(imgKey)
      );
      
      // Devolver centro con URLs presignadas para mostrar
      return {
        ...updatedCentro,
        imagenes: imagenesUrls
      };
    } catch (error) {
      logger.error(`Error eliminando imagen del centro deportivo: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  /**
   * Obtiene todas las imágenes de un centro deportivo con URLs presignadas
   * @param {string} centroId - ID del centro deportivo
   * @returns {Promise<Array>} Lista de URLs presignadas de las imágenes
   * @throws {Error} Si hay errores
   */
  async getCentroImages(centroId) {
    try {
      // Buscar el centro deportivo
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
      }
      
      // Si no hay imágenes, devolver array vacío
      if (!centro.imagenes || centro.imagenes.length === 0) {
        return [];
      }
      
      // Convertir las keys de S3 a URLs presignadas
      return centro.imagenes.map(imgKey => 
        centroImageService.getCentroImageUrl(imgKey)
      );
    } catch (error) {
      logger.error(`Error obteniendo imágenes del centro deportivo: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }
}

module.exports = CentroImagenService;
