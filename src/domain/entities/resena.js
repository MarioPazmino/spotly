//src/domain/entities/resena.js
class Resena {
    constructor({
      resenaId, // Identificador único de la reseña
      userId, // ID del usuario que hace la reseña (FK)
      canchaId, // ID de la cancha evaluada (FK, opcional)
      centroDeportivoId, // ID del centro deportivo evaluado (FK, opcional)
      reservaId, // ID de la reserva asociada (FK, opcional)
      calificacion, // Puntuación de 1 a 5 estrellas (opcional)
      comentario, // Texto de la reseña (opcional)
      fecha = new Date().toISOString(), // Fecha en que se realizó la reseña
      createdAt = new Date().toISOString(), // Fecha de creación del registro
      updatedAt = new Date().toISOString() // Fecha de última actualización
    }) {
      this.resenaId = resenaId;
      this.userId = userId;
      this.canchaId = canchaId || null; // Puede ser nulo si se evalúa un centro deportivo
      this.centroDeportivoId = centroDeportivoId || null; // Puede ser nulo si se evalúa una cancha
      this.reservaId = reservaId || null; // Opcional
      this.calificacion = calificacion || null; // Calificación opcional
      this.comentario = comentario || ''; // Comentario opcional (cadena vacía por defecto)
      this.fecha = fecha;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
    }
  }
  
  module.exports = Resena;