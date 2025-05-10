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
    const result = await centroDeportivoService.deleteCentro(centroId);
    
    return res.status(200).json({
      status: 'success',
      message: 'Centro deportivo eliminado correctamente',
      data: {
        centroId,
        deleted: true
      }
    });
  } catch (error) {
    // Si es un error de Boom, formatearlo para una respuesta más amigable
    if (error.isBoom) {
      const { statusCode, payload } = error.output;
      return res.status(statusCode).json({
        status: 'error',
        code: payload.error,
        message: payload.message || 'Error al eliminar el centro deportivo',
        details: error.data
      });
    }
    
    // Para otros errores, pasar al middleware de manejo de errores
    next(error);
  }
};

// Listar centros deportivos
// Listar centros deportivos con filtros avanzados
exports.listCentros = async (req, res, next) => {
  try {
    // Extraer parámetros de consulta para paginación y ordenamiento
    const {
      page = 1,
      limit = 10,
      sort = 'nombre',
      order = 'asc',
    } = req.query;

    // Configurar opciones de paginación y ordenamiento
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
      order
    };

    // Extraer todos los posibles filtros de la query
    const filters = {};
    
    // Filtros básicos
    if (req.query.nombre) filters.nombre = req.query.nombre;
    if (req.query.estado) filters.estado = req.query.estado;
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.cedulaJuridica) filters.cedulaJuridica = req.query.cedulaJuridica;
    
    // Filtros de horario
    if (req.query.horarioApertura) filters.horarioApertura = req.query.horarioApertura;
    if (req.query.horarioCierre) filters.horarioCierre = req.query.horarioCierre;
    
    // Filtro de servicios (array)
    if (req.query.servicios) {
      filters.servicios = req.query.servicios.split(',');
    }
    
    // Filtro por rangos de horario (custom)
    if (req.query.abiertoDespuesDe) {
      filters.abiertoDespuesDe = req.query.abiertoDespuesDe;
    }
    if (req.query.abiertoAntesDe) {
      filters.abiertoAntesDe = req.query.abiertoAntesDe;
    }
    
    // Filtros de estado de Braintree
    if (req.query.braintreeStatus) filters.braintreeStatus = req.query.braintreeStatus;
    
    // Llamar al servicio con los filtros extraídos
    const result = await centroDeportivoService.listCentros(filters, options);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// NUEVO MÉTODO: Buscar centros deportivos por ubicación geográfica
exports.findCentrosByLocation = async (req, res, next) => {
  try {
    // Extraer parámetros de ubicación
    const { lat, lng, radius = 5 } = req.query;
    
    // Validar que se proporcionaron coordenadas
    if (!lat || !lng) {
      throw Boom.badRequest('Se requieren las coordenadas de latitud (lat) y longitud (lng)');
    }
    
    // Construir objeto de coordenadas
    const coordinates = {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    };
    
    // Extraer parámetros de filtrado y paginación
    const {
      page = 1,
      limit = 10,
      sort = 'distance', // Por defecto ordenamos por distancia
      order = 'asc',     // Ascendente (más cercano primero)
    } = req.query;

    // Construir opciones de filtrado (mismo proceso que en listCentros)
    const filters = {};
    
    // Filtros básicos
    if (req.query.nombre) filters.nombre = req.query.nombre;
    if (req.query.estado) filters.estado = req.query.estado;
    if (req.query.userId) filters.userId = req.query.userId;
    if (req.query.cedulaJuridica) filters.cedulaJuridica = req.query.cedulaJuridica;
    
    // Filtros de horario
    if (req.query.horarioApertura) filters.horarioApertura = req.query.horarioApertura;
    if (req.query.horarioCierre) filters.horarioCierre = req.query.horarioCierre;
    
    // Filtro de servicios (array)
    if (req.query.servicios) {
      filters.servicios = req.query.servicios.split(',');
    }
    
    // Filtro por rangos de horario (custom)
    if (req.query.abiertoDespuesDe) {
      filters.abiertoDespuesDe = req.query.abiertoDespuesDe;
    }
    if (req.query.abiertoAntesDe) {
      filters.abiertoAntesDe = req.query.abiertoAntesDe;
    }
    
    // Filtros de estado de Braintree
    if (req.query.braintreeStatus) filters.braintreeStatus = req.query.braintreeStatus;

    // Opciones de paginación y ordenamiento
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort,
      order
    };

    // Llamar al servicio con radio en kilómetros
    const result = await centroDeportivoService.findCentrosByLocation(
      coordinates, 
      parseFloat(radius),
      filters,
      options
    );
    // Incluir el campo distance en cada centro (si existe)
    const response = {
      ...result,
      items: result.items.map(centro => ({
        ...centro,
        distance: centro.distance !== undefined ? centro.distance : null
      }))
    };
    return res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};