// src/infrastructure/services/pagosService.js
const PagosRepository = require('../repositories/pagosRepository');
const ReservaRepository = require('../repositories/reservaRepository');
const Pago = require('../../domain/entities/pagos');
const braintreeService = require('./braintreeService');
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const { DynamoDB } = require('aws-sdk');
const dynamoDB = new DynamoDB.DocumentClient();

class PagosService {
  constructor() {
    this.repo = new PagosRepository();
    // CentroDeportivoRepository ya exporta una instancia, no necesitamos usar 'new'
    this.centroRepo = CentroDeportivoRepository;
  }

  async crearPago(data) {
    try {
      // Validar que el método de pago esté disponible
      const metodoValido = await this.validarMetodoPago(data.centroId, data.metodoPago);
      if (!metodoValido) {
        throw new Error(`El método de pago ${data.metodoPago} no está disponible para este centro deportivo`);
      }

      // Obtener la reserva
      const reserva = await ReservaRepository.obtenerReservaPorId(data.reservaId);
      if (!reserva) {
        throw new Error('No existe la reserva asociada al pago');
      }

      // Obtener pagos existentes
      const pagosExistentes = await this.repo.obtenerPagosPorReserva(data.reservaId);
      
      // Preparar datos del pago
      if (pagosExistentes.length > 0) {
        // Para pagos adicionales, usar el monto total del primer pago
        const montoTotalReferencia = pagosExistentes[0].montoTotal;
        data.montoTotal = montoTotalReferencia;
        data.esPagoParcial = true;
      } else {
        // Para el primer pago, usar el monto de la reserva
        data.montoTotal = reserva.monto;
        data.esPagoParcial = data.monto < reserva.monto;
      }

      // Procesar pago con tarjeta si aplica
      if (data.metodoPago === 'tarjeta') {
        await this._procesarPagoTarjeta(data);
      }

      // Crear el pago (la entidad Pago validará las reglas de negocio)
      const pago = await this.repo.crearPago(data);

      // Verificar si el pago completa el total
      if (pago.estaCompleto()) {
        await ReservaRepository.actualizarReserva(data.reservaId, {
          estado: 'Pagada'
        });
      }

      return pago;
    } catch (error) {
      throw error;
    }
  }

  async obtenerPagoPorId(pagoId) {
    return await this.repo.obtenerPagoPorId(pagoId);
  }

  async obtenerPagosPorReserva(reservaId) {
    return await this.repo.obtenerPagosPorReserva(reservaId);
  }

  async actualizarPago(pagoId, updates) {
    // Obtener el pago actual
    const pagoActual = await this.repo.obtenerPagoPorId(pagoId);
    if (!pagoActual) {
      throw new Error('El pago que intenta actualizar no existe.');
    }

    // Si el pago está bloqueado, no permitir actualizaciones
    if (pagoActual.estado === 'Bloqueado') {
      throw new Error('No se puede actualizar un pago bloqueado.');
    }

    try {
      return await this.repo.actualizarPago(pagoId, updates);
    } catch (err) {
      if (err.message && err.message.includes('No está permitido modificar el campo')) {
        throw new Error('Actualización inválida: ' + err.message);
      }
      throw err;
    }
  }

  async eliminarPago(pagoId) {
    return await this.repo.eliminarPago(pagoId);
  }

  /**
   * Lista pagos con paginación y filtros
   * @param {Object} filters - Filtros: userId, centroId, estado, metodoPago
   * @param {Object} options - Opciones de paginación: limit, lastEvaluatedKey
   * @returns {Promise<Object>} - { items, lastEvaluatedKey, count }
   */
  async findAll(filters = {}, options = {}) {
    return await this.repo.findAll(filters, options);
  }

  /**
   * Lista pagos por centro deportivo con paginación
   * @param {string} centroId - ID del centro deportivo
   * @param {Object} options - Opciones de paginación: limit, lastEvaluatedKey
   * @returns {Promise<Object>} - { items, lastEvaluatedKey, count }
   */
  async findAllByCentro(centroId, options = {}) {
    return await this.repo.findAllByCentro(centroId, options);
  }

  /**
   * Lista pagos por usuario con paginación
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de paginación: limit, lastEvaluatedKey
   * @returns {Promise<Object>} - { items, lastEvaluatedKey, count }
   */
  async findAllByUser(userId, options = {}) {
    return await this.repo.findAllByUser(userId, options);
  }

  // Nuevo método para generar token de cliente Braintree
  async generateClientToken(centroId) {
    return await braintreeService.generateClientToken(centroId);
  }

  // Nuevo método para verificar estado de transacción
  async checkTransactionStatus(transactionId, centroId) {
    return await braintreeService.checkTransactionStatus(transactionId, centroId);
  }

  /**
   * Procesar reembolso de una transacción
   * @param {string} transactionId - ID de la transacción de Braintree
   * @param {string} centroId - ID del centro deportivo
   * @returns {Promise<Object>} Resultado del reembolso
   */
  async refundTransaction(transactionId, centroId) {
    // Verificar que la transacción existe y pertenece al centro
    const pago = await this.repo.findByTransactionId(transactionId);
    if (!pago) {
      throw new Error('No se encontró la transacción');
    }

    if (pago.centroId !== centroId) {
      throw new Error('La transacción no pertenece al centro especificado');
    }

    if (pago.estado !== 'Completado') {
      throw new Error('Solo se pueden reembolsar pagos completados');
    }

    if (pago.metodoPago !== 'tarjeta') {
      throw new Error('Solo se pueden reembolsar pagos con tarjeta');
    }

    // Verificar si ya fue reembolsado
    if (pago.detallesPago.refunded) {
      throw new Error('Esta transacción ya fue reembolsada');
    }

    try {
      // Procesar reembolso a través de Braintree
      const refund = await braintreeService.refundTransaction(transactionId, centroId);

      // Actualizar el pago con la información del reembolso
      const pagoActualizado = await this.repo.actualizarPago(pago.pagoId, {
        estado: 'Reembolsado',
        detallesPago: {
          ...pago.detallesPago,
          refunded: true,
          refundId: refund.id,
          refundedAt: new Date().toISOString(),
          refundAmount: refund.amount,
          refundStatus: refund.status,
          refundReason: refund.reason
        }
      });

      // Si el pago estaba asociado a una reserva, actualizar su estado
      if (pago.reservaId) {
        const reserva = await ReservaRepository.obtenerReservaPorId(pago.reservaId);
        if (reserva) {
          await ReservaRepository.actualizarReserva(pago.reservaId, {
            estado: 'Cancelada',
            motivoCancelacion: 'Pago reembolsado'
          });
        }
      }

      return {
        ...refund,
        pago: pagoActualizado
      };
    } catch (error) {
      throw new Error(`Error procesando el reembolso: ${error.message}`);
    }
  }

  /**
   * Clasifica los errores de Braintree para un mejor manejo
   * @private
   * @param {Error} error - Error de Braintree
   * @returns {Object} Información clasificada del error
   */
  _clasificarErrorBraintree(error) {
    // Errores que NO cuentan como intento fallido
    const noAttemptErrors = {
      'invalid_payment_method_nonce': {
        type: 'VALIDATION_ERROR',
        code: 'INVALID_TOKEN',
        message: 'El token de pago es inválido o ha expirado',
        shouldIncrementAttempts: false
      },
      'invalid_merchant_account': {
        type: 'CONFIGURATION_ERROR',
        code: 'INVALID_MERCHANT',
        message: 'Error de configuración del comercio',
        shouldIncrementAttempts: false
      },
      'invalid_amount': {
        type: 'VALIDATION_ERROR',
        code: 'INVALID_AMOUNT',
        message: 'El monto del pago es inválido',
        shouldIncrementAttempts: false
      }
    };

    // Errores que SÍ cuentan como intento fallido
    const attemptErrors = {
      'processor_declined': {
        type: 'PROCESSOR_ERROR',
        code: 'CARD_DECLINED',
        message: 'La tarjeta fue rechazada por el procesador',
        shouldIncrementAttempts: true
      },
      'gateway_rejected': {
        type: 'GATEWAY_ERROR',
        code: 'GATEWAY_REJECTED',
        message: 'La transacción fue rechazada por el gateway',
        shouldIncrementAttempts: true
      },
      'insufficient_funds': {
        type: 'PROCESSOR_ERROR',
        code: 'INSUFFICIENT_FUNDS',
        message: 'Fondos insuficientes en la tarjeta',
        shouldIncrementAttempts: true
      },
      'expired_card': {
        type: 'VALIDATION_ERROR',
        code: 'EXPIRED_CARD',
        message: 'La tarjeta ha expirado',
        shouldIncrementAttempts: true
      }
    };

    // Buscar el error en las categorías
    const errorCode = error.code || error.type || '';
    const errorInfo = noAttemptErrors[errorCode] || attemptErrors[errorCode] || {
      type: 'UNKNOWN_ERROR',
      code: 'UNKNOWN',
      message: 'Error desconocido al procesar el pago',
      shouldIncrementAttempts: true // Por defecto, incrementar intentos para errores desconocidos
    };

    return errorInfo;
  }

  /**
   * Procesar pago con tarjeta a través de Braintree
   * @private
   */
  async _procesarPagoTarjeta(data) {
    if (!data.detallesPago?.paymentMethodNonce) {
      throw new Error('Se requiere paymentMethodNonce para pagos con tarjeta');
    }

    if (!data.centroId) {
      throw new Error('Se requiere centroId para procesar el pago');
    }

    try {
      const transaction = await braintreeService.processPayment({
        amount: data.monto,
        paymentMethodNonce: data.detallesPago.paymentMethodNonce,
        centroId: data.centroId,
        userId: data.userId
      });

      data.detallesPago = {
        braintreeTransactionId: transaction.transactionId,
        status: transaction.status,
        currency: transaction.currency,
        processedAt: transaction.createdAt
      };
    } catch (error) {
      const errorType = this._clasificarErrorBraintree(error);
      
      if (errorType.shouldIncrementAttempts) {
        const pagoExistente = await this.repo.obtenerPagoPorReserva(data.reservaId);
        if (pagoExistente) {
          const pago = new Pago(pagoExistente);
          pago.incrementarIntento();
          await this.repo.actualizarPago(pago.pagoId, {
            intentos: pago.intentos,
            estado: pago.estado,
            detallesPago: {
              ...pago.detallesPago,
              ultimoError: {
                tipo: errorType.type,
                mensaje: error.message,
                codigo: errorType.code,
                fecha: new Date().toISOString()
              }
            }
          });

          if (pago.estaBloqueado()) {
            throw new Error(`Pago bloqueado por exceso de intentos. Intente más tarde o use otro método de pago.`);
          }
        }
      }

      throw new Error(`Error procesando el pago: ${errorType.message}`);
    }
  }

  /**
   * Obtener métodos de pago disponibles para un centro deportivo
   * @param {string} centroId - ID del centro deportivo
   * @returns {Promise<Array>} Lista de métodos de pago disponibles
   */
  async getMetodosPagoDisponibles(centroId) {
    try {
      const params = {
        TableName: process.env.CENTROS_TABLE,
        Key: { id: centroId },
        ProjectionExpression: 'aceptaTarjeta, aceptaTransferencia'
      };

      const result = await dynamoDB.get(params).promise();
      const centro = result.Item;

      if (!centro) {
        throw new Error('Centro deportivo no encontrado');
      }

      const metodosDisponibles = ['efectivo']; // Efectivo siempre está disponible

      if (centro.aceptaTarjeta) {
        metodosDisponibles.push('tarjeta');
      }

      if (centro.aceptaTransferencia) {
        metodosDisponibles.push('transferencia');
      }

      return metodosDisponibles;
    } catch (error) {
      console.error('Error al obtener métodos de pago disponibles:', error);
      throw error;
    }
  }

  /**
   * Validar si un método de pago está disponible para un centro
   * @param {string} centroId - ID del centro deportivo
   * @param {string} metodoPago - Método de pago a validar
   * @returns {Promise<boolean>} true si el método está disponible
   */
  async validarMetodoPago(centroId, metodoPago) {
    const metodosDisponibles = await this.getMetodosPagoDisponibles(centroId);
    return metodosDisponibles.includes(metodoPago);
  }
}

module.exports = new PagosService();
