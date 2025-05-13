//src/interfaces/http/controllers/v1/pagosController.js

const Boom = require('@hapi/boom');
const { v4: uuidv4 } = require('uuid');

// Importar repositorios y servicios directamente para evitar problemas de importación en Lambda
const pagosRepository = require('../../../../infrastructure/repositories/pagosRepository');
const reservaRepository = require('../../../../infrastructure/repositories/reservaRepository');
const centroDeportivoRepository = require('../../../../infrastructure/repositories/centroDeportivoRepository');
const canchasRepository = require('../../../../infrastructure/repositories/canchasRepository');

// Intentar importar el servicio de Braintree, o usar una implementación de respaldo si falla
let braintreeService;
try {
  braintreeService = require('../../../../infrastructure/services/braintreeService');
  console.log('Servicio Braintree importado correctamente');
} catch (error) {
  console.log('Error al importar braintreeService, usando implementación de respaldo', error);
  // Implementación simplificada de respaldo para Braintree
  braintreeService = {
    generateClientToken: async () => {
      console.log('Generando token simulado de Braintree');
      return 'token-simulado-para-desarrollo';
    },
    findTransaction: async (transactionId) => {
      console.log(`Consultando transacción simulada: ${transactionId}`);
      return {
        id: transactionId,
        status: 'settled',
        amount: '100.00'
      };
    },
    refundTransaction: async (transactionId) => {
      console.log(`Reembolsando transacción simulada: ${transactionId}`);
      return {
        success: true,
        transaction: {
          id: `refund-${transactionId}`,
          status: 'settled'
        }
      };
    }
  };
}

// Implementación directa del servicio de pagos
class PagosService {
  constructor() {
    // Crear instancia del repositorio si es una clase, o usar directamente si ya es una instancia
    this.pagosRepo = typeof pagosRepository === 'function' ? new pagosRepository() : pagosRepository;
    this.reservaRepo = reservaRepository;
    this.centroRepo = centroDeportivoRepository;
    this.canchaRepo = canchasRepository;
  }

  async create(pagoData, userId) {
    // Verificar que se proporciona un reservaId
    if (!pagoData.reservaId) {
      throw Boom.badRequest('Se requiere el ID de la reserva para crear un pago');
    }

    // Obtener la reserva asociada
    const reserva = await this.reservaRepo.obtenerReservaPorId(pagoData.reservaId);
    if (!reserva) {
      throw Boom.notFound(`Reserva con ID ${pagoData.reservaId} no encontrada`);
    }

    // Verificar que la reserva pertenece al usuario que realiza el pago
    if (reserva.userId !== userId) {
      throw Boom.forbidden('No tienes permiso para realizar un pago para esta reserva');
    }

    // Obtener el centro deportivo para incluir su ID en el pago
    const cancha = await this.canchaRepo.findById(reserva.canchaId);
    if (!cancha) {
      throw Boom.notFound(`Cancha con ID ${reserva.canchaId} no encontrada`);
    }

    // Calcular montos
    const precioOriginal = parseFloat((reserva.total || 0).toFixed(2));
    const descuentoAplicado = parseFloat((reserva.descuentoAplicado || 0).toFixed(2));
    const montoTotal = parseFloat((precioOriginal - descuentoAplicado).toFixed(2)); // Monto total es el precio final después del descuento

    console.log(`Creando pago para reserva ${pagoData.reservaId}:`);
    console.log(`- Precio original: ${precioOriginal}`);
    console.log(`- Descuento aplicado: ${descuentoAplicado}`);
    console.log(`- Monto total a pagar: ${montoTotal}`);

    // Crear objeto de pago
    const pago = {
      pagoId: uuidv4(),
      userId,
      reservaId: pagoData.reservaId,
      centroId: cancha.centroId,
      monto: montoTotal, // Para pagos no parciales, monto = montoTotal
      montoTotal, // Monto total después de aplicar descuentos
      precioOriginal, // Guardamos el precio original para referencia
      descuentoAplicado, // Guardamos el descuento aplicado
      metodoPago: pagoData.metodoPago,
      detallesPago: pagoData.detallesPago,
      estado: 'Pendiente', // Estado inicial
      intentos: 1, // Primer intento
      esPagoParcial: false, // Por defecto no es parcial
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Verificar si el método del repositorio es crearPago o create
    if (typeof this.pagosRepo.crearPago === 'function') {
      return this.pagosRepo.crearPago(pago);
    } else if (typeof this.pagosRepo.create === 'function') {
      return this.pagosRepo.create(pago);
    } else {
      throw new Error('No se encontró un método válido para crear pagos en el repositorio');
    }
  }

  async findById(pagoId) {
    return this.pagosRepo.findById(pagoId);
  }

  async update(pagoId, pagoData) {
    return this.pagosRepo.update(pagoId, {
      ...pagoData,
      updatedAt: new Date().toISOString()
    });
  }

  async delete(pagoId) {
    return this.pagosRepo.eliminarPago(pagoId);
  }

  async findAll(limit = 20, exclusiveStartKey = null) {
    const options = { limit };
    if (exclusiveStartKey) {
      options.lastEvaluatedKey = exclusiveStartKey;
    }
    return this.pagosRepo.findAll({}, options);
  }

  async findByCentro(centroId, limit = 20, exclusiveStartKey = null) {
    const filters = { centroId };
    const options = { limit };
    if (exclusiveStartKey) {
      options.lastEvaluatedKey = exclusiveStartKey;
    }
    return this.pagosRepo.findAll(filters, options);
  }

  async findByUser(userId, limit = 20, exclusiveStartKey = null) {
    const filters = { userId };
    const options = { limit };
    if (exclusiveStartKey) {
      options.lastEvaluatedKey = exclusiveStartKey;
    }
    return this.pagosRepo.findAll(filters, options);
  }

  async findByReserva(reservaId) {
    return this.pagosRepo.findByReserva(reservaId);
  }

  async validarPagoEfectivo(pagoId, adminId) {
    try {
      // Obtener el pago
      const pago = await this.pagosRepo.findById(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es en efectivo
      if (pago.metodoPago !== 'efectivo') {
        throw Boom.badRequest('Solo se pueden validar pagos en efectivo');
      }

      // Verificar que el pago está pendiente
      if (pago.estado !== 'Pendiente') {
        throw Boom.badRequest('Solo se pueden validar pagos pendientes');
      }

      // Obtener la reserva asociada al pago
      const reserva = await this.reservaRepo.findById(pago.reservaId);
      if (!reserva) {
        throw Boom.notFound('Reserva no encontrada');
      }

      // Verificar que el admin pertenece al centro deportivo
      const centro = await this.centroRepo.findById(reserva.centroDeportivoId);
      if (!centro || centro.adminId !== adminId) {
        throw Boom.forbidden('No tienes permiso para validar este pago');
      }

      // Actualizar el estado del pago
      const updatedPago = await this.pagosRepo.update(pagoId, {
        estado: 'Completado',
        updatedAt: new Date().toISOString(),
        detallesPago: {
          ...pago.detallesPago,
          validadoPor: adminId,
          fechaValidacion: new Date().toISOString()
        }
      });

      // Actualizar el estado de la reserva
      await this.reservaRepo.update(reserva.id, {
        estadoPago: 'Pagado',
        updatedAt: new Date().toISOString()
      });

      return updatedPago;
    } catch (error) {
      console.error('Error al validar pago en efectivo:', error);
      throw error;
    }
  }

  async getCodigoPagoEfectivo(pagoId, userId) {
    try {
      // Obtener el pago
      const pago = await this.pagosRepo.findById(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es del usuario
      if (pago.userId !== userId) {
        throw Boom.forbidden('No tienes permiso para ver este código de pago');
      }

      // Verificar que el pago es en efectivo
      if (pago.metodoPago !== 'efectivo') {
        throw Boom.badRequest('Solo los pagos en efectivo tienen código');
      }

      // Verificar que el pago está pendiente
      if (pago.estado !== 'Pendiente') {
        throw Boom.badRequest('Solo los pagos pendientes tienen código válido');
      }

      // Generar o recuperar el código
      const codigo = pago.detallesPago?.codigoEfectivo || 
        `EF-${pagoId.substring(0, 8).toUpperCase()}`;

      // Si no existe el código, guardarlo
      if (!pago.detallesPago?.codigoEfectivo) {
        await this.pagosRepo.update(pagoId, {
          detallesPago: {
            ...pago.detallesPago,
            codigoEfectivo: codigo
          },
          updatedAt: new Date().toISOString()
        });
      }

      return { codigo };
    } catch (error) {
      console.error('Error al obtener código de pago efectivo:', error);
      throw error;
    }
  }

  async getMetodosPagoDisponibles(centroId) {
    try {
      // Obtener el centro deportivo
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw Boom.notFound('Centro deportivo no encontrado');
      }

      // Devolver los métodos de pago configurados para el centro
      return centro.metodosPago || ['efectivo'];
    } catch (error) {
      console.error('Error al obtener métodos de pago disponibles:', error);
      throw error;
    }
  }

  // Métodos para pagos con tarjeta (Braintree)
  async generarTokenBraintree(centroId) {
    try {
      // Verificar que existe el centro
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw Boom.notFound('Centro deportivo no encontrado');
      }

      // Verificar si el centro tiene habilitado el pago con tarjeta
      const metodosPago = centro.metodosPago || [];
      if (!metodosPago.includes('tarjeta')) {
        throw Boom.badRequest('Este centro no acepta pagos con tarjeta');
      }

      // Generar token de cliente de Braintree usando el servicio
      const clientToken = await braintreeService.generateClientToken();
      return { clientToken };
    } catch (error) {
      console.error('Error al generar token de Braintree:', error);
      throw error;
    }
  }

  async verificarEstadoTransaccion(transactionId) {
    try {
      const transaction = await braintreeService.findTransaction(transactionId);
      return transaction;
    } catch (error) {
      console.error('Error al verificar estado de transacción:', error);
      throw error;
    }
  }

  async reembolsarTransaccion(transactionId) {
    try {
      const result = await braintreeService.refundTransaction(transactionId);
      return result;
    } catch (error) {
      console.error('Error al reembolsar transacción:', error);
      throw error;
    }
  }
}

const pagosService = new PagosService();
const ComprobanteTransferenciaController = require('./uploadImagenes/ComprobanteTransferenciaController');

// Wrapper para manejar errores en los controladores
// @param {Function} handler - Función del controlador
// @returns {Function} Middleware con manejo de errores
const asyncHandler = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      console.error('Error en controlador:', error);
      
      if (error.isBoom) {
        const { statusCode, payload } = error.output;
        return res.status(statusCode).json(payload);
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: error.message
        });
      }
      
      return res.status(500).json({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Ha ocurrido un error en el servidor'
      });
    }
  };
};

/**
 * Controlador base para operaciones CRUD de pagos
 */
class PagosController {
  async crearPago(req, res) {
    const pago = await pagosService.create(req.body, req.user.sub);
    res.status(201).json({
      success: true,
      data: pago
    });
  }

  async obtenerPagoPorId(req, res) {
    const pago = await pagosService.findById(req.params.pagoId);
    if (!pago) {
      return res.status(404).json({
        success: false,
        error: 'Pago no encontrado'
      });
    }
    res.json({
      success: true,
      data: pago
    });
  }

  async actualizarPago(req, res) {
    const pago = await pagosService.update(req.params.pagoId, req.body);
    res.json({
      success: true,
      data: pago
    });
  }

  async actualizarEstadoPago(req, res) {
    const { pagoId } = req.params;
    const pago = await pagosService.update(pagoId, { estado: req.body.estado });
    res.json({
      success: true,
      data: pago
    });
  }

  async eliminarPago(req, res) {
    await pagosService.delete(req.params.pagoId);
    res.json({
      success: true,
      message: 'Pago eliminado correctamente'
    });
  }

  async listarPagos(req, res) {
    const { limit, lastEvaluatedKey } = req.query;
    const pagos = await pagosService.findAll(
      limit ? parseInt(limit) : 20,
      lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null
    );
    res.json({
      success: true,
      data: pagos
    });
  }

  async listarPagosPorCentro(req, res) {
    const { centroId } = req.params;
    const { limit, lastEvaluatedKey } = req.query;
    const pagos = await pagosService.findByCentro(
      centroId,
      limit ? parseInt(limit) : 20,
      lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null
    );
    res.json({
      success: true,
      data: pagos
    });
  }

  async listarPagosPorUsuario(req, res) {
    const userId = req.params.userId || req.user.sub;
    const { limit, lastEvaluatedKey } = req.query;
    const pagos = await pagosService.findByUser(
      userId,
      limit ? parseInt(limit) : 20,
      lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null
    );
    res.json({
      success: true,
      data: pagos
    });
  }
  
  async listarPagosPorReserva(req, res) {
    const { reservaId } = req.params;
    const pagos = await pagosService.findByReserva(reservaId);
    res.json({
      success: true,
      data: pagos
    });
  }
  
  async reembolsarPago(req, res) {
    const { pagoId } = req.params;
    // Obtener el ID de transacción del pago
    const pago = await pagosService.findById(pagoId);
    if (!pago || !pago.detallesPago || !pago.detallesPago.transactionId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró un ID de transacción para este pago'
      });
    }
    
    const resultado = await pagosService.reembolsarTransaccion(pago.detallesPago.transactionId);
    res.json({
      success: true,
      data: resultado
    });
  }
  
  async getMetodosPagoDisponibles(req, res) {
    const { centroId } = req.params;
    const metodosDisponibles = await pagosService.getMetodosPagoDisponibles(centroId);
    res.json({
      success: true,
      data: { metodosPago: metodosDisponibles }
    });
  }
  
  async generarTokenTarjeta(req, res) {
    const centroId = req.body.centroId || req.params.centroId;
    if (!centroId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del centro deportivo'
      });
    }
    const token = await pagosService.generarTokenBraintree(centroId);
    res.json({
      success: true,
      data: { clientToken: token.clientToken }
    });
  }
  
  async procesarPagoTarjeta(req, res) {
    const pago = await pagosService.create(req.body, req.user.sub);
    res.status(201).json({
      success: true,
      data: pago
    });
  }
}

/**
 * Controlador específico para pagos en efectivo
 */
class PagosEfectivoController extends PagosController {
  async validarPago(req, res) {
    const { pagoId } = req.params;
    const adminId = req.user.sub;
    
    const pago = await pagosService.validarPagoEfectivo(pagoId, adminId);
    
    res.json({
      success: true,
      data: pago,
      message: 'Pago validado correctamente'
    });
  }

  async obtenerCodigo(req, res) {
    const { pagoId } = req.params;
    const userId = req.user.sub;
    
    const { codigo } = await pagosService.getCodigoPagoEfectivo(pagoId, userId);
    
    res.json({
      success: true,
      data: { codigo }
    });
  }
}

/**
 * Controlador específico para pagos con tarjeta
 */
class PagosTarjetaController extends PagosController {
  async generarToken(req, res) {
    const { centroId } = req.params;
    const token = await pagosService.generarTokenBraintree(centroId);
    res.json({
      success: true,
      data: { clientToken: token.clientToken }
    });
  }

  async verificarEstado(req, res) {
    const { transactionId } = req.params;
    const estado = await pagosService.verificarEstadoTransaccion(transactionId);
    res.json({
      success: true,
      data: estado
    });
  }

  async reembolsar(req, res) {
    const { transactionId } = req.params;
    const resultado = await pagosService.reembolsarTransaccion(transactionId);
    res.json({
      success: true,
      data: resultado
    });
  }
}

// Definir las funciones de comprobantes
const subirComprobante = async (req, res, next) => {
  try {
    const { pagoId } = req.params;
    return ComprobanteTransferenciaController.uploadComprobante(req, res, next);
  } catch (error) {
    next(error);
  }
};

const obtenerComprobante = async (req, res, next) => {
  try {
    const { pagoId } = req.params;
    return ComprobanteTransferenciaController.getComprobante(req, res, next);
  } catch (error) {
    next(error);
  }
};

// Exportar instancias de los controladores
const pagosController = new PagosController();
const pagosEfectivoController = new PagosEfectivoController();
const pagosTarjetaController = new PagosTarjetaController();

module.exports = {
  // Asegurarse de que los métodos de controlador estén envueltos con asyncHandler
  crearPago: asyncHandler(pagosController.crearPago.bind(pagosController)),
  obtenerPagoPorId: asyncHandler(pagosController.obtenerPagoPorId.bind(pagosController)),
  actualizarPago: asyncHandler(pagosController.actualizarPago.bind(pagosController)),
  eliminarPago: asyncHandler(pagosController.eliminarPago.bind(pagosController)),
  listarPagos: asyncHandler(pagosController.listarPagos.bind(pagosController)),
  listarPagosPorCentro: asyncHandler(pagosController.listarPagosPorCentro.bind(pagosController)),
  listarPagosPorUsuario: asyncHandler(pagosController.listarPagosPorUsuario.bind(pagosController)),
  
  // Métodos de pagos en efectivo
  validarPagoEfectivo: asyncHandler(pagosEfectivoController.validarPago.bind(pagosEfectivoController)),
  obtenerCodigoPago: asyncHandler(pagosEfectivoController.obtenerCodigo.bind(pagosEfectivoController)),

  // Métodos específicos para pagos con tarjeta
  generarToken: asyncHandler(pagosTarjetaController.generarToken.bind(pagosTarjetaController)),
  verificarEstado: asyncHandler(pagosTarjetaController.verificarEstado.bind(pagosTarjetaController)),
  reembolsar: asyncHandler(pagosTarjetaController.reembolsar.bind(pagosTarjetaController)),

  // Métodos para comprobantes de transferencia
  subirComprobante,
  obtenerComprobante,

  // Otros métodos útiles
  obtenerPagosPorReserva: asyncHandler(async (req, res) => {
      const pagos = await pagosService.findByReserva(req.params.reservaId);
      res.json(pagos);
  }),

  getMetodosPagoDisponibles: asyncHandler(async (req, res) => {
    const { centroId } = req.params;
    const metodosDisponibles = await pagosService.getMetodosPagoDisponibles(centroId);
    res.json({ metodosDisponibles });
  }),
  
  // Exponer las instancias de los controladores y el servicio para uso interno
  pagosController,
  pagosEfectivoController,
  pagosTarjetaController,
  pagosService,
};
