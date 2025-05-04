// src/interfaces/middlewares/validateCancha.js
const Joi = require('joi');
const { sanitizeObject } = require('../../utils/sanitizeInput');

const canchaSchema = Joi.object({
  centroId: Joi.string().required(),
  tipo: Joi.string().valid('futbol', 'tenis', 'basket', 'padel', 'voley', 'otros').required(),
  capacidad: Joi.number().integer().min(1).max(100).required(),
  precioPorHora: Joi.number().min(0).required(),
  estado: Joi.string().valid('activa', 'mantenimiento', 'inactiva').optional(),
  descripcion: Joi.string().allow('').max(500),
  imagenes: Joi.array().items(
    Joi.string().uri().max(300).custom((value, helpers) => {
      // Permitir keys S3 o URLs de imagen válidas
      if (typeof value !== 'string') return helpers.error('any.invalid');
      // Permite S3 key (ej: centros/uuid/uuid.jpg)
      if (/^centros\/.+\.(jpg|jpeg|png)$/i.test(value)) return value;
      // Permite URLs de imagen
      if (/\.(jpg|jpeg|png)$/i.test(value)) return value;
      return helpers.error('string.pattern.base', { value });
    }, 'Validación de imagen').message('La imagen debe ser una URL o key S3 que termine en .jpg, .jpeg o .png')
  ).max(3).optional(),
  equipamientoIncluido: Joi.array().items(Joi.string().max(50)).optional(),
});

function validateCancha(req, res, next) {
  // Sanitizar todos los campos del body antes de validar
  req.body = sanitizeObject(req.body);

  // Prevenir actualización de centroId en PUT/PATCH
  if ((req.method === 'PUT' || req.method === 'PATCH') && req.body.centroId !== undefined) {
    return res.status(400).json({
      message: 'No se permite actualizar el campo centroId de una cancha existente.'
    });
  }

  const { error } = canchaSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      message: 'Datos de cancha inválidos',
      details: error.details.map(e => e.message)
    });
  }
  next();
}

module.exports = { validateCancha };
