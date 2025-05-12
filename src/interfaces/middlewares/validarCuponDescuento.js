// src/interfaces/middlewares/validarCuponDescuento.js
/**
 * Middleware para validar cupones de descuento
 * Responsabilidad única: validación de datos de cupones en las solicitudes
 */

const validador = require('../middlewares/validation/cuponDescuentoValidador');
const { validate: isUuid } = require('uuid');

/**
 * Middleware para validar UUID de cupón
 */
function validarCuponUUID(req, res, next) {
  const cuponId = req.params.cuponId;
  if (!cuponId || !isUuid(cuponId)) {
    return res.status(400).json({
      error: 'UUID Inválido',
      mensaje: 'El parámetro cuponId debe ser un UUID válido',
      code: 'INVALID_UUID'
    });
  }
  next();
}

/**
 * Middleware para validar UUID de centro deportivo
 */
function validarCentroUUID(req, res, next) {
  const centroId = req.params.centroId;
  if (!centroId || !isUuid(centroId)) {
    return res.status(400).json({
      error: 'UUID Inválido',
      mensaje: 'El parámetro centroId debe ser un UUID válido',
      code: 'INVALID_UUID'
    });
  }
  next();
}

/**
 * Middleware para validar datos de creación de cupón
 */
function validarCrearCupon(req, res, next) {
  // Aplicar validación
  const resultado = validador.validarCrearCupon(req.body);
  if (!resultado.valido) {
    const { status, code, message, detalles } = resultado.error;
    return res.status(status).json({
      error: message,
      mensaje: message,
      detalles,
      code
    });
  }
  
  next();
}

/**
 * Middleware para validar datos de actualización de cupón
 */
function validarActualizarCupon(req, res, next) {
  // Asegurar que el cuponId de la URL esté en el cuerpo
  req.body.cuponId = req.params.cuponId;
  
  // Aplicar validación
  const resultado = validador.validarActualizarCupon(req.body);
  if (!resultado.valido) {
    const { status, code, message, detalles } = resultado.error;
    return res.status(status).json({
      error: message,
      mensaje: message,
      detalles,
      code
    });
  }
  
  next();
}

module.exports = {
  validarCuponUUID,
  validarCentroUUID,
  validarCrearCupon,
  validarActualizarCupon
};
