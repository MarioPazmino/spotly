//src/infrastructure/services/braintreeService.js
const braintree = require('braintree');
const Boom = require('@hapi/boom');
const logger = require('../../interfaces/http/utils/logger');
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');

/**
 * Servicio para gestionar las operaciones de pago con Braintree
 * Maneja la integración con la pasarela de pagos y la gestión de cuentas de comerciantes
 */
class BraintreeService {
  constructor() {
    // Usar la instancia del repositorio (patrón Singleton)
    this.centroRepo = CentroDeportivoRepository;
    
    // Porcentaje de comisión de la plataforma (configurable por variable de entorno)
    this.PORCENTAJE_COMISION = Number(process.env.SPOTLY_COMISION_PORCENTAJE || 0.05); // 5% por defecto

    // Inicializar el gateway de Braintree
    this._initializeBraintreeGateway();
  }
  
  /**
   * Inicializa el gateway de Braintree con las credenciales de la plataforma
   * Si no hay credenciales disponibles, activa el modo de simulación
   * @private
   */
  _initializeBraintreeGateway() {
    try {
      if (process.env.SPOTLY_BRAINTREE_MERCHANT_ID && 
          process.env.SPOTLY_BRAINTREE_PUBLIC_KEY && 
          process.env.SPOTLY_BRAINTREE_PRIVATE_KEY) {
        
        // Gateway de la plataforma (Spotly) para cobrar comisiones
        this.platformGateway = new braintree.BraintreeGateway({
          environment: process.env.NODE_ENV === 'production' 
            ? braintree.Environment.Production 
            : braintree.Environment.Sandbox,
          merchantId: process.env.SPOTLY_BRAINTREE_MERCHANT_ID,
          publicKey: process.env.SPOTLY_BRAINTREE_PUBLIC_KEY,
          privateKey: process.env.SPOTLY_BRAINTREE_PRIVATE_KEY
        });
        
        logger.info('Gateway de Braintree inicializado correctamente');
      } else {
        logger.info('Credenciales de Braintree no disponibles, usando modo simulado');
        this.simulationMode = true;
      }
    } catch (error) {
      logger.error('Error al inicializar gateway de Braintree:', error);
      this.simulationMode = true;
    }
  }

  /**
   * Valida que un centro deportivo tenga una cuenta Braintree activa
   * @param {Object} centro - Centro deportivo a validar
   * @throws {Boom.badRequest} Si el centro no tiene una cuenta Braintree activa
   * @private
   */
  _validarCuentaBraintree(centro) {
    if (!centro.braintreeMerchantId) {
      throw Boom.badRequest('El centro deportivo no tiene configurada una cuenta de Braintree');
    }
    
    if (centro.braintreeStatus !== 'activa') {
      throw Boom.badRequest(`La cuenta de Braintree del centro deportivo está ${centro.braintreeStatus || 'pendiente'}`);
    }
    
    return true;
  }

  /**
   * Crea un gateway de Braintree para un centro deportivo específico
   * @param {Object} centro - Centro deportivo con braintreeMerchantId
   * @returns {Object} Gateway de Braintree configurado
   * @throws {Boom.badRequest} Si el centro no tiene ID de Braintree
   * @private
   */
  _createGateway(centro) {
    if (!centro.braintreeMerchantId) {
      throw Boom.badRequest('El centro deportivo no tiene configurado su ID de Braintree');
    }

    return new braintree.BraintreeGateway({
      environment: process.env.NODE_ENV === 'production' 
        ? braintree.Environment.Production 
        : braintree.Environment.Sandbox,
      merchantId: centro.braintreeMerchantId
    });
  }

  /**
   * Calcula el monto que recibirá el centro deportivo después de aplicar la comisión
   * @param {Number} monto - Monto total pagado por el cliente
   * @returns {Number} Monto neto para el centro deportivo
   * @private
   */
  _calcularMontoCentro(monto) {
    const comision = Number((monto * this.PORCENTAJE_COMISION).toFixed(2));
    return Number((Number(monto) - comision).toFixed(2));
  }

  /**
   * Genera un token de cliente de Braintree para el frontend
   * @param {String} centroId - ID del centro deportivo
   * @returns {String} Token de cliente para el frontend
   */
  async generateClientToken(centroId) {
    try {
      // Si estamos en modo simulado, devolver un token simulado
      if (this.simulationMode) {
        logger.info('Generando token simulado de Braintree (modo simulado)');
        return this._getSimulatedClientToken();
      }
      
      // Buscar el centro deportivo
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
      }
      
      // No es necesario validar el estado de la cuenta para generar un token
      // Solo verificamos que exista el centro deportivo
      
      // Generar token real usando el gateway de la plataforma
      const result = await this.platformGateway.clientToken.generate();
      return result.clientToken;
    } catch (error) {
      logger.error('Error al generar token de cliente:', error);
      
      // Si el error es de tipo Boom, propagarlo
      if (error.isBoom) {
        throw error;
      }
      
      // En caso de otros errores, devolver un token simulado
      logger.info('Fallback a token simulado de Braintree');
      return this._getSimulatedClientToken();
    }
  }
  
  /**
   * Genera un token de cliente simulado para pruebas
   * @returns {String} Token simulado
   * @private
   */
  _getSimulatedClientToken() {
    return 'eyJ2ZXJzaW9uIjoyLCJhdXRob3JpemF0aW9uRmluZ2VycHJpbnQiOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpGVXpJMU5pSXNJbXRwWkNJNklqSXdNVGd3TkRJMk1UWXRjMkZ1WkdKdmVDSXNJbWx6Y3lJNklrRjFkR2g1SW4wLmV5SmxlSEFpT2pFMk9ERTJOVGsyTnpZc0ltcDBhU0k2SWpka1ltUTBaV1l3TFRka09UY3RORFZrTUMwNVlUSmhMVEJpWXpWallXWTROVEUwWWlJc0luTjFZaUk2SW5CeWIyUjFZM1JwYjI0dGRHVnpkQzFqYjIxdFpYSmphV0ZzSWl3aWNISnZaSFZqZEdsdmJpSTZleUpwWkNJNkluQnliMlIxWTNScGIyNHRkR1Z6ZEMxamIyMXRaWEpqYVdGc0lpd2ljSEp2WkhWamRHbHZibDl3YkdGdUlqcG1ZV3h6WlN3aWJXVnlZMmhoYm5SZmFXUWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0lzSW0xbGNtTm9ZVzUwWDI1aGJXVWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0o5TENKemRXSnpZM0pwY0hScGIyNGlPbnNpY0hKdlpIVmpkR2x2YmlJNmV5SnBaQ0k2SW5CeWIyUjFZM1JwYjI0dGRHVnpkQzFqYjIxdFpYSmphV0ZzSWl3aWNISnZaSFZqZEdsdmJsOXdiR0Z1SWpwbVlXeHpaU3dpYldWeVkyaGhiblJmYVdRaU9pSndjbTlrZFdOMGFXOXVMWFJsYzNRdFkyOXRiV1Z5WTJsaGJDSXNJbTFsY21Ob1lXNTBYMjVoYldVaU9pSndjbTlrZFdOMGFXOXVMWFJsYzNRdFkyOXRiV1Z5WTJsaGJDSjlmU3dpWVhWMGFHVnVkR2xqWVhScGIyNGlPbnNpWTJ4cFpXNTBYMnRsZVNJNkltVjVTalphV0VwNlpGaEtjMkZYTlc1aFdHUjJZa2N4YkdKdVVXbFBhVXBDVlRCVlBTSXNJbkJ5YjJSMVkzUnBiMjRpT25zaWFXUWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0lzSW5CeWIyUjFZM1JwYjI1ZmNHeGhiaUk2Wm1Gc2MyVXNJbTFsY21Ob1lXNTBYMmxrSWpvaWNISnZaSFZqZEdsdmJpMTBaWE4wTFdOdmJXMWxjbU5wWVd3aUxDSnRaWEpqYUdGdWRGOXVZVzFsSWpvaWNISnZaSFZqZEdsdmJpMTBaWE4wTFdOdmJXMWxjbU5wWVd3aWZYMHNJbWx6YzNWbFpGOWhkQ0k2TVRZNExURTJOVGsyTnpZc0ltVjRjQ0k2TVRZNE1UWTFPVFKZXC9Oc1pWTUNYUEFGQUVGR1UtUlJRLUFmVVJYZWJJd3ZfUUVMUWpqWTZBJw==';
  }

  /**
   * Procesa un pago con tarjeta
   * @param {Object} params - Parámetros del pago
   * @param {Number} params.amount - Monto a pagar
   * @param {String} params.paymentMethodNonce - Nonce del método de pago
   * @param {String} params.centroId - ID del centro deportivo
   * @param {String} params.userId - ID del usuario que realiza el pago
   * @returns {Object} Resultado de la transacción
   * @throws {Boom.badRequest} Si hay problemas con el pago
   */
  async processPayment({ amount, paymentMethodNonce, centroId, userId }) {
    try {
      // Si estamos en modo simulado, simular el pago
      if (this.simulationMode) {
        logger.info('Simulando pago con tarjeta (modo simulado)');
        return this._getSimulatedPaymentResult(amount);
      }

      // Obtener información del centro deportivo
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
      }

      // Validar que el centro tenga una cuenta Braintree activa
      this._validarCuentaBraintree(centro);

      // Calcular monto para el centro deportivo
      const montoCentro = this._calcularMontoCentro(amount);

      // Procesar el pago completo en la cuenta de la plataforma
      const result = await this._procesarPagoPlataforma(amount, paymentMethodNonce, userId);

      // Transferir el monto al centro deportivo
      const transferResult = await this._transferirMontoCentro(montoCentro, paymentMethodNonce, centro.braintreeMerchantId, result.transaction.id);

      // Devolver resultado completo de la transacción
      return {
        transactionId: result.transaction.id,
        transferId: transferResult.transaction.id,
        status: result.transaction.status,
        amount: amount, // Monto total pagado por el cliente
        montoCentro: montoCentro, // Monto que recibe el centro deportivo
        currency: result.transaction.currencyIsoCode,
        createdAt: result.transaction.createdAt
      };
    } catch (error) {
      logger.error('Error procesando el pago:', error);
      
      // Si el error es de tipo Boom, propagarlo
      if (error.isBoom) {
        throw error;
      }
      
      // En caso de otros errores, crear un error Boom
      throw Boom.badRequest(`Error procesando el pago: ${error.message}`);
    }
  }
  
  /**
   * Procesa el pago en la cuenta de la plataforma
   * @param {Number} amount - Monto a pagar
   * @param {String} paymentMethodNonce - Nonce del método de pago
   * @param {String} userId - ID del usuario que realiza el pago
   * @returns {Object} Resultado de la transacción
   * @throws {Boom.badRequest} Si hay problemas con el pago
   * @private
   */
  async _procesarPagoPlataforma(amount, paymentMethodNonce, userId) {
    try {
      const result = await this.platformGateway.transaction.sale({
        amount: amount.toString(),
        paymentMethodNonce: paymentMethodNonce,
        options: {
          submitForSettlement: true
        },
        customer: {
          id: userId
        }
      });

      if (!result.success) {
        throw new Error(`Error en la transacción: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      throw Boom.badRequest(`Error procesando el pago: ${error.message}`);
    }
  }
  
  /**
   * Transfiere el monto al centro deportivo
   * @param {Number} montoCentro - Monto a transferir al centro
   * @param {String} paymentMethodNonce - Nonce del método de pago
   * @param {String} merchantId - ID de la cuenta Braintree del centro
   * @param {String} originalTransactionId - ID de la transacción original
   * @returns {Object} Resultado de la transferencia
   * @throws {Boom.badRequest} Si hay problemas con la transferencia
   * @private
   */
  async _transferirMontoCentro(montoCentro, paymentMethodNonce, merchantId, originalTransactionId) {
    try {
      const transferResult = await this.platformGateway.transaction.sale({
        amount: montoCentro.toString(),
        paymentMethodNonce: paymentMethodNonce,
        options: {
          submitForSettlement: true,
          merchantAccountId: merchantId
        }
      });

      if (!transferResult.success) {
        // Si falla la transferencia, intentar hacer reembolso de la transacción principal
        await this.platformGateway.transaction.refund(originalTransactionId);
        throw new Error(`Error en la transferencia al centro deportivo: ${transferResult.message}`);
      }
      
      return transferResult;
    } catch (error) {
      throw Boom.badRequest(`Error en la transferencia: ${error.message}`);
    }
  }
  
  /**
   * Genera un resultado de pago simulado para pruebas
   * @param {Number} amount - Monto del pago
   * @returns {Object} Resultado simulado
   * @private
   */
  _getSimulatedPaymentResult(amount) {
    return {
      transactionId: `sim_${Date.now()}`,
      transferId: `sim_transfer_${Date.now()}`,
      status: 'settled',
      amount: amount,
      montoCentro: this._calcularMontoCentro(amount),
      currency: 'USD',
      createdAt: new Date(),
      simulated: true
    };
  }

  /**
   * Verifica el estado de una transacción
   * @param {String} transactionId - ID de la transacción a verificar
   * @returns {Object} Estado de la transacción
   */
  async checkTransactionStatus(transactionId) {
    try {
      // Si estamos en modo simulado, devolver una transacción simulada
      if (this.simulationMode) {
        logger.info(`Consultando transacción simulada: ${transactionId}`);
        return this._getSimulatedTransactionStatus(transactionId);
      }
      
      // Si no estamos en modo simulado, consultar la transacción real
      const transaction = await this.platformGateway.transaction.find(transactionId);
      
      return {
        id: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currencyIsoCode,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      };
    } catch (error) {
      logger.error('Error verificando transacción:', error);
      
      // En caso de error, devolver una transacción simulada con indicador de error
      return this._getSimulatedTransactionStatus(transactionId, error.message);
    }
  }

  /**
   * Reembolsa una transacción total o parcialmente
   * @param {String} transactionId - ID de la transacción a reembolsar
   * @param {Number} amount - Monto a reembolsar (opcional, si no se especifica se reembolsa el total)
   * @returns {Object} Resultado del reembolso
   * @throws {Boom.badRequest} Si hay problemas con el reembolso
   */
  async refundTransaction(transactionId, amount = null) {
    try {
      // Si estamos en modo simulado, devolver un reembolso simulado
      if (this.simulationMode) {
        logger.info(`Reembolsando transacción simulada: ${transactionId}, monto: ${amount || 'total'}`);
        return this._getSimulatedRefund(transactionId, amount);
      }
      
      // Si no estamos en modo simulado, procesar el reembolso real
      const result = await this.platformGateway.transaction.refund(
        transactionId,
        amount ? amount.toString() : undefined
      );

      if (!result.success) {
        throw Boom.badRequest(`Error en el reembolso: ${result.message}`);
      }

      return {
        transactionId: result.transaction.id,
        status: result.transaction.status,
        amount: result.transaction.amount,
        currency: result.transaction.currencyIsoCode,
        createdAt: result.transaction.createdAt
      };
    } catch (error) {
      logger.error('Error procesando el reembolso:', error);
      
      // Si el error es de tipo Boom, propagarlo
      if (error.isBoom) {
        throw error;
      }
      
      // En caso de otros errores, crear un error Boom
      throw Boom.badRequest(`Error procesando el reembolso: ${error.message}`);
    }
  }
  
  /**
   * Genera un estado de transacción simulado para pruebas
   * @param {String} transactionId - ID de la transacción
   * @param {String} errorMessage - Mensaje de error opcional
   * @returns {Object} Estado simulado de la transacción
   * @private
   */
  _getSimulatedTransactionStatus(transactionId, errorMessage = null) {
    return {
      id: transactionId,
      status: 'settled',
      amount: '100.00',
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
      simulated: true,
      ...(errorMessage && { error: errorMessage })
    };
  }
  
  /**
   * Genera un resultado de reembolso simulado para pruebas
   * @param {String} transactionId - ID de la transacción original
   * @param {Number} amount - Monto del reembolso (opcional)
   * @returns {Object} Resultado simulado del reembolso
   * @private
   */
  _getSimulatedRefund(transactionId, amount = null) {
    return {
      transactionId: `refund_${transactionId}`,
      status: 'settled',
      amount: amount ? amount.toString() : '100.00',
      currency: 'USD',
      createdAt: new Date(),
      simulated: true
    };
  }
}

module.exports = new BraintreeService(); 