//src/domain/entities/notificacion.js
class Notificacion {
    constructor({
      notificacionId, // Identificador único de la notificación
      emisorId, // ID del emisor (usuario/sistema) (FK)
      receptorId, // ID del usuario destinatario (FK)
      mensaje, // Contenido del mensaje a mostrar
      tipoNotificacion, // Tipo: 'mensaje', 'alerta', 'recordatorio', etc.
      tipoEnvio, // Canal: 'email', 'push', 'in-app', etc.
      leido = false, // Indica si el usuario ha leído la notificación
      createdAt = new Date().toISOString(), // Fecha de creación
      updatedAt = new Date().toISOString() // Fecha de última actualización
    }) {
      this.notificacionId = notificacionId;
      this.emisorId = emisorId;
      this.receptorId = receptorId;
      this.mensaje = mensaje;
      this.tipoNotificacion = tipoNotificacion;
      this.tipoEnvio = tipoEnvio;
      this.leido = leido;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
    }
  }
  
  module.exports = Notificacion;