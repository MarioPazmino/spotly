// src/interfaces/middlewares/validateCentroDeportivo.js
const Joi = require('joi');

// Esquema base con todos los campos posibles del centro deportivo
const centroDeportivoBaseSchema = {
  nombre: Joi.string(),
  direccion: Joi.string(),
  telefonoPrincipal: Joi.string(),
  userId: Joi.string(),
  horarioApertura: Joi.string().pattern(/^\d{2}:\d{2}$/),
  horarioCierre: Joi.string().pattern(/^\d{2}:\d{2}$/),
  ubicacionGPS: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }),
  imagenes: Joi.array().items(Joi.string().uri()),
  servicios: Joi.array().items(Joi.string()),
  estado: Joi.string(),
  bancos: Joi.array().items(
    Joi.object({
      banco: Joi.string().required(),
      cuenta: Joi.string().required()
    })
  ),
  cedulaJuridica: Joi.string(),
  braintreeMerchantId: Joi.string(),
  braintreeAccountId: Joi.string(),
  braintreeStatus: Joi.string(),
  redesSociales: Joi.object(),
  cupones: Joi.array().items(Joi.string()),
  createdAt: Joi.date().iso(),
  updatedAt: Joi.date().iso()
};

// Esquemas específicos para creación y actualización
const createSchema = Joi.object({
  ...centroDeportivoBaseSchema,
  nombre: Joi.string().required(),
  direccion: Joi.string().required(),
  telefonoPrincipal: Joi.string().required(),
  userId: Joi.string().required()
});

const updateSchema = Joi.object({
  ...centroDeportivoBaseSchema
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

/**
 * Middleware para validar centro deportivo según el método HTTP
 */
module.exports = (req, res, next) => {
  try {
    // Seleccionar esquema según el método HTTP
    const schema = req.method === 'POST' ? createSchema : updateSchema;
    
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Si es una actualización, asegurar que se incluya el timestamp
    if (req.method === 'PUT' || req.method === 'PATCH') {
      req.body.updatedAt = new Date().toISOString();
    }
    
    next();
  } catch (error) {
    next(error);
  }
};