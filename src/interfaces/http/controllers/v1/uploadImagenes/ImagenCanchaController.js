// src/interfaces/http/controllers/v1/uploadImagenes/ImagenCanchaController.js
/**
 * Controlador para gestionar imágenes de canchas deportivas
 * Responsabilidad única: Manejar las solicitudes HTTP relacionadas con imágenes de canchas
 */
const canchasService = require('../../../../../infrastructure/services/canchasService');
const CanchaImagenService = require('../../../../../infrastructure/services/canchas/canchaImagenService');
const CanchasRepository = require('../../../../../infrastructure/repositories/canchasRepository');
const Boom = require('@hapi/boom');
const { sanitizeString } = require('../../../../../utils/sanitizeInput');

// Importar el middleware de autorización para verificar propiedad
const { checkCanchaPermission } = require('../../../../middlewares/auth/checkCanchaOwnershipMiddleware');

// Crear instancia del servicio de imágenes
let canchaImagenService;

// Intentar crear la instancia del servicio de imágenes
try {
  canchaImagenService = new CanchaImagenService(new CanchasRepository());
  console.log('Servicio de imágenes de canchas inicializado correctamente');
} catch (error) {
  console.error('Error al inicializar el servicio de imágenes de canchas:', error.message);
  // No creamos una implementación de respaldo aquí, ya que se manejará en los métodos
}

/**
 * Subir imágenes o agregar URLs a una cancha deportiva
 * Permite máximo 3 imágenes por cancha
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Next middleware
 * @returns {Promise<Object>} - Respuesta con URLs de imágenes
 */
exports.uploadImagenes = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const { canchaId } = req.params;
    
    // Obtener los grupos del usuario
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    
    // Registrar información para depuración
    console.log(`Procesando imágenes para cancha. Usuario: ${userId}, Grupos: ${JSON.stringify(userGroups)}`);
    
    // Verificar que la cancha existe
    try {
      const cancha = await canchasService.getCanchaById(canchaId);
      
      if (!cancha) {
        return res.status(404).json({
          statusCode: 404,
          error: 'Not Found',
          message: 'Cancha no encontrada'
        });
      }
      
      // La verificación de permisos ya se realiza en el middleware checkCanchaOwnershipMiddleware
      // Sin embargo, también pasamos los grupos al servicio para verificación adicional
      
      // Procesar archivos subidos
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: 'No se han enviado imágenes para subir'
        });
      }
      
      // Intentar usar el servicio especializado para procesar las imágenes
      let resultado;
      try {
        if (canchaImagenService) {
          // Usar el servicio especializado si está disponible
          resultado = await canchaImagenService.processCanchaImages(canchaId, req.files, userId, userGroups);
        } else {
          throw new Error('Servicio de imágenes no disponible');
        }
      } catch (serviceError) {
        console.warn(`Error al usar el servicio especializado, usando implementación de respaldo: ${serviceError.message}`);
        
        // Implementación de respaldo si el servicio especializado falla
        // Actualizar imágenes de la cancha directamente usando el servicio básico
        const cancha_actualizada = await canchasService.updateCancha(canchaId, {}, req.files);
        resultado = { imagenes: cancha_actualizada.imagenes };
      }
      
      return res.status(200).json({ 
        statusCode: 200,
        message: 'Imágenes actualizadas correctamente',
        imagenes: resultado.imagenes 
      });
    } catch (error) {
      // Si el error ya tiene formato Boom, usarlo directamente
      if (error.isBoom) {
        const { statusCode, payload } = error.output;
        return res.status(statusCode).json({
          statusCode,
          error: payload.error || 'Error',
          message: payload.message
        });
      }
      
      // Mensajes descriptivos para errores comunes
      if (error.message.includes('tamaño máximo')) {
        return res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Error al subir imagen a S3: tamaño excedido. Máximo permitido 5MB.'
        });
      }
      if (error.message.includes('no es una imagen válida')) {
        return res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Error al subir imagen: el archivo no es una imagen válida.'
        });
      }
      if (error.message.includes('Solo se permiten imágenes')) {
        return res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Error al subir imagen: solo se permiten imágenes JPEG, PNG o WEBP.'
        });
      }
      if (error.message.includes('más de 3 imágenes')) {
        return res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message
        });
      }
      
      // Para otros errores, crear una respuesta estructurada
      console.error('Error al subir imágenes:', error);
      return res.status(500).json({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Error al procesar la solicitud de imágenes'
      });
    }
  } catch (error) {
    console.error('Error general en uploadImagenes:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Eliminar una imagen específica de una cancha por su índice en el array
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Next middleware
 * @returns {Promise<Object>} - Respuesta con mensaje de éxito
 */
exports.deleteImagenPorIndice = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const { canchaId, index } = req.params;
    
    // Obtener los grupos del usuario
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    
    // Registrar información para depuración
    console.log(`Eliminando imagen de cancha. Usuario: ${userId}, Grupos: ${JSON.stringify(userGroups)}`);
    
    try {
      // Intentar eliminar la imagen usando el servicio especializado
      let resultado;
      try {
        if (canchaImagenService) {
          // Usar el servicio especializado si está disponible
          resultado = await canchaImagenService.deleteCanchaImageByIndex(canchaId, index, userId, userGroups);
        } else {
          throw new Error('Servicio de imágenes no disponible');
        }
      } catch (serviceError) {
        console.warn(`Error al usar el servicio especializado para eliminar imagen, usando implementación de respaldo: ${serviceError.message}`);
        
        // Implementación de respaldo si el servicio especializado falla
        // Obtener la cancha
        const cancha = await canchasService.getCanchaById(canchaId);
        if (!cancha || !cancha.imagenes) {
          throw Boom.notFound('Cancha no encontrada o no tiene imágenes');
        }
        
        // Convertir el índice a número
        const imageIndex = parseInt(index, 10);
        if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= cancha.imagenes.length) {
          throw Boom.badRequest(`Índice de imagen inválido. La cancha tiene ${cancha.imagenes.length} imágenes.`);
        }
        
        // Eliminar la imagen del array
        const imagenes = [...cancha.imagenes];
        imagenes.splice(imageIndex, 1);
        
        // Actualizar la cancha
        const cancha_actualizada = await canchasService.updateCancha(canchaId, { imagenes });
        resultado = { imagenes: cancha_actualizada.imagenes || [] };
      }
      
      return res.status(200).json({ 
        statusCode: 200,
        message: 'Imagen eliminada correctamente',
        imagenes: resultado.imagenes || []
      });
    } catch (error) {
      // Si el error ya tiene formato Boom, usarlo directamente
      if (error.isBoom) {
        const { statusCode, payload } = error.output;
        return res.status(statusCode).json({
          statusCode,
          error: payload.error || 'Error',
          message: payload.message
        });
      }
      
      // Mensajes descriptivos para errores comunes
      console.error('[ERROR] Error eliminando imagen de la cancha por índice:', error);
      return res.status(500).json({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Error al eliminar la imagen de la cancha'
      });
    }
  } catch (error) {
    console.error('Error general en deleteImagenPorIndice:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Error interno del servidor'
    });
  }
};