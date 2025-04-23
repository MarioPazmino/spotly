// src/interfaces/middlewares/cognitoAuth.js
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const Boom = require('@hapi/boom');

// Crear el verificador una sola vez a nivel de módulo
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID
});

// Middleware para autenticación con Cognito
class CognitoAuthMiddleware {
  // Middleware para verificar el token de acceso
  authenticate() {
    return async (req, res, next) => {
      try {
        // Extraer el token del encabezado Authorization
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw Boom.unauthorized('Se requiere token de autenticación');
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verificar el token con aws-jwt-verify
        const claims = await verifier.verify(token);
        
        // Extraer información relevante del usuario
        req.user = {
          sub: claims.sub,
          username: claims.username,
          email: claims['email'],
          scope: claims.scope ? claims.scope.split(' ') : [],
          groups: claims['cognito:groups'] || [],
          role: claims['custom:role'] || 'cliente'
        };
        
        next();
      } catch (error) {
        console.error('Error de autenticación:', error);
        
        // Manejo específico según el tipo de error
        if (error.name === 'TokenExpiredError') {
          return next(Boom.unauthorized('Token expirado', { code: 'TOKEN_EXPIRED' }));
        } else if (error.name === 'JwtParseError') {
          return next(Boom.unauthorized('Token inválido', { code: 'INVALID_TOKEN' }));
        } else if (error.name === 'JwksError') {
          return next(Boom.unauthorized('Error al verificar firma del token', { code: 'SIGNATURE_VERIFICATION_FAILED' }));
        } else if (error.name === 'TokenNotActiveError') {
          return next(Boom.unauthorized('Token aún no está activo', { code: 'TOKEN_NOT_ACTIVE' }));
        } else {
          return next(Boom.unauthorized('Error de autenticación', { code: 'AUTH_ERROR', details: error.message }));
        }
      }
    };
  }
}

// Creamos una única instancia para reutilizarla en todas las rutas
const cognitoAuth = new CognitoAuthMiddleware();
module.exports = cognitoAuth;