//src/domain/entities/horarios.js
class Horario {
    constructor({
      horarioId, // Renombrado de 'id' a 'horarioId'
      canchaId, // FK a CanchasDeportivas.CanchaId
      fecha, // Formato ISO date (YYYY-MM-DD)
      horaInicio, // Formato time (HH:MM:SS)
      horaFin, // Formato time (HH:MM:SS)
      estado, // "Disponible" o "Reservado"
      userId, // FK opcional a Usuarios.UserId (solo si está reservado)
      reservaId, // ID de reserva opcional
      createdAt,
      updatedAt
    }) {
      this.horarioId = horarioId;
      this.canchaId = canchaId;
      this.fecha = fecha;
      this.horaInicio = horaInicio;
      this.horaFin = horaFin;
      this.estado = estado;
      this.userId = userId || null; // Permite valor nulo
      this.reservaId = reservaId || null; // Campo opcional
      this.createdAt = createdAt || new Date().toISOString();
      this.updatedAt = updatedAt || new Date().toISOString();
    }
  }
  
  module.exports = Horario;