//src/domain/entities/reserva.js
class Reserva {
  constructor({
    ReservaId, // Renombrado de 'id' a 'reservaId'
    userId, // Renombrado de 'usuarioId' a 'userId'
    canchaId,
    horarioId, // Nuevo campo (FK a Horarios.HorarioId)
    fecha,
    horaInicio,
    horaFin,
    estado, // Valores: "Pendiente", "Pagado", "Cancelado"
    total, // Renombrado de 'montoTotal' a 'total'
    createdAt,
    updatedAt
  }) {
    this.ReservaId = ReservaId;
    this.userId = userId;
    this.canchaId = canchaId;
    this.horarioId = horarioId;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.estado = estado;
    this.total = total;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}
module.exports = Reserva;
