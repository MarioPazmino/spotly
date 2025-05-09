// src/interfaces/middlewares/auth/jwtAuthMiddleware.js

/**
 * Middleware de autenticación que verifica tokens JWT
 * Responsabilidad única: Verificar la autenticación del usuario
 */
const jwtAuthMiddleware = (req, res, next) => {
  try {
    // Verificar si hay un token de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No se proporcionó un token de autenticación válido' });
    }

    // Extraer el token
    const token = authHeader.split(' ')[1];
    
    // En producción, el token ya ha sido verificado por API Gateway/Cognito
    // Asegurarse de que req.user exista y tenga la propiedad groups
    if (!req.user) {
      // Extraer información del token JWT (formato cognito)
      // El token de Cognito incluye grupos en cognito:groups
      const tokenPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      // Configurar req.user con la información del token
      req.user = {
        sub: tokenPayload.sub || tokenPayload.username,
        email: tokenPayload.email || '',
        name: tokenPayload.name || '',
        groups: tokenPayload['cognito:groups'] 
          ? (Array.isArray(tokenPayload['cognito:groups']) 
              ? tokenPayload['cognito:groups'] 
              : typeof tokenPayload['cognito:groups'] === 'string' 
                ? tokenPayload['cognito:groups'].split(',') 
                : [])
          : []
      };
      
      // Loggear información para depuración
      console.log('Usuario extraído del token:', req.user);
    }
    
    // Si no hay sub, no está autenticado
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Token de autenticación inválido' });
    }
    
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({ error: 'Error al verificar el token de autenticación' });
  }
};

module.exports = jwtAuthMiddleware;
