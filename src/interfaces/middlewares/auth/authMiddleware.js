// src/interfaces/middlewares/auth/authMiddleware.js
/**
 * Middleware de autenticación para entornos de desarrollo y producción
 * En producción, la autenticación real se maneja a través de API Gateway/Cognito
 * En desarrollo, simula un usuario autenticado con permisos de super_admin
 */

/**
 * Middleware de autenticación
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 */
const auth = (req, res, next) => {
  // Verificar si estamos en producción
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // En producción, la autenticación real ya se maneja a través de API Gateway/Cognito
    // Solo pasamos al siguiente middleware
    return next();
  }
  
  // En desarrollo, simulamos un usuario autenticado con permisos de super_admin
  // para evitar problemas de permisos durante las pruebas
  req.user = {
    userId: 'test-user-id',
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'super_admin', // Usar super_admin para tener acceso completo
    picture: null,
    registrationSource: 'cognito',
    pendienteAprobacion: null,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    groups: ['super_admin'],
    'cognito:groups': ['super_admin']
  };
  console.log(`Usuario simulado en desarrollo: ${JSON.stringify(req.user)}`);
  next();
};

module.exports = auth;
