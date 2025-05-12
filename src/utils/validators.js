const { validate: isUuid } = require('uuid');

/**
 * Middleware para validar que un parámetro sea un UUID válido
 * @param {string} paramName Nombre del parámetro a validar
 * @returns {function} Middleware Express
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

module.exports = {
  validateUUID,
  isUuid
}; 