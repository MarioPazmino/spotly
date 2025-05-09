//src/domain/entities/usuario.js
class Usuario {
  constructor({
    userId, // Identificador único del usuario
    email, // Correo electrónico (debe ser único)
    role, // Rol: 'super_admin' (acceso total), 'admin_centro' (administra centros deportivos), 'cliente' (usuario regular)
    name, // Nombre completo del usuario
    imagenPerfil, // URL de la imagen de perfil
    registrationSource, // Origen: 'cognito', 'google', 'facebook', etc.
    lastLogin, // Fecha y hora del último inicio de sesión
    pendienteAprobacion, // el admincentro de web debe estar pendiente de aprobación
    canchasFavoritas, // Array de IDs de canchas favoritas del usuario
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.userId = userId;
    this.email = email;
    this.role = role || 'cliente'; // Cliente por defecto
    this.name = name;
    this.imagenPerfil = imagenPerfil || null;
    this.registrationSource = registrationSource || 'cognito';
    this.pendienteAprobacion = pendienteAprobacion || null; // "true" si está pendiente
    this.lastLogin = lastLogin || null;
    this.canchasFavoritas = canchasFavoritas || []; // Array vacío por defecto
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Usuario;