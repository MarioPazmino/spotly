// src/interfaces/http/controllers/v1/uploadImagenes/ImagenCanchaController.js
const canchasService = require('../../../../../infrastructure/services/canchasService');
const Boom = require('@hapi/boom');
const { sanitizeString } = require('../../../../../utils/sanitizeInput');
const AWS = require('aws-sdk');

/**
 * Subir imágenes o agregar URLs a una cancha deportiva
 * Permite máximo 3 imágenes por cancha
 */
exports.uploadImagenes = async (req, res, next) => {
  try {
    const { canchaId } = req.params;
    let imagenes = [];
    // Procesar archivos subidos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          imagenes.push(file); // El servicio ya limita a 3 imágenes
        } catch (err) {
          // Esto es defensivo, normalmente el error ocurre en el servicio, pero si ocurre aquí lo capturamos
          return next(Boom.badRequest(`Error al procesar el archivo ${file.originalname}: ${err.message}`));
        }
      }
    }
    // Actualizar imágenes de la cancha (el servicio gestiona el límite y la subida)
    try {
      const cancha = await canchasService.updateCancha(canchaId, {}, imagenes);
      return res.status(200).json({ imagenes: cancha.imagenes });
    } catch (error) {
      // Mensajes descriptivos para errores comunes
      if (error.message.includes('tamaño máximo')) {
        return next(Boom.badRequest('Error al subir imagen a S3: tamaño excedido. Máximo permitido 15MB.'));
      }
      if (error.message.includes('no es una imagen válida')) {
        return next(Boom.badRequest('Error al subir imagen: el archivo no es una imagen válida.'));
      }
      if (error.message.includes('Solo se permiten imágenes')) {
        return next(Boom.badRequest('Error al subir imagen: solo se permiten imágenes JPEG, PNG o WEBP.'));
      }
      return next(Boom.badRequest(`Error al subir imagen: ${error.message}`));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una imagen específica de una cancha (por key exacta)
 * Elimina de S3 si corresponde, actualiza el array de imágenes de la cancha
 */
exports.deleteImagen = async (req, res, next) => {
  try {
    const { canchaId, key } = req.params;
    // Obtener la cancha
    const cancha = await canchasService.getCanchaById(canchaId);
    if (!cancha) throw Boom.notFound('Cancha no encontrada');
    if (!Array.isArray(cancha.imagenes) || cancha.imagenes.length === 0)
      throw Boom.notFound('La cancha no tiene imágenes');
    // Buscar la imagen a eliminar (exact match)
    const index = cancha.imagenes.findIndex(img => img === key);
    if (index === -1) throw Boom.notFound('Imagen no encontrada en la cancha');
    // Si es key S3, verificar existencia y eliminar de S3
    if (typeof key === 'string' && key.startsWith('centros/')) {
      const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
      const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
      // Verificar si el objeto existe antes de eliminar
      try {
        await s3.headObject({ Bucket: BUCKET, Key: key }).promise();
      } catch (err) {
        if (err.code === 'NotFound') {
          return next(Boom.notFound('La imagen no existe en S3.'));
        }
        return next(Boom.badImplementation('Error al verificar la existencia de la imagen en S3.'));
      }
      // Eliminar de S3
      const deleteParams = {
        Bucket: BUCKET,
        Delete: {
          Objects: [{ Key: key }],
          Quiet: true
        }
      };
      await s3.deleteObjects(deleteParams).promise();
    }
    // Quitar la imagen del array y actualizar la cancha
    cancha.imagenes.splice(index, 1);
    await canchasService.updateCancha(canchaId, { imagenes: cancha.imagenes });
    return res.status(200).json({ imagenes: cancha.imagenes });
  } catch (error) {
    next(error);
  }
};