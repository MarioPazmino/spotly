//src/domain/entities/cancha.js
class Cancha {
  constructor({
    canchaId, // Renombrado de 'id' a 'canchaId'
    centroDeportivoId, // Corresponde a CentroId (FK)
    tipo, // 'futbol', 'tenis', etc.
    capacidad,
    precioPorHora,
    createdAt,
    updatedAt
  }) {
    this.canchaId = canchaId;
    this.centroDeportivoId = centroDeportivoId;
    this.tipo = tipo;
    this.capacidad = capacidad;
    this.precioPorHora = precioPorHora;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Cancha;