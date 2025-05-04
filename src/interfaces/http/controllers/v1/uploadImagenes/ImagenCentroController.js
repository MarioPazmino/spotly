// src/interfaces/http/controllers/v1/centros/ImagenCentroController.js
const Boom = require('@hapi/boom');
const centroDeportivoService = require('../../../../../infrastructure/services/centroDeportivoService');
const { uploadImage, getPresignedUrl } = require('../../../../../infrastructure/services/s3Service');
const { sanitizeString } = require('../../../../../utils/sanitizeInput');
const AWS = require('aws-sdk');

/**
 * Subir imágenes o agregar URLs a un centro deportivo
 * Permite máximo 3 imágenes por centro
 */
exports.uploadImagenes = async (req, res, next) => {
  try {
    const { centroId } = req.params;
    let imagenes = [];

    // 1. Procesar archivos subidos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Subir imagen como privada y obtener key
        const key = await uploadImage(file.buffer, file.originalname, centroId);
        // Generar presigned URL para mostrar la imagen
        const presignedUrl = getPresignedUrl(key); // Usar expiración configurable
        imagenes.push(presignedUrl);
      }
    }

    // 3. Obtener imágenes actuales
    const centro = await centroDeportivoService.getCentroById(centroId);
    let actuales = Array.isArray(centro.imagenes) ? centro.imagenes : [];

    // 4. Unir y limitar a 3 imágenes
    const nuevas = [...actuales, ...imagenes].slice(0, 3);
    await centroDeportivoService.updateCentro(centroId, { imagenes: nuevas });

    return res.status(200).json({ imagenes: nuevas });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una imagen específica de un centro deportivo (por key exacta)
 * Elimina de S3 si corresponde, actualiza el array de imágenes en la base de datos
 */
exports.deleteImagen = async (req, res, next) => {
  try {
    const { centroId, key } = req.params;
    // Obtener el centro
    const centro = await centroDeportivoService.getCentroById(centroId);
    if (!centro) throw Boom.notFound('Centro deportivo no encontrado');
    if (!Array.isArray(centro.imagenes) || centro.imagenes.length === 0)
      throw Boom.notFound('El centro no tiene imágenes');

    // Buscar la imagen a eliminar (exact match)
    const index = centro.imagenes.findIndex(img => img === key);
    if (index === -1) throw Boom.notFound('Imagen no encontrada en el centro');

    // Si es key S3, eliminar de S3
    if (typeof key === 'string' && key.startsWith('centros/')) {
      const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
      const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
      const deleteParams = {
        Bucket: BUCKET,
        Delete: {
          Objects: [{ Key: key }],
          Quiet: true
        }
      };
      await s3.deleteObjects(deleteParams).promise();
    }

    // Quitar la imagen del array y actualizar el centro
    centro.imagenes.splice(index, 1);
    await centroDeportivoService.updateCentro(centroId, { imagenes: centro.imagenes });

    return res.status(200).json({ imagenes: centro.imagenes });
  } catch (error) {
    next(error);
  }
};
