//src/domain/entities/centro-deportivo.js
class CentroDeportivo {
  constructor({
    centroId, // Renombrado de 'id' a 'centroId'
    nombre,
    direccion,
    telefono,
    userId, // Nuevo campo (referencia a Usuarios.UserId)
    createdAt,
    updatedAt
  }) {
    this.centroId = centroId;
    this.nombre = nombre;
    this.direccion = direccion;
    this.telefono = telefono;
    this.userId = userId; // Asignación de la FK
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

// Exportación CommonJS
module.exports = CentroDeportivo;