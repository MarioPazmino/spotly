//src/domain/entities/cancha.js
class Cancha {
  constructor({
    canchaId, // Identificador único de la cancha
    centroDeportivoId, // ID del centro deportivo al que pertenece (FK)
    tipo, // Tipo de cancha: 'futbol', 'tenis', 'basket', etc.
    capacidad, // Cantidad máxima de jugadores permitidos
    precioPorHora, // Tarifa de alquiler por hora
    estado, // Estado de la cancha: 'activa', 'mantenimiento', 'inactiva', etc.
    descripcion, // Descripción detallada de características
    imagenes, // Array de URLs de imágenes
    equipamientoIncluido, // Lista de equipamiento: balones, redes, etc.
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.canchaId = canchaId;
    this.centroDeportivoId = centroDeportivoId;
    this.tipo = tipo;
    this.capacidad = capacidad;
    this.precioPorHora = precioPorHora;
    this.estado = estado || 'activa'; // Por defecto está activa
    this.descripcion = descripcion || '';
    this.imagenes = imagenes || []; // Array vacío por defecto
    this.equipamientoIncluido = equipamientoIncluido || []; // Array vacío por defecto
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Cancha;