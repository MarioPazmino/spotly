//src/domain/entities/usuario.js

class Usuario {
  constructor({
    id,
    email,
    nombre,
    apellido,
    telefono,
    tipo, // 'super_admin', 'admin_centro', 'cliente'
    centroDeportivoId, // Solo para admin_centro
    createdAt,
    updatedAt
  }) {
    this.id = id;
    this.email = email;
    this.nombre = nombre;
    this.apellido = apellido;
    this.telefono = telefono;
    this.tipo = tipo;
    this.centroDeportivoId = centroDeportivoId;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

export default Usuario;
