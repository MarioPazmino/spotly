// src/interfaces/middlewares/error-handler.js
import Boom from '@hapi/boom';

export default function errorHandler(err, req, res, next) {
  console.error(err);

  // Si es un error de Boom, usar su formato
  if (err.isBoom) {
    const { statusCode, payload } = err.output;
    return res.status(statusCode).json(payload);
  }

  // Si es un error de validación de Joi
  if (err.name === 'ValidationError') {
    const boomError = Boom.badRequest(err.message);
    const { statusCode, payload } = boomError.output;
    return res.status(statusCode).json(payload);
  }

  // Para cualquier otro tipo de error
  const serverError = Boom.internal('Error interno del servidor');
  const { statusCode, payload } = serverError.output;
  return res.status(statusCode).json(payload);
}
