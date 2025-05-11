// src/domain/entities/horarios.js
class Horario {
  constructor({
    horarioId, // Identificador único del horario
    canchaId, // ID de la cancha asociada (FK)
    fecha, // Fecha disponible (formato YYYY-MM-DD)
    horaInicio, // Hora de inicio del bloque (formato HH:MM)
    horaFin, // Hora de fin del bloque (formato HH:MM)
    estado, // Estado: "Disponible" o "Reservado"
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    // Validación de campos obligatorios
    if (!horarioId || !canchaId || !fecha || !horaInicio || !horaFin) {
      throw new Error('Campos obligatorios faltantes: horarioId, canchaId, fecha, horaInicio, horaFin');
    }
    
    // Validamos que el estado sea válido
    if (estado && !['Disponible', 'Reservado'].includes(estado)) {
      throw new Error('Estado inválido. Debe ser "Disponible" o "Reservado"');
    }

    this.horarioId = horarioId;
    this.canchaId = canchaId;
    this.fecha = fecha;
    this.horaInicio = horaInicio;
    this.horaFin = horaFin;
    this.estado = estado || "Disponible"; // Valor por defecto
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Horario;