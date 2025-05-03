//src/interfaces/http/controllers/v1/CentroDeportivoController.js
const Boom = require('@hapi/boom');
const centroDeportivoService = require('../../../../infrastructure/services/centroDeportivoService');

// Crear centro deportivo
exports.createCentro = async (req, res, next) => {
  try {
    const centroData = req.body;
    const centro = await centroDeportivoService.createCentro(centroData);
    return res.status(201).json(centro);
  } catch (error) {
    next(error);
  }
};

// Obtener centro deportivo por ID
exports.getCentroById = async (req, res, next) => {
  try {
    const { centroId } = req.params;
    const centro = await centroDeportivoService.getCentroById(centroId);
    return res.status(200).json(centro);
  } catch (error) {
    next(error);
  }
};

// Actualizar centro deportivo
exports.updateCentro = async (req, res, next) => {
  try {
    const { centroId } = req.params;
    const updateData = req.body;
    const centro = await centroDeportivoService.updateCentro(centroId, updateData);
    return res.status(200).json(centro);
  } catch (error) {
    next(error);
  }
};

// Eliminar centro deportivo
exports.deleteCentro = async (req, res, next) => {
  try {
    const { centroId } = req.params;
    await centroDeportivoService.deleteCentro(centroId);
    return res.status(200).json({ message: 'Centro deportivo eliminado' });
  } catch (error) {
    next(error);
  }
};
