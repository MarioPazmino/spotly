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

// Listar centros deportivos
exports.listCentros = async (req, res, next) => {
  try {
    // Extraer parámetros de consulta
    const {
      page = 1,
      limit = 10,
      sort = 'nombre',
      order = 'asc',
      nombre,
      estado,
      servicios,
      userId
    } = req.query;

    // Construir opciones de filtrado
    const filters = {};
    if (nombre) filters.nombre = nombre;
    if (estado) filters.estado = estado;
    if (servicios) filters.servicios = servicios.split(',');
    if (userId) filters.userId = userId;

    // Opciones de paginación y ordenamiento
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
      order
    };

    // Llamar al servicio
    const result = await centroDeportivoService.listCentros(filters, options);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};