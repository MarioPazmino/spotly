// src/infrastructure/services/payment-service.js
import Stripe from 'stripe';
import Boom from '@hapi/boom';

class PaymentService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  async createPaymentIntent(amount, description, metadata) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe trabaja en centavos
        currency: 'usd', // Ajustar según país
        description,
        metadata
      });

      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id
      };
    } catch (error) {
      console.error('Error creando payment intent:', error);
      throw Boom.badImplementation('Error procesando el pago');
    }
  }

  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        return { success: true, paymentIntent };
      } else {
        return { success: false, status: paymentIntent.status };
      }
    } catch (error) {
      console.error('Error confirmando pago:', error);
      throw Boom.badImplementation('Error confirmando el pago');
    }
  }
}

export default PaymentService;
