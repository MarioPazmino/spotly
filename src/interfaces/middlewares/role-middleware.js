import Boom from '@hapi/boom';

// Middleware para verificar roles
export default function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw Boom.unauthorized('Usuario no autenticado');
      }

      const userTipo = req.user.tipo;

      if (!allowedRoles.includes(userTipo)) {
        throw Boom.forbidden('No tienes permisos para realizar esta acción');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
