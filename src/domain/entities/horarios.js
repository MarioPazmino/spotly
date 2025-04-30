//src/domain/entities/horarios.js
class Horario {
  constructor({
    horarioId, // Identificador único del horario
    canchaId, // ID de la cancha asociada (FK)
    fecha, // Fecha disponible (formato YYYY-MM-DD)
    horaInicio, // Hora de inicio del bloque (formato HH:MM:SS)
    horaFin, // Hora de fin del bloque (formato HH:MM:SS)
    estado, // Estado: "Disponible" o "Reservado"
    userId, // ID del usuario que reservó (FK opcional)
    reservaId, // ID de la reserva asociada (FK opcional)
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.horarioId = horarioId;
    this.canchaId = canchaId;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.estado = estado;
    this.userId = userId || null; // Nulo si no está reservado
    this.reservaId = reservaId || null; // Nulo si no hay reserva
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Horario;