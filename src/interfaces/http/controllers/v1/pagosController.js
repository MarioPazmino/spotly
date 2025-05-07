//src/interfaces/http/controllers/v1/pagosController.js

const Boom = require('@hapi/boom');
const PagosService = require('../../../infrastructure/services/pagosService');
const pagosService = new PagosService();
const ComprobanteTransferenciaController = require('./uploadImagenes/ComprobanteTransferenciaController');

/**
 * Wrapper para manejar errores en los controladores
 * @param {Function} handler - Función del controlador
 * @returns {Function} Middleware con manejo de errores
 */
const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    // Si el error ya es un Boom, lo pasamos directamente
    if (error.isBoom) {
      return next(error);
    }

    // Convertir errores comunes a Boom
    if (error.name === 'ValidationError') {
      return next(Boom.badRequest(error.message));
    }

    if (error.name === 'NotFoundError') {
      return next(Boom.notFound(error.message));
    }

    if (error.name === 'UnauthorizedError') {
      return next(Boom.unauthorized(error.message));
    }

    if (error.name === 'ForbiddenError') {
      return next(Boom.forbidden(error.message));
    }

    // Para errores de Braintree
    if (error.message.includes('Braintree')) {
      return next(Boom.badRequest(error.message));
    }

    // Para otros errores no manejados
    console.error('Error no manejado:', error);
    return next(Boom.internal('Error interno del servidor'));
  }
};

/**
 * Controlador base para operaciones CRUD de pagos
 */
class PagosController {
  async crearPago(req, res) {
      const pago = await pagosService.crearPago(req.body);
    res.status(201).json({
      success: true,
      data: pago
    });
  }

  async obtenerPagoPorId(req, res) {
    const { pagoId } = req.params;
    const pago = await pagosService.obtenerPagoPorId(pagoId);
    
    if (!pago) {
      throw Boom.notFound('Pago no encontrado');
    }

    res.json({
      success: true,
      data: pago
    });
  }

  async actualizarPago(req, res) {
    const { pagoId } = req.params;
    const pago = await pagosService.actualizarPago(pagoId, req.body);
    
    res.json({
      success: true,
      data: pago
    });
  }

  async eliminarPago(req, res) {
    const { pagoId } = req.params;
    await pagosService.eliminarPago(pagoId);
    
    res.json({
      success: true,
      message: 'Pago eliminado correctamente'
    });
  }

  async listarPagos(req, res) {
    const { limit, lastEvaluatedKey, ...filters } = req.query;
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
    };
    const result = await pagosService.findAll(filters, options);
    res.json(result);
  }

  async listarPagosPorCentro(req, res) {
    const { centroId } = req.params;
    const { limit, lastEvaluatedKey } = req.query;
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
    };
    const result = await pagosService.findAllByCentro(centroId, options);
    res.json(result);
  }

  async listarPagosPorUsuario(req, res) {
    const { userId } = req.params;
    const { limit, lastEvaluatedKey } = req.query;
    const options = {
      limit: limit ? parseInt(limit, 10) : undefined,
      lastEvaluatedKey: lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : undefined
    };
    const result = await pagosService.findAllByUser(userId, options);
    res.json(result);
  }
}

/**
 * Controlador específico para pagos en efectivo
 */
class PagosEfectivoController extends PagosController {
  async validarPago(req, res) {
    const { pagoId } = req.params;
    const { accion, motivoRechazo } = req.body;

    if (!['aceptar', 'rechazar'].includes(accion)) {
      throw Boom.badRequest('La acción debe ser "aceptar" o "rechazar"');
    }

    const pago = await pagosService.obtenerPagoPorId(pagoId);
    if (!pago) {
      throw Boom.notFound('Pago no encontrado');
    }

    if (pago.metodoPago !== 'efectivo') {
      throw Boom.badRequest('Este pago no es en efectivo');
    }

    if (pago.estado !== 'Pendiente') {
      throw Boom.badRequest('El pago ya ha sido procesado');
    }

    const pagoActualizado = await pagosService.actualizarPago(pagoId, {
      estado: accion === 'aceptar' ? 'Completado' : 'Rechazado',
      detallesPago: {
        ...pago.detallesPago,
        validadoPor: req.user.userId,
        validadoEn: new Date().toISOString(),
        motivoRechazo: accion === 'rechazar' ? (motivoRechazo || 'No especificado') : null
      }
    });

    res.json({
      success: true,
      data: pagoActualizado
    });
  }

  async obtenerCodigo(req, res) {
    const { pagoId } = req.params;
    const pago = await pagosService.obtenerPagoPorId(pagoId);

    if (!pago) {
      throw Boom.notFound('Pago no encontrado');
    }

    if (pago.metodoPago !== 'efectivo') {
      throw Boom.badRequest('Este pago no es en efectivo');
    }

    if (pago.userId !== req.user.userId) {
      throw Boom.forbidden('No tienes permiso para ver este código de pago');
    }

    if (pago.estado !== 'Pendiente') {
      throw Boom.badRequest('Este pago ya ha sido procesado');
    }

    res.json({
      success: true,
      data: {
        codigoPago: pago.detallesPago.codigoPago,
        monto: pago.monto,
        estado: pago.estado,
        fechaCreacion: pago.createdAt
      }
    });
  }
}

/**
 * Controlador específico para pagos con tarjeta
 */
class PagosTarjetaController extends PagosController {
  async generarToken(req, res) {
    const { centroId } = req.params;
    const token = await pagosService.generateClientToken(centroId);
    res.json({
      success: true,
      data: { clientToken: token }
    });
  }

  async verificarEstado(req, res) {
    const { transactionId, centroId } = req.params;
    const estado = await pagosService.checkTransactionStatus(transactionId, centroId);
    res.json({
      success: true,
      data: estado
    });
  }

  async reembolsar(req, res) {
    const { transactionId, centroId } = req.params;
    const resultado = await pagosService.refundTransaction(transactionId, centroId);
    res.json({
      success: true,
      data: resultado
    });
  }
}

// Exportar instancias de los controladores
const pagosController = new PagosController();
const pagosEfectivoController = new PagosEfectivoController();
const pagosTarjetaController = new PagosTarjetaController();

module.exports = {
  // Métodos del controlador base
  crearPago: asyncHandler(pagosController.crearPago.bind(pagosController)),
  obtenerPagoPorId: asyncHandler(pagosController.obtenerPagoPorId.bind(pagosController)),
  actualizarPago: asyncHandler(pagosController.actualizarPago.bind(pagosController)),
  eliminarPago: asyncHandler(pagosController.eliminarPago.bind(pagosController)),
  listarPagos: asyncHandler(pagosController.listarPagos.bind(pagosController)),
  listarPagosPorCentro: asyncHandler(pagosController.listarPagosPorCentro.bind(pagosController)),
  listarPagosPorUsuario: asyncHandler(pagosController.listarPagosPorUsuario.bind(pagosController)),

  // Métodos específicos para pagos en efectivo
  validarPagoEfectivo: asyncHandler(pagosEfectivoController.validarPago.bind(pagosEfectivoController)),
  obtenerCodigoPago: asyncHandler(pagosEfectivoController.obtenerCodigo.bind(pagosEfectivoController)),

  // Métodos específicos para pagos con tarjeta
  generarToken: asyncHandler(pagosTarjetaController.generarToken.bind(pagosTarjetaController)),
  verificarEstado: asyncHandler(pagosTarjetaController.verificarEstado.bind(pagosTarjetaController)),
  reembolsar: asyncHandler(pagosTarjetaController.reembolsar.bind(pagosTarjetaController)),

  obtenerPagosPorReserva: asyncHandler(async (req, res) => {
      const pagos = await pagosService.obtenerPagosPorReserva(req.params.reservaId);
      res.json(pagos);
  }),

  async subirComprobante(req, res, next) {
    try {
      const { pagoId } = req.params;
      
      // Verificar que existe el pago
      const pago = await pagosService.obtenerPagoPorId(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es por transferencia
      if (pago.metodoPago !== 'transferencia') {
        throw Boom.badRequest('Solo se pueden subir comprobantes para pagos por transferencia');
      }

      // Verificar que el pago está pendiente
      if (pago.estado !== 'Pendiente') {
        throw Boom.badRequest('Solo se pueden subir comprobantes para pagos pendientes');
      }

      // Usar el controlador de comprobantes para subir la imagen
      const resultado = await ComprobanteTransferenciaController.subirComprobante(req, res, next);

      // Actualizar el pago con la key del comprobante
      const updatedPago = await pagosService.actualizarPago(pagoId, {
        detallesPago: {
          ...pago.detallesPago,
          comprobanteKey: resultado.comprobanteKey
        }
      });

      return res.status(200).json({
        message: 'Comprobante subido exitosamente',
        comprobanteUrl: resultado.presignedUrl,
        pago: updatedPago
      });
    } catch (error) {
      next(error);
    }
  },

  async obtenerComprobante(req, res, next) {
    try {
      const { pagoId } = req.params;
      
      // Verificar que existe el pago
      const pago = await pagosService.obtenerPagoPorId(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es por transferencia y tiene comprobante
      if (pago.metodoPago !== 'transferencia' || !pago.detallesPago.comprobanteKey) {
        throw Boom.notFound('No se encontró comprobante para este pago');
      }

      // Usar el controlador de comprobantes para obtener la URL
      return await ComprobanteTransferenciaController.obtenerComprobante(req, res, next);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Obtener métodos de pago disponibles para un centro deportivo
   */
  getMetodosPagoDisponibles: asyncHandler(async (req, res) => {
    const { centroId } = req.params;
    const metodosDisponibles = await pagosService.getMetodosPagoDisponibles(centroId);
    res.json({ metodosDisponibles });
  }),
};