// src/interfaces/http/controllers/v1/uploadImagenes/ImagenCentroController.js
/**
 * Controlador para la gestión de imágenes de centros deportivos
 * Responsabilidad única: Manejar las solicitudes HTTP relacionadas con imágenes de centros deportivos
 * - Recibir solicitudes
 * - Validar datos de entrada
 * - Delegar la lógica de negocio al servicio correspondiente
 * - Formatear y enviar respuestas
 */
const Boom = require('@hapi/boom');
const CentroDeportivoRepository = require('../../../../../infrastructure/repositories/centroDeportivoRepository');
const CentroImagenService = require('../../../../../infrastructure/services/centroDeportivo/centroImagenService');
const { sanitizeImageUrl } = require('../../../../../utils/sanitizeInput');

// Instanciar el servicio de imágenes de centros deportivos
// Nota: Siguiendo el patrón Singleton de la aplicación, no usamos 'new'
const centroImagenService = new CentroImagenService(CentroDeportivoRepository);

/**
 * Función auxiliar para extraer el rol del usuario
 * @param {Object} user - Objeto de usuario
 * @returns {string|null} - Rol del usuario
 */
function extractUserRole(user) {
  // Si ya tiene un rol explícito, usarlo
  if (user.role) return user.role;
  
  // Si no hay rol explícito, verificar los grupos del usuario
  if (user.groups && Array.isArray(user.groups)) {
    if (user.groups.includes('super_admin')) {
      return 'super_admin';
    } else if (user.groups.includes('admin_centro')) {
      return 'admin_centro';
    }
  }
  
  // Si no hay grupos, verificar cognito:groups
  if (user['cognito:groups'] && Array.isArray(user['cognito:groups'])) {
    if (user['cognito:groups'].includes('super_admin')) {
      return 'super_admin';
    } else if (user['cognito:groups'].includes('admin_centro')) {
      return 'admin_centro';
    }
  }
  
  return null;
}

/**
 * Subir o añadir una imagen a un centro deportivo
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
exports.uploadImagen = async (req, res, next) => {
  try {
    // 1. Extraer datos de la solicitud
    const { centroId } = req.params;
    const requesterId = req.user.sub;
    const userRole = extractUserRole(req.user);
    
    console.log('Procesando solicitud de imagen para centro deportivo:', { 
      centroId, 
      requesterId, 
      userRole, 
      groups: req.user.groups 
    });

    // 2. Procesar la solicitud según el tipo (archivo o URL)
    let updatedCentro;
    let mensaje;
    
    if (req.file) {
      // 2.1 Caso: Archivo subido
      updatedCentro = await centroImagenService.addCentroImage(
        centroId, 
        req.file.buffer, 
        req.file.originalname, 
        requesterId,
        userRole
      );
      mensaje = 'Imagen subida correctamente';
    } else if (req.body.imageUrl) {
      // 2.2 Caso: URL de imagen
      // Validar URL básica
      if (!req.body.imageUrl.startsWith('http')) {
        throw Boom.badRequest('URL de imagen inválida');
      }
      
      updatedCentro = await centroImagenService.addExternalImageUrl(
        centroId,
        req.body.imageUrl,
        requesterId,
        userRole
      );
      mensaje = 'URL de imagen añadida correctamente';
    } else {
      // 2.3 Caso: No hay imagen ni URL
      throw Boom.badRequest('Se requiere un archivo de imagen o una URL de imagen');
    }
    
    // 3. Preparar y enviar respuesta
    const sanitizedUrl = sanitizeImageUrl(updatedCentro.nuevaImagen || req.body.imageUrl);
    
    return res.status(201).json({
      message: mensaje,
      centro: {
        ...updatedCentro,
        nuevaImagen: sanitizedUrl
      }
    });
  } catch (error) {
    console.error('Error en uploadImagen:', error);
    return next(error);
  }
};

/**
 * Eliminar una imagen específica de un centro deportivo
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
exports.deleteImagen = async (req, res, next) => {
  try {
    // 1. Extraer datos de la solicitud
    const { centroId, imageIndex } = req.params;
    const requesterId = req.user.sub;
    const userRole = extractUserRole(req.user);
    
    console.log('Procesando solicitud para eliminar imagen:', { 
      centroId, 
      imageIndex,
      requesterId, 
      userRole 
    });

    // 2. Validar datos de entrada
    if (isNaN(imageIndex) || imageIndex < 0) {
      throw Boom.badRequest('Índice de imagen inválido');
    }
    
    // 3. Delegar la lógica de negocio al servicio
    const updatedCentro = await centroImagenService.deleteCentroImage(
      centroId,
      parseInt(imageIndex, 10),
      requesterId,
      userRole
    );
    
    // 4. Formatear y enviar respuesta
    return res.status(200).json({
      message: 'Imagen eliminada correctamente',
      centro: updatedCentro
    });
  } catch (error) {
    console.error('Error en deleteImagen:', error);
    
    // Manejar el error directamente en lugar de pasarlo al siguiente middleware
    if (error.isBoom) {
      // Si es un error de Boom, extraer el payload y enviarlo como respuesta
      const { statusCode, payload } = error.output;
      return res.status(statusCode).json(payload);
    } else {
      // Si es otro tipo de error, crear una respuesta genérica
      return res.status(500).json({
        statusCode: 500,
        error: 'Error Interno del Servidor',
        message: 'Ocurrió un error al procesar la solicitud'
      });
    }
  }
};

/**
 * Obtener todas las imágenes de un centro deportivo
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
exports.getImagenes = async (req, res, next) => {
  try {
    // 1. Extraer datos de la solicitud
    const { centroId } = req.params;
    
    // 2. Buscar el centro deportivo
    const centro = await CentroDeportivoRepository.findById(centroId);
    if (!centro) {
      throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    }
    
    // 3. Verificar si hay imágenes
    if (!centro.imagenes || !Array.isArray(centro.imagenes) || centro.imagenes.length === 0) {
      return res.status(200).json({
        message: 'El centro deportivo no tiene imágenes',
        imagenes: []
      });
    }
    
    // 4. Procesar las imágenes
    const imagenesConUrl = await Promise.all(
      centro.imagenes.map(async (key, index) => {
        try {
          // 4.1 Determinar si es URL externa o key de S3
          const esUrlExterna = key.startsWith('http');
          
          // 4.2 Obtener la URL según el tipo
          let url;
          if (esUrlExterna) {
            url = key;
          } else {
            url = centroImagenService.getImageUrl(key);
          }
          
          // 4.3 Sanitizar la URL para seguridad
          return {
            index,
            url: sanitizeImageUrl(url),
            esUrlExterna
          };
        } catch (error) {
          console.error(`Error al procesar imagen ${index}:`, error);
          return {
            index,
            url: null,
            error: 'No se pudo generar la URL de la imagen'
          };
        }
      })
    );
    
    // 5. Formatear y enviar respuesta
    return res.status(200).json({
      message: 'Imágenes obtenidas correctamente',
      imagenes: imagenesConUrl
    });
  } catch (error) {
    console.error('Error en getImagenes:', error);
    return next(error);
  }
};
