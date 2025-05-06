// src/interfaces/http/controllers/v1/centros/ImagenCentroController.js
const Boom = require('@hapi/boom');
const imagenCentroService = require('../../../../../infrastructure/services/imagenCentroService');

/**
 * Subir imágenes a un centro deportivo
 */
exports.uploadImagenes = async (req, res, next) => {
  try {
    const { centroId } = req.params;
    
    if (!req.files || req.files.length === 0) {
      throw Boom.badRequest('No se proporcionaron archivos');
    }

    const imagenes = await imagenCentroService.agregarImagenes(centroId, req.files);
    return res.status(200).json({ imagenes });
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una imagen específica de un centro deportivo
 */
exports.deleteImagen = async (req, res, next) => {
  try {
    const { centroId, key } = req.params;
    const imagenes = await imagenCentroService.eliminarImagen(centroId, key);
    return res.status(200).json({ imagenes });
  } catch (error) {
    next(error);
  }
};
