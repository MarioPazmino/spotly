//src/interfaces/middlewares/CognitoAuthMiddleware.js
const Boom = require('@hapi/boom');

class CognitoAuthMiddleware {
  // Middleware para autenticar usuarios mediante Cognito
  async authenticate(event) {
    try {
      const claims = event?.requestContext?.authorizer?.claims || {};
      if (!claims.sub) {
        throw Boom.unauthorized('Token inválido o ausente');
      }

      const user = {
        sub: claims.sub,
        email: claims.email,
        name: claims.name || claims.nickname || claims.email.split('@')[0],
        picture: claims.picture || null,
        groups: claims['cognito:groups'] 
          ? claims['cognito:groups'].split(',') 
          : [],
        registrationSource: claims.identities 
          ? JSON.parse(claims.identities)[0]?.providerName 
          : 'cognito'
      };

      // Validar roles específicos
      if (user.groups.includes('admin_centro')) {
        const isConfirmed = claims['custom:isConfirmed'] === 'true'; // Campo personalizado
        if (!isConfirmed) {
          throw Boom.forbidden('El usuario admin_centro no ha sido confirmado por el superadmin.');
        }
      }

      return user;
    } catch (error) {
      throw Boom.unauthorized('Autenticación fallida: ' + error.message);
    }
  }
}

module.exports = new CognitoAuthMiddleware();