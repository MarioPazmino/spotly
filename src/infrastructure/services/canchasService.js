// src/infrastructure/services/canchasService.js
const CanchasRepository = require('../repositories/canchasRepository');
const Cancha = require('../../domain/entities/cancha');
const { v4: uuidv4 } = require('uuid');
const { sanitizeObject } = require('../../utils/sanitizeInput');
const CanchaImagenService = require('./canchas/canchaImagenService');
// Importar el servicio de imágenes para S3
const canchaImageService = require('./canchas/canchaImageService');
const AWS = require('aws-sdk');

class CanchasService {
  constructor() {
    this.repo = new CanchasRepository();
    this.imagenService = new CanchaImagenService(this.repo);
  }

  // El procesamiento de imágenes ahora se maneja directamente a través del servicio especializado CanchaImagenService

  async createCancha(canchaData, files = []) {
    // Sanitizar datos de entrada
    const cleanData = sanitizeObject(canchaData);
    
    // Generar un ID único para la nueva cancha
    const canchaId = uuidv4();
    
    // Crear la cancha primero sin imágenes
    const cancha = new Cancha({
      ...cleanData,
      canchaId,
      imagenes: [], // Inicialmente sin imágenes
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Guardar la cancha en la base de datos
    const canchaGuardada = await this.repo.save(cancha);
    
    // Si hay archivos para procesar, actualizar la cancha con las imágenes
    if (files && files.length > 0) {
      try {
        // Ahora que tenemos un canchaId, podemos procesar las imágenes
        const resultado = await this.imagenService.processCanchaImages(canchaId, files, 'system');
        
        // Actualizar la cancha con las imágenes procesadas
        if (resultado && resultado.imagenes && resultado.imagenes.length > 0) {
          return await this.updateCancha(canchaId, { imagenes: resultado.imagenes });
        }
      } catch (error) {
        console.error(`Error procesando imágenes para nueva cancha: ${error.message}`);
        // Continuamos devolviendo la cancha aunque haya fallado el procesamiento de imágenes
      }
    }
    
    return canchaGuardada;
  }

  async updateCancha(canchaId, updateData, files = []) {
    // Obtener cancha actual
    const canchaActual = await this.repo.findById(canchaId);
    if (!canchaActual) throw new Error('Cancha no encontrada');
    
    // Sanitizar datos de entrada
    const cleanData = sanitizeObject(updateData);
    
    // Filtrar solo los campos válidos definidos en la entidad Cancha
    const validFields = [
      'tipo',
      'capacidad',
      'precioPorHora',
      'estado',
      'descripcion',
      'equipamientoIncluido'
      // No permitimos actualizar canchaId o centroId directamente
    ];
    
    // Crear un objeto con solo los campos válidos
    const filteredData = {};
    for (const field of validFields) {
      if (cleanData[field] !== undefined) {
        filteredData[field] = cleanData[field];
      }
    }
    
    // Manejar imágenes usando el servicio especializado
    let imagenes = canchaActual.imagenes || [];
    
    // Procesar nuevas imágenes si hay archivos
    if (files && files.length > 0) {
      try {
        // Usar directamente el servicio especializado para procesar las imágenes
        const resultado = await this.imagenService.processCanchaImages(canchaId, files, 'system');
        
        // Actualizar las imágenes con las nuevas procesadas
        if (resultado && resultado.imagenes) {
          // Extraer solo las claves de las imágenes (no las URLs)
          imagenes = resultado.imagenes.map(img => {
            // Si es una URL, extraer la clave
            if (typeof img === 'string' && img.includes('amazonaws.com')) {
              const parts = img.split('/');
              return parts.slice(parts.indexOf('centros')).join('/');
            }
            return img;
          });
        }
      } catch (error) {
        console.error(`Error procesando imágenes para actualizar cancha: ${error.message}`);
        throw error;
      }
    }
    
    // Añadir campos obligatorios
    filteredData.imagenes = imagenes;
    filteredData.updatedAt = new Date().toISOString();
    
    // Condición optimista: solo actualiza si las imágenes no cambiaron desde que las leíste
    const params = {
      ...filteredData,
      updatedAt: filteredData.updatedAt
    };
    try {
      // Usar condición de DynamoDB para evitar sobrescribir si alguien más modificó imágenes
      return await this.repo.update(canchaId, params, {
        ConditionExpression: 'attribute_not_exists(imagenes) OR imagenes = :oldImagenes',
        ExpressionAttributeValues: {
          ':oldImagenes': canchaActual.imagenes || []
        }
      });
    } catch (error) {
      // Manejar conflicto de concurrencia (ConditionalCheckFailedException)
      if (error.code === 'ConditionalCheckFailedException') {
        const conflict = new Error('Conflicto de concurrencia: las imágenes han sido modificadas por otro usuario.');
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    }
  }

  async deleteCancha(canchaId) {
    // Obtener la cancha para conocer las keys de S3
    const cancha = await this.repo.findById(canchaId);
    if (cancha && Array.isArray(cancha.imagenes)) {
      // Eliminar solo las imágenes que son keys de S3 (no URLs externas)
      const s3Keys = cancha.imagenes.filter(img => 
        typeof img === 'string' && (img.startsWith('canchas/') || img.startsWith('centros/'))
      );
      
      // Usar el servicio de imágenes para eliminar las imágenes
      if (s3Keys.length > 0) {
        for (const key of s3Keys) {
          try {
            await canchaImageService.deleteCanchaImage(key);
          } catch (error) {
            console.error(`Error al eliminar imagen ${key}: ${error.message}`);
            // Continuar con las siguientes imágenes aunque falle una
          }
        }
      }
    }
    // Eliminar la cancha de la base de datos
    return await this.repo.delete(canchaId);
  }

  /**
   * Elimina una imagen específica de una cancha por su índice
   * @param {string} canchaId - ID de la cancha
   * @param {number} index - Índice de la imagen a eliminar
   * @param {string} userId - ID del usuario que realiza la solicitud
   * @returns {Promise<Object>} Cancha actualizada sin la imagen eliminada
   */
  async deleteImagenCancha(canchaId, index, userId) {
    try {
      // Utilizamos el servicio especializado para eliminar la imagen por índice
      return await this.imagenService.deleteCanchaImageByIndex(canchaId, index, userId);
    } catch (error) {
      console.error(`Error al eliminar imagen de cancha por índice: ${error.message}`);
      throw error;
    }
  }

  async listCanchasByCentro(centroId, options = {}) {
    try {
      // Paginación nativa con DynamoDB y filtros simples (tipo, disponible)
      const limit = parseInt(options.limit, 10) || 10;
      const lastEvaluatedKey = options.lastEvaluatedKey || undefined;
      const tipo = options.tipo;
      const disponible = options.disponible;
      
      const result = await this.repo.findByCentroId(centroId, { limit, lastEvaluatedKey, tipo, disponible });
      
      // Enriquecer los resultados con URLs firmadas para las imágenes
      if (result.items && result.items.length > 0) {
        for (const cancha of result.items) {
          if (cancha.imagenes && Array.isArray(cancha.imagenes)) {
            cancha.imagenes = await Promise.all(
              cancha.imagenes.map(async (key) => {
                if (typeof key === 'string' && (key.startsWith('canchas/') || key.startsWith('centros/'))) {
                  // Usar el servicio de imágenes para obtener la URL presignada
                  return canchaImageService.getCanchaImageUrl(key);
                }
                return key; // Si no es una key de S3, devolver tal cual
              })
            );
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error(`Error al listar canchas por centro ${centroId}:`, error);
      throw error;
    }
  }

  async getCanchaById(canchaId) {
    try {
      const cancha = await this.repo.findById(canchaId);
      if (!cancha) {
        const error = new Error('Cancha no encontrada');
        error.statusCode = 404;
        throw error;
      }
      
      // Enriquecer con URLs firmadas para las imágenes
      if (cancha.imagenes && Array.isArray(cancha.imagenes)) {
        cancha.imagenes = await Promise.all(
          cancha.imagenes.map(async (key) => {
            if (typeof key === 'string' && (key.startsWith('canchas/') || key.startsWith('centros/'))) {
              // Usar el servicio de imágenes para obtener la URL presignada
              return canchaImageService.getCanchaImageUrl(key);
            }
            return key; // Si no es una key de S3, devolver tal cual
          })
        );
      }
      
      return cancha;
    } catch (error) {
      console.error(`Error al obtener cancha ${canchaId}:`, error);
      throw error;
    }
  }

  async getAllCanchas(options = {}) {
    try {
      const result = await this.repo.findAll(options);
      // Enriquecer los resultados con URLs firmadas para las imágenes
      if (result.items && result.items.length > 0) {
        for (const cancha of result.items) {
          if (cancha.imagenes && Array.isArray(cancha.imagenes)) {
            cancha.imagenes = await Promise.all(
              cancha.imagenes.map(async (key) => {
                if (typeof key === 'string' && (key.startsWith('canchas/') || key.startsWith('centros/'))) {
                  // Usar el servicio de imágenes para obtener la URL presignada
                  return canchaImageService.getCanchaImageUrl(key);
                }
                return key; // Si no es una key de S3, devolver tal cual
              })
            );
          }
        }
      }
      return result;
    } catch (error) {
      console.error('Error al obtener todas las canchas:', error);
      throw error;
    }
  }
}

module.exports = new CanchasService();
