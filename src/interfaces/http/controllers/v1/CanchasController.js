// src/interfaces/http/controllers/v1/CanchasController.js
const canchasService = require('../../../../infrastructure/services/canchasService');
const Boom = require('@hapi/boom');
const { checkCentroOwnership } = require('../../../../utils/authUtils');

// Crear cancha
exports.createCancha = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const centroId = req.body.centroId;
    await checkCentroOwnership(userId, centroId);
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
    await checkCentroOwnership(userId, cancha.centroId);
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
    await checkCentroOwnership(userId, cancha.centroId);
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