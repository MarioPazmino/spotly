const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const Boom = require('@hapi/boom');

//Configura aquí tu región y User Pool ID
const REGION = 'us-east-1'; // Cambia si usas otra región
const USER_POOL_ID = 'us-east-1_eJIeqz2SZ'; // Reemplaza por tu User Pool ID real

//Cliente para obtener la clave pública de Cognito
const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`
});

//Método para obtener la clave con base en el header del token
function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
}

//Middleware de autenticación
module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(Boom.unauthorized('Token no proporcionado'));
  }

  const token = authHeader.split(' ')[1];

  //Decodifica primero para obtener el header y el payload
  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.error('Error de autenticación:', err);
      if (err.name === 'TokenExpiredError') {
        return next(Boom.unauthorized('Token expirado'));
      } else if (err.name === 'JsonWebTokenError') {
        return next(Boom.unauthorized('Token inválido'));
      } else {
        return next(Boom.unauthorized('Error de autenticación'));
      }
    }

    // Extraer claims del token verificado
    req.user = {
      sub: decoded.sub,
      email: decoded.email,
      groups: decoded['cognito:groups'] || [],
      username: decoded['cognito:username'],
      tipo: decoded['custom:tipo'] || 'cliente', // Super_admin, admin_centro, cliente
      centroDeportivoId: decoded['custom:centroDeportivoId'] || null
    };

    next();
  });
};
