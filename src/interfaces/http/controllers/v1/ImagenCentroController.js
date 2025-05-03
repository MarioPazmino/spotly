// src/interfaces/http/controllers/v1/ImagenCentroController.js
const Boom = require('@hapi/boom');
const centroDeportivoService = require('../../../../infrastructure/services/centroDeportivoService');
const { uploadImage, getPresignedUrl } = require('../../../../infrastructure/services/s3Service');
const { sanitizeString } = require('../../../../utils/sanitizeInput');

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
        const presignedUrl = getPresignedUrl(key, 3600); // 1 hora por defecto
        imagenes.push(presignedUrl);
      }
    }

    // 2. Procesar URLs enviadas en el body
    if (Array.isArray(req.body.urls)) {
      for (const url of req.body.urls) {
        if (typeof url === 'string' && /\.(jpg|jpeg|png)$/i.test(url)) {
          // Sanitizar la URL antes de usarla
          imagenes.push(sanitizeString(url));
        }
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
