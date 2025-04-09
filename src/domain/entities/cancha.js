//src/domain/entities/cancha.js
class Cancha {
    constructor({
      id,
      centroDeportivoId,
      nombre,
      tipo, // 'futbol', 'tenis', 'basquet', etc.
      capacidad,
      precioPorHora,
      descripcion,
      imagenes,
      tamano,
      superficie, // 'césped sintético', 'madera', etc.
      disponible,
      createdAt,
      updatedAt
    }) {
      this.id = id;
      this.centroDeportivoId = centroDeportivoId;
      this.nombre = nombre;
      this.tipo = tipo;
      this.capacidad = capacidad;
      this.precioPorHora = precioPorHora;
      this.descripcion = descripcion;
      this.imagenes = imagenes || [];
      this.tamano = tamano;
      this.superficie = superficie;
      this.disponible = disponible !== false;
      this.createdAt = createdAt || new Date().toISOString();
      this.updatedAt = updatedAt || new Date().toISOString();
    }
  }
  module.exports = Cancha;
  