// src/interfaces/middlewares/validation/uuidValidationMiddleware.js
/**
 * Middleware para validar que los parámetros de ruta sean UUIDs válidos
 */
const { validate: isUuid } = require('uuid');

/**
 * Middleware para validar UUID
 * @param {string} paramName - Nombre del parámetro a validar
 * @returns {Function} Middleware de Express
 */
function validateUUID(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!isUuid(value)) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: `El parámetro ${paramName} debe ser un UUID válido.`
      });
    }
    next();
  };
}

module.exports = validateUUID;
