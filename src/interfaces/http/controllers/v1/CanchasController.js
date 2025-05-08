// src/interfaces/http/controllers/v1/CanchasController.js
const canchasService = require('../../../../infrastructure/services/canchasService');
const Boom = require('@hapi/boom');

// Implementación alternativa de checkCentroOwnership para evitar problemas de importación
const checkOwnership = async (userId, centroId) => {
  try {
    const centroDeportivoRepository = require('../../../../infrastructure/repositories/centroDeportivoRepository');
    if (!centroId) {
      const error = new Error('Se requiere el ID del centro deportivo');
      error.isBoom = true;
      error.output = { statusCode: 400, payload: { message: 'Se requiere el ID del centro deportivo' } };
      throw error;
    }
    
    // Obtener el centro deportivo
    const centro = await centroDeportivoRepository.findById(centroId);
    
    if (!centro) {
      const error = new Error('Centro deportivo no encontrado');
      error.isBoom = true;
      error.output = { statusCode: 404, payload: { message: 'Centro deportivo no encontrado' } };
      throw error;
    }
    
    // Verificar si el usuario es el administrador del centro
    if (centro.adminId !== userId) {
      const error = new Error('No tienes permisos para realizar esta acción en este centro deportivo');
      error.isBoom = true;
      error.output = { statusCode: 403, payload: { message: 'No tienes permisos para realizar esta acción en este centro deportivo' } };
      throw error;
    }
    
    return true;
  } catch (error) {
    throw error;
  }
};

// Crear cancha
exports.createCancha = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const centroId = req.body.centroId;
    await checkOwnership(userId, centroId);
    const cancha = await canchasService.createCancha(req.body);
    return res.status(201).json(cancha);
  } catch (error) {
    next(error);
  }
};

// Obtener cancha por ID
exports.getCanchaById = async (req, res, next) => {
  try {
    const cancha = await canchasService.getCanchaById(req.params.canchaId);
    if (!cancha) throw Boom.notFound('Cancha no encontrada');
    return res.status(200).json(cancha);
  } catch (error) {
    next(error);
  }
};

// Actualizar cancha
exports.updateCancha = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const canchaId = req.params.canchaId;
    const cancha = await canchasService.getCanchaById(canchaId);
    if (!cancha) throw Boom.notFound('Cancha no encontrada');
    await checkOwnership(userId, cancha.centroId);
    const updated = await canchasService.updateCancha(canchaId, req.body);
    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

// Eliminar cancha
exports.deleteCancha = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const cancha = await canchasService.getCanchaById(req.params.canchaId);
    if (!cancha) throw Boom.notFound('Cancha no encontrada');
    await checkOwnership(userId, cancha.centroId);
    await canchasService.deleteCancha(req.params.canchaId);
    return res.status(200).json({ message: 'Cancha eliminada' });
  } catch (error) {
    next(error);
  }
};

// Listar canchas por centro deportivo con paginación y filtros simples
exports.listCanchasByCentro = async (req, res, next) => {
  const startTime = process.hrtime();
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const centroId = req.params.centroId;
    // Filtros simples
    const tipo = req.query.tipo;
    const disponible = req.query.disponible !== undefined ? req.query.disponible === 'true' : undefined;
    const result = await canchasService.listCanchasByCentro(centroId, {
      page,
      limit,
      tipo,
      disponible
    });
    const [sec, nano] = process.hrtime(startTime);
    const responseTimeMs = (sec * 1000 + nano / 1e6).toFixed(2);
    // Puedes enviar la métrica al logger o a un sistema externo
    console.log(`[Métrica] listCanchasByCentro tiempo de respuesta: ${responseTimeMs} ms`);
    return res.status(200).json({ ...result, responseTimeMs });
  } catch (error) {
    next(error);
  }
};