// src/interfaces/http/controllers/v1/CanchasController.js
const canchasService = require('../../../../infrastructure/services/canchasService');
const Boom = require('@hapi/boom');

// Importar el middleware de autorización para verificar propiedad
const { checkCentroOwnership, checkCanchaPermission } = require('../../../middlewares/auth/checkCanchaOwnershipMiddleware');

// Crear cancha
exports.createCancha = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const centroId = req.body.centroId;
    
    // Obtener los grupos del usuario
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    
    // Registrar información para depuración
    console.log(`Verificando permisos para crear cancha. Usuario: ${userId}, Grupos: ${JSON.stringify(userGroups)}`);
    
    // Verificar permisos pasando los grupos del usuario
    await checkCentroOwnership(userId, centroId, userGroups);
    
    const cancha = await canchasService.createCancha(req.body);
    return res.status(201).json(cancha);
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
    
    // Para otros errores, crear una respuesta estructurada
    console.error('Error al crear cancha:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      statusCode,
      error: statusCode === 500 ? 'Internal Server Error' : 'Bad Request',
      message: error.message || 'Error al procesar la solicitud'
    });
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
    const userId = req.user.sub || req.user.userId;
    const canchaId = req.params.canchaId;
    
    // Obtener los grupos del usuario
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    
    // Registrar información para depuración
    console.log(`Verificando permisos para actualizar cancha. Usuario: ${userId}, Grupos: ${JSON.stringify(userGroups)}`);
    
    // Asegurarse de que el cuerpo de la solicitud sea un objeto JSON válido
    let updateData;
    
    try {
      // Si req.body es un string o un Buffer, intentar parsearlo como JSON
      if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
        updateData = JSON.parse(req.body.toString());
      } else if (typeof req.body === 'object') {
        // Si ya es un objeto, usarlo directamente
        updateData = req.body;
      } else {
        throw new Error('Formato de datos inválido');
      }
    } catch (parseError) {
      console.error('Error al parsear el cuerpo de la solicitud:', parseError);
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'El cuerpo de la solicitud debe ser un objeto JSON válido'
      });
    }
    
    // Validar que updateData sea un objeto válido
    if (!updateData || typeof updateData !== 'object' || Array.isArray(updateData)) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'El cuerpo de la solicitud debe ser un objeto JSON válido'
      });
    }
    
    // Obtener la cancha actual
    const cancha = await canchasService.getCanchaById(canchaId);
    if (!cancha) {
      return res.status(404).json({
        statusCode: 404,
        error: 'Not Found',
        message: 'Cancha no encontrada'
      });
    }
    
    // Verificar permisos usando checkCentroOwnership
    await checkCentroOwnership(userId, cancha.centroId, userGroups);
    
    // Actualizar la cancha con los datos parseados
    const updated = await canchasService.updateCancha(canchaId, updateData);
    return res.status(200).json(updated);
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
    
    // Para otros errores, crear una respuesta estructurada
    console.error('Error al actualizar cancha:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      statusCode,
      error: statusCode === 500 ? 'Internal Server Error' : 'Bad Request',
      message: error.message || 'Error al procesar la solicitud'
    });
  }
};

// Eliminar cancha
exports.deleteCancha = async (req, res, next) => {
  try {
    const userId = req.user.sub || req.user.userId;
    const canchaId = req.params.canchaId;
    
    // Obtener los grupos del usuario
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    
    // Registrar información para depuración
    console.log(`Verificando permisos para eliminar cancha. Usuario: ${userId}, Grupos: ${JSON.stringify(userGroups)}`);
    
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
      
      // Verificar permisos pasando los grupos del usuario
      await checkCanchaPermission(userId, canchaId, userGroups);
      
      // Eliminar la cancha
      await canchasService.deleteCancha(canchaId);
      
      return res.status(200).json({ 
        statusCode: 200,
        message: 'Cancha eliminada exitosamente' 
      });
    } catch (serviceError) {
      // Manejar errores específicos del servicio
      console.error('Error al obtener o eliminar cancha:', serviceError);
      throw serviceError;
    }
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
    
    // Para otros errores, crear una respuesta estructurada
    console.error('Error al eliminar cancha:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      statusCode,
      error: statusCode === 500 ? 'Internal Server Error' : 'Bad Request',
      message: error.message || 'Error al procesar la solicitud'
    });
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

// Obtener todas las canchas
exports.getAllCanchas = async (req, res, next) => {
  try {
    const startTime = process.hrtime();
    const { limit, lastEvaluatedKey, tipo, disponible, centroId } = req.query;
    
    const options = {
      limit: limit ? parseInt(limit, 10) : 50,
      lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined,
      tipo,
      disponible: disponible === 'true' ? true : disponible === 'false' ? false : undefined,
      centroId
    };
    
    const result = await canchasService.getAllCanchas(options);
    
    const [sec, nano] = process.hrtime(startTime);
    const responseTimeMs = (sec * 1000 + nano / 1e6).toFixed(2);
    console.log(`[Métrica] getAllCanchas tiempo de respuesta: ${responseTimeMs} ms`);
    
    return res.status(200).json({ ...result, responseTimeMs });
  } catch (error) {
    console.error('Error al obtener todas las canchas:', error);
    next(Boom.boomify(error));
  }
};
