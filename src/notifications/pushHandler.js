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
    this.topicArn = process.env.NOTIFICATIONS_TOPIC_ARN;
  }

  async handleNotification(event) {
    try {
      const message = JSON.parse(event.Records[0].Sns.Message);
      console.log('Procesando notificación:', message);

      // Validar que el mensaje tenga la estructura correcta
      if (!message.type || !message.data) {
        throw new NotificationError('Mensaje mal formado');
      }

      // Procesar según el tipo de notificación
      switch (message.type) {
        // Notificaciones para clientes
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

        // Notificaciones para admin_centro
        case 'NUEVA_RESERVA':
          await this.handleNuevaReserva(message);
          break;
        case 'RESERVA_CANCELADA_ADMIN':
          await this.handleReservaCanceladaAdmin(message);
          break;
        case 'NUEVO_PAGO':
          await this.handleNuevoPago(message);
          break;
        case 'NUEVA_RESENA':
          await this.handleNuevaResena(message);
          break;

        // Notificaciones para super_admin
        case 'ADMIN_PENDIENTE':
          await this.handleAdminPendiente(message);
          break;
        case 'ADMIN_APROBADO':
          await this.handleAdminAprobado(message);
          break;
        case 'REPORTE_MENSUAL':
          await this.handleReporteMensual(message);
          break;

        default:
          console.warn('Tipo de notificación no manejado:', message.type);
      }
    } catch (error) {
      console.error('Error procesando notificación:', error);
      throw new NotificationError('Error procesando notificación', error);
    }
  }

  // Notificaciones para clientes
  async handleReservaCreada(message) {
    const { userId, reservaId, canchaId, fecha, hora } = message.data;
    await this.publishNotification({
      userId,
      title: 'Reserva Confirmada',
      body: `Tu reserva para el ${fecha} a las ${hora} ha sido confirmada`,
      data: { type: 'RESERVA_CREADA', reservaId }
    });
  }

  async handleReservaCancelada(message) {
    const { userId, reservaId, motivo } = message.data;
    await this.publishNotification({
      userId,
      title: 'Reserva Cancelada',
      body: `Tu reserva ha sido cancelada${motivo ? `: ${motivo}` : ''}`,
      data: { type: 'RESERVA_CANCELADA', reservaId }
    });
  }

  async handlePagoRealizado(message) {
    const { userId, pagoId, monto } = message.data;
    await this.publishNotification({
      userId,
      title: 'Pago Realizado',
      body: `Se ha procesado tu pago por $${monto}`,
      data: { type: 'PAGO_REALIZADO', pagoId }
    });
  }

  // Notificaciones para admin_centro
  async handleNuevaReserva(message) {
    const { centroId, reservaId, fecha, hora } = message.data;
    await this.publishNotification({
      userId: centroId,
      title: 'Nueva Reserva',
      body: `Nueva reserva para el ${fecha} a las ${hora}`,
      data: { type: 'NUEVA_RESERVA', reservaId },
      role: 'admin_centro'
    });
  }

  async handleNuevaResena(message) {
    const { centroId, resenaId, calificacion } = message.data;
    await this.publishNotification({
      userId: centroId,
      title: 'Nueva Reseña',
      body: `Has recibido una nueva reseña con ${calificacion} estrellas`,
      data: { type: 'NUEVA_RESENA', resenaId },
      role: 'admin_centro'
    });
  }

  // Notificaciones para super_admin
  async handleAdminPendiente(message) {
    const { adminId, email } = message.data;
    await this.publishNotification({
      userId: 'super_admin',
      title: 'Nuevo Admin Pendiente',
      body: `El usuario ${email} está esperando aprobación`,
      data: { type: 'ADMIN_PENDIENTE', adminId },
      role: 'super_admin'
    });
  }

  async handleAdminAprobado(message) {
    const { adminId, email } = message.data;
    await this.publishNotification({
      userId: adminId,
      title: 'Cuenta Aprobada',
      body: 'Tu cuenta de administrador ha sido aprobada',
      data: { type: 'ADMIN_APROBADO' }
    });
  }

  // Método auxiliar para publicar notificaciones
  async publishNotification({ userId, title, body, data, role }) {
    try {
      const message = {
        default: body,
        GCM: JSON.stringify({
          data: {
            title,
            body,
            ...data
          }
        }),
        APNS: JSON.stringify({
          aps: {
            alert: {
              title,
              body
            },
            ...data
          }
        })
      };

      const params = {
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
        MessageAttributes: {
          userId: {
            DataType: 'String',
            StringValue: userId
          },
          role: {
            DataType: 'String',
            StringValue: role || 'cliente'
          }
        }
      };

      await this.sns.publish(params);
      console.log(`Notificación enviada a ${userId}`);
    } catch (error) {
      console.error('Error publicando notificación:', error);
      throw new NotificationError('Error publicando notificación', error);
    }
  }
}

// Handler principal de Lambda
exports.handler = async (event) => {
  const handler = new PushNotificationHandler();
  return handler.handleNotification(event);
}; 