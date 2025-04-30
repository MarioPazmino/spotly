//src/domain/entities/usuario.js
class Usuario {
  constructor({
    userId, // Identificador único del usuario
    email, // Correo electrónico (debe ser único)
    role, // Rol: 'super_admin', 'admin_centro', 'cliente'
    name, // Nombre completo del usuario
    picture, // URL de la imagen de perfil
    registrationSource, // Origen: 'cognito', 'google', 'facebook', etc.
    lastLogin, // Fecha y hora del último inicio de sesión
    pendienteAprobacion, // Nuevo atributo
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.userId = userId;
    this.email = email;
    this.role = role || 'cliente'; // Cliente por defecto
    this.name = name;
    this.picture = picture || null;
    this.registrationSource = registrationSource || 'cognito';
    this.pendienteAprobacion = pendienteAprobacion || null; // "true" si está pendiente
    this.lastLogin = lastLogin || null;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Usuario;