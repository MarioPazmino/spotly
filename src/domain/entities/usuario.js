//src/domain/entities/usuario.js

class Usuario {
  constructor({
    userId, // Renombrado de 'id' a 'userId'
    email,
    passwordHash, // Campo nuevo agregado
    role, // Renombrado de 'tipo' a 'role'
    createdAt,
    updatedAt
  }) {
    this.userId = userId;
    this.email = email;
    this.passwordHash = passwordHash; // Asignación del hash de contraseña
    this.role = role; // 'super_admin', 'admin_centro', 'cliente'
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}
module.exports = Usuario;