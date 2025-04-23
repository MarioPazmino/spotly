// src/interfaces/middlewares/tokenRefresher.js
const { CognitoIdentityServiceProvider } = require('aws-sdk');

// Inicializar el cliente de Cognito una sola vez a nivel de módulo
const cognito = new CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Servicio dedicado para operaciones de token
class TokenService {
  /**
   * Refresca un token de acceso usando un token de refresco
   * @param {string} refreshToken - El token de refresco
   * @returns {Promise<string|null>} - El nuevo token de acceso o null si hay error
   */
  static async refreshToken(refreshToken) {
    try {
      const result = await cognito.initiateAuth({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken
        }
      }).promise();
      
      return result.AuthenticationResult?.AccessToken || null;
    } catch (error) {
      console.warn('Error al refrescar token:', error);
      return null;
    }
  }
}

/**
 * Middleware para comprobar si un token está por expirar y refrescarlo
 */
class TokenRefresher {
  /**
   * Middleware para refrescar tokens que están por expirar
   * Si es necesario, genera un evento que otros middlewares pueden capturar
   */
  checkAndRefresh() {
    return async (req, res, next) => {
      try {
        // Solo proceder si hay un usuario autenticado y un token de refresco
        if (!req.user || !req.headers['x-refresh-token']) {
          return next();
        }

        // Calcular si el token está por expirar (menos de 10 minutos)
        const tokenExpiration = req.user.exp * 1000; // convertir a milisegundos
        const now = Date.now();
        const tenMinutesInMs = 10 * 60 * 1000;

        // Si el token expira en menos de 10 minutos, refrescarlo
        if (tokenExpiration - now < tenMinutesInMs) {
          const refreshToken = req.headers['x-refresh-token'];
          
          // Usar el servicio dedicado para refrescar el token
          const newToken = await TokenService.refreshToken(refreshToken);
          
          // Si hay un nuevo token, guardarlo en una propiedad de la solicitud
          // para que pueda ser utilizado por otros middlewares
          if (newToken) {
            req.newAccessToken = newToken;

            // Emitir un evento personalizado que puede ser capturado por otros middlewares
            res.on('header', () => {
              // Solo modificar los headers cuando se esté preparando para enviar la respuesta
              res.setHeader('X-Access-Token', newToken);
            });
          }
        }
        
        next();
      } catch (error) {
        // Si hay error al refrescar, solo lo registramos pero dejamos continuar
        console.warn('Error al verificar token:', error);
        next();
      }
    };
  }
}

// También necesitamos agregar un middleware para aplicar los nuevos tokens
class TokenHeaderApplier {
  apply() {
    return (req, res, next) => {
      // Middleware que se ejecuta después de los controladores pero antes de enviar la respuesta
      // y aplica el nuevo token a los headers si existe
      if (req.newAccessToken) {
        res.setHeader('X-Access-Token', req.newAccessToken);
      }
      next();
    };
  }
}

const tokenRefresher = new TokenRefresher();
const tokenHeaderApplier = new TokenHeaderApplier();

module.exports = {
  tokenRefresher,
  tokenHeaderApplier,
  TokenService
};