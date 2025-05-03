//src/domain/entities/reserva.js
class Reserva {
  constructor({
    reservaId, // Identificador único de la reserva
    userId, // ID del usuario que reserva (FK)
    canchaId, // ID de la cancha reservada (FK)
    horarioId, // ID del horario asociado (FK)
    fecha, // Fecha de la reserva (formato YYYY-MM-DD)
    horaInicio, // Hora de inicio (formato HH:MM:SS)
    horaFin, // Hora de fin (formato HH:MM:SS)
    estado, // Estado: "Pendiente", "Pagado", "Cancelado"
    total, // Monto total a pagar
    notas, // Instrucciones especiales o comentarios
    codigoPromoAplicado, // Código del cupón (ej.: "DESCUENTO10")
    descuentoAplicado, // Monto del descuento aplicado (ej.: $5)
    cancelacionMotivo, // Razón de cancelación, si aplica
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.reservaId = reservaId;
    this.userId = userId;
    this.canchaId = canchaId;
    this.horarioId = horarioId;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.estado = estado;
    this.total = total;
    this.notas = notas || ''; // Cadena vacía por defecto
    this.codigoPromoAplicado = codigoPromoAplicado || null; // Nulo si no hay promoción
    this.descuentoAplicado = descuentoAplicado || 0; // Monto del descuento aplicado (ej.: $5)
    this.cancelacionMotivo = cancelacionMotivo || null; // Nulo si no fue cancelada
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Reserva;