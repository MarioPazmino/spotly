const braintree = require('braintree');
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');

class BraintreeService {
  constructor() {
    this.centroRepo = new CentroDeportivoRepository();
    // Porcentaje de comisión de la plataforma
    this.PORCENTAJE_COMISION = Number(process.env.SPOTLY_COMISION_PORCENTAJE || 0.05); // 5% por defecto

    // Gateway de la plataforma (Spotly) para cobrar comisiones
    this.platformGateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Production,
      merchantId: process.env.SPOTLY_BRAINTREE_MERCHANT_ID,
      publicKey: process.env.SPOTLY_BRAINTREE_PUBLIC_KEY,
      privateKey: process.env.SPOTLY_BRAINTREE_PRIVATE_KEY
    });
  }

  // Crear gateway con credenciales del centro deportivo
  _createGateway(centro) {
    if (!centro.braintreeMerchantId) {
      throw new Error('El centro deportivo no tiene configurado su ID de Braintree');
    }

    return new braintree.BraintreeGateway({
      environment: braintree.Environment.Production,
      merchantId: centro.braintreeMerchantId
    });
  }

  // Calcular monto para el centro deportivo (después de comisión)
  _calcularMontoCentro(monto) {
    const comision = Number((monto * this.PORCENTAJE_COMISION).toFixed(2));
    return Number(monto) - comision;
  }

  // Generar token de cliente para el frontend
  async generateClientToken(centroId) {
    try {
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw new Error('Centro deportivo no encontrado');
      }

      if (centro.braintreeStatus !== 'activa') {
        throw new Error('El centro deportivo no tiene una cuenta Braintree activa');
      }

      // Usamos el gateway de la plataforma para generar el token
      const clientToken = await this.platformGateway.clientToken.generate({});
      return clientToken.clientToken;
    } catch (error) {
      throw new Error(`Error generando token de cliente: ${error.message}`);
    }
  }

  // Procesar un pago con tarjeta
  async processPayment({ amount, paymentMethodNonce, centroId, userId }) {
    try {
      // Obtener información del centro deportivo
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw new Error('Centro deportivo no encontrado');
      }

      // Verificar que el centro tenga una cuenta Braintree activa
      if (centro.braintreeStatus !== 'activa') {
        throw new Error('El centro deportivo no tiene una cuenta Braintree activa');
      }

      // Calcular monto para el centro deportivo
      const montoCentro = this._calcularMontoCentro(amount);

      // Procesar el pago completo en la cuenta de la plataforma
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

      // Transferir el monto al centro deportivo
      const transferResult = await this.platformGateway.transaction.sale({
        amount: montoCentro.toString(),
        paymentMethodNonce: paymentMethodNonce,
        options: {
          submitForSettlement: true,
          merchantAccountId: centro.braintreeMerchantId // ID de la cuenta del centro deportivo
        }
      });

      if (!transferResult.success) {
        // Si falla la transferencia, intentar hacer reembolso de la transacción principal
        await this.platformGateway.transaction.refund(result.transaction.id);
        throw new Error(`Error en la transferencia al centro deportivo: ${transferResult.message}`);
      }

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
      throw new Error(`Error procesando el pago: ${error.message}`);
    }
  }

  // Verificar el estado de una transacción
  async checkTransactionStatus(transactionId) {
    try {
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
      throw new Error(`Error verificando transacción: ${error.message}`);
    }
  }

  // Reembolsar una transacción
  async refundTransaction(transactionId, amount = null) {
    try {
      const result = await this.platformGateway.transaction.refund(
        transactionId,
        amount ? amount.toString() : undefined
      );

      if (!result.success) {
        throw new Error(`Error en el reembolso: ${result.message}`);
      }

      return {
        transactionId: result.transaction.id,
        status: result.transaction.status,
        amount: result.transaction.amount,
        currency: result.transaction.currencyIsoCode,
        createdAt: result.transaction.createdAt
      };
    } catch (error) {
      throw new Error(`Error procesando el reembolso: ${error.message}`);
    }
  }
}

module.exports = new BraintreeService(); 