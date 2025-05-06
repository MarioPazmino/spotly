const { SNS } = require('@aws-sdk/client-sns');

class NotificationError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'NotificationError';
    this.originalError = originalError;
  }
}

class PushNotificationHandler {
  constructor() {
    this.sns = new SNS({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }

  async handleNotification(event) {
    try {
      const message = JSON.parse(event.Records[0].Sns.Message);
      console.log('Procesando notificación:', message);

      // Aquí puedes implementar la lógica específica para cada tipo de notificación
      switch (message.type) {
        case 'RESERVA_CREADA':
          await this.handleReservaCreada(message);
          break;
        case 'RESERVA_CANCELADA':
          await this.handleReservaCancelada(message);
          break;
        case 'PAGO_REALIZADO':
          await this.handlePagoRealizado(message);
          break;
        case 'RESENA_CREADA':
          await this.handleResenaCreada(message);
          break;
        default:
          console.warn('Tipo de notificación no manejado:', message.type);
      }
    } catch (error) {
      console.error('Error procesando notificación:', error);
      throw new NotificationError('Error procesando notificación', error);
    }
  }

  async handleReservaCreada(message) {
    const { userId, reservaId, canchaId, fecha, hora } = message.data;
    // Implementar lógica para notificar al usuario sobre su reserva
    // Por ejemplo, enviar push notification a la app móvil
  }

  async handleReservaCancelada(message) {
    const { userId, reservaId, motivo } = message.data;
    // Implementar lógica para notificar al usuario sobre la cancelación
  }

  async handlePagoRealizado(message) {
    const { userId, pagoId, monto } = message.data;
    // Implementar lógica para notificar al usuario sobre el pago
  }

  async handleResenaCreada(message) {
    const { userId, resenaId, canchaId, calificacion } = message.data;
    // Implementar lógica para notificar al centro deportivo sobre la reseña
  }
}

// Handler principal de Lambda
exports.handler = async (event) => {
  const handler = new PushNotificationHandler();
  return handler.handleNotification(event);
}; 