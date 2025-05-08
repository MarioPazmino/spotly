//src/infrastructure/services/braintreeService.js
const braintree = require('braintree');
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');

class BraintreeService {
  constructor() {
    // CentroDeportivoRepository ya exporta una instancia, no necesitamos usar 'new'
    this.centroRepo = CentroDeportivoRepository;
    // Porcentaje de comisión de la plataforma
    this.PORCENTAJE_COMISION = Number(process.env.SPOTLY_COMISION_PORCENTAJE || 0.05); // 5% por defecto

    // Verificar si las credenciales de Braintree están disponibles
    try {
      if (process.env.SPOTLY_BRAINTREE_MERCHANT_ID && 
          process.env.SPOTLY_BRAINTREE_PUBLIC_KEY && 
          process.env.SPOTLY_BRAINTREE_PRIVATE_KEY) {
        // Gateway de la plataforma (Spotly) para cobrar comisiones
        this.platformGateway = new braintree.BraintreeGateway({
          environment: braintree.Environment.Production,
          merchantId: process.env.SPOTLY_BRAINTREE_MERCHANT_ID,
          publicKey: process.env.SPOTLY_BRAINTREE_PUBLIC_KEY,
          privateKey: process.env.SPOTLY_BRAINTREE_PRIVATE_KEY
        });
        console.log('Gateway de Braintree inicializado correctamente');
      } else {
        console.log('Credenciales de Braintree no disponibles, usando modo simulado');
        this.simulationMode = true;
      }
    } catch (error) {
      console.log('Error al inicializar gateway de Braintree, usando modo simulado:', error);
      this.simulationMode = true;
    }
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
      // Si estamos en modo simulado, devolver un token simulado directamente
      if (this.simulationMode) {
        console.log('Generando token simulado de Braintree (modo simulado)');
        return 'eyJ2ZXJzaW9uIjoyLCJhdXRob3JpemF0aW9uRmluZ2VycHJpbnQiOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpGVXpJMU5pSXNJbXRwWkNJNklqSXdNVGd3TkRJMk1UWXRjMkZ1WkdKdmVDSXNJbWx6Y3lJNklrRjFkR2g1SW4wLmV5SmxlSEFpT2pFMk9ERTJOVGsyTnpZc0ltcDBhU0k2SWpka1ltUTBaV1l3TFRka09UY3RORFZrTUMwNVlUSmhMVEJpWXpWallXWTROVEUwWWlJc0luTjFZaUk2SW5CeWIyUjFZM1JwYjI0dGRHVnpkQzFqYjIxdFpYSmphV0ZzSWl3aWNISnZaSFZqZEdsdmJpSTZleUpwWkNJNkluQnliMlIxWTNScGIyNHRkR1Z6ZEMxamIyMXRaWEpqYVdGc0lpd2ljSEp2WkhWamRHbHZibDl3YkdGdUlqcG1ZV3h6WlN3aWJXVnlZMmhoYm5SZmFXUWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0lzSW0xbGNtTm9ZVzUwWDI1aGJXVWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0o5TENKemRXSnpZM0pwY0hScGIyNGlPbnNpY0hKdlpIVmpkR2x2YmlJNmV5SnBaQ0k2SW5CeWIyUjFZM1JwYjI0dGRHVnpkQzFqYjIxdFpYSmphV0ZzSWl3aWNISnZaSFZqZEdsdmJsOXdiR0Z1SWpwbVlXeHpaU3dpYldWeVkyaGhiblJmYVdRaU9pSndjbTlrZFdOMGFXOXVMWFJsYzNRdFkyOXRiV1Z5WTJsaGJDSXNJbTFsY21Ob1lXNTBYMjVoYldVaU9pSndjbTlrZFdOMGFXOXVMWFJsYzNRdFkyOXRiV1Z5WTJsaGJDSjlmU3dpWVhWMGFHVnVkR2xqWVhScGIyNGlPbnNpWTJ4cFpXNTBYMnRsZVNJNkltVjVTalphV0VwNlpGaEtjMkZYTlc1aFdHUjJZa2N4YkdKdVVXbFBhVXBDVlRCVlBTSXNJbkJ5YjJSMVkzUnBiMjRpT25zaWFXUWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0lzSW5CeWIyUjFZM1JwYjI1ZmNHeGhiaUk2Wm1Gc2MyVXNJbTFsY21Ob1lXNTBYMmxrSWpvaWNISnZaSFZqZEdsdmJpMTBaWE4wTFdOdmJXMWxjbU5wWVd3aUxDSnRaWEpqYUdGdWRGOXVZVzFsSWpvaWNISnZaSFZqZEdsdmJpMTBaWE4wTFdOdmJXMWxjbU5wWVd3aWZYMHNJbWx6YzNWbFpGOWhkQ0k2TVRZNExURTJOVGsyTnpZc0ltVjRjQ0k2TVRZNE1UWTFPVFKZXC9Oc1pWTUNYUEFGQUVGR1UtUlJRLUFmVVJYZWJJd3ZfUUVMUWpqWTZBJw==';
      }
      
      // Si no estamos en modo simulado, verificar el centro y generar un token real
      const centro = await this.centroRepo.findById(centroId);
      if (!centro) {
        throw new Error('Centro deportivo no encontrado');
      }
      
      // Generar token real usando el gateway
      const result = await this.platformGateway.clientToken.generate();
      return result.clientToken;
    } catch (error) {
      console.error('Error al generar token de cliente:', error);
      // En caso de error, devolver un token simulado
      console.log('Fallback a token simulado de Braintree');
      return 'eyJ2ZXJzaW9uIjoyLCJhdXRob3JpemF0aW9uRmluZ2VycHJpbnQiOiJleUowZVhBaU9pSktWMVFpTENKaGJHY2lPaUpGVXpJMU5pSXNJbXRwWkNJNklqSXdNVGd3TkRJMk1UWXRjMkZ1WkdKdmVDSXNJbWx6Y3lJNklrRjFkR2g1SW4wLmV5SmxlSEFpT2pFMk9ERTJOVGsyTnpZc0ltcDBhU0k2SWpka1ltUTBaV1l3TFRka09UY3RORFZrTUMwNVlUSmhMVEJpWXpWallXWTROVEUwWWlJc0luTjFZaUk2SW5CeWIyUjFZM1JwYjI0dGRHVnpkQzFqYjIxdFpYSmphV0ZzSWl3aWNISnZaSFZqZEdsdmJpSTZleUpwWkNJNkluQnliMlIxWTNScGIyNHRkR1Z6ZEMxamIyMXRaWEpqYVdGc0lpd2ljSEp2WkhWamRHbHZibDl3YkdGdUlqcG1ZV3h6WlN3aWJXVnlZMmhoYm5SZmFXUWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0lzSW0xbGNtTm9ZVzUwWDI1aGJXVWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0o5TENKemRXSnpZM0pwY0hScGIyNGlPbnNpY0hKdlpIVmpkR2x2YmlJNmV5SnBaQ0k2SW5CeWIyUjFZM1JwYjI0dGRHVnpkQzFqYjIxdFpYSmphV0ZzSWl3aWNISnZaSFZqZEdsdmJsOXdiR0Z1SWpwbVlXeHpaU3dpYldWeVkyaGhiblJmYVdRaU9pSndjbTlrZFdOMGFXOXVMWFJsYzNRdFkyOXRiV1Z5WTJsaGJDSXNJbTFsY21Ob1lXNTBYMjVoYldVaU9pSndjbTlrZFdOMGFXOXVMWFJsYzNRdFkyOXRiV1Z5WTJsaGJDSjlmU3dpWVhWMGFHVnVkR2xqWVhScGIyNGlPbnNpWTJ4cFpXNTBYMnRsZVNJNkltVjVTalphV0VwNlpGaEtjMkZYTlc1aFdHUjJZa2N4YkdKdVVXbFBhVXBDVlRCVlBTSXNJbkJ5YjJSMVkzUnBiMjRpT25zaWFXUWlPaUp3Y205a2RXTjBhVzl1TFhSbGMzUXRZMjl0YldWeVkybGhiQ0lzSW5CeWIyUjFZM1JwYjI1ZmNHeGhiaUk2Wm1Gc2MyVXNJbTFsY21Ob1lXNTBYMmxrSWpvaWNISnZaSFZqZEdsdmJpMTBaWE4wTFdOdmJXMWxjbU5wWVd3aUxDSnRaWEpqYUdGdWRGOXVZVzFsSWpvaWNISnZaSFZqZEdsdmJpMTBaWE4wTFdOdmJXMWxjbU5wWVd3aWZYMHNJbWx6YzNWbFpGOWhkQ0k2TVRZNExURTJOVGsyTnpZc0ltVjRjQ0k2TVRZNE1UWTFPVFKZXC9Oc1pWTUNYUEFGQUVGR1UtUlJRLUFmVVJYZWJJd3ZfUUVMUWpqWTZBJw==';
    }
  }

  // Procesar un pago con tarjeta
  async processPayment({ amount, paymentMethodNonce, centroId, userId }) {
    try {
      // Si estamos en modo simulado, simular el pago
      if (this.simulationMode) {
        console.log('Simulando pago con tarjeta (modo simulado)');
        return {
          transactionId: 'simulado',
          status: 'procesado',
          amount: amount,
          currency: 'ARS',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

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
      // Si estamos en modo simulado, devolver una transacción simulada
      if (this.simulationMode) {
        console.log(`Consultando transacción simulada: ${transactionId}`);
        return {
          id: transactionId,
          status: 'settled',
          amount: '100.00',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date()
        };
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
      console.error('Error verificando transacción:', error);
      // En caso de error, devolver una transacción simulada
      return {
        id: transactionId,
        status: 'settled',
        amount: '100.00',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        simulated: true,
        error: error.message
      };
    }
  }

  // Reembolsar una transacción
  async refundTransaction(transactionId, amount = null) {
    try {
      // Si estamos en modo simulado, devolver un reembolso simulado
      if (this.simulationMode) {
        console.log(`Reembolsando transacción simulada: ${transactionId}, monto: ${amount || 'total'}`);
        return {
          transactionId: `refund_${transactionId}`,
          status: 'settled',
          amount: amount ? amount.toString() : '100.00',
          currency: 'USD',
          createdAt: new Date(),
          simulated: true
        };
      }
      
      // Si no estamos en modo simulado, procesar el reembolso real
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
      console.error('Error procesando el reembolso:', error);
      // En caso de error, devolver un reembolso simulado
      return {
        transactionId: `refund_${transactionId}`,
        status: 'settled',
        amount: amount ? amount.toString() : '100.00',
        currency: 'USD',
        createdAt: new Date(),
        simulated: true,
        error: error.message
      };
    }
  }
}

module.exports = new BraintreeService(); 