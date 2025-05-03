// src/interfaces/middlewares/validateCentroDeportivo.js
const Joi = require('joi');

const centroDeportivoSchema = Joi.object({
  nombre: Joi.string().required(),
  direccion: Joi.string().required(),
  telefonoPrincipal: Joi.string().required(),
  userId: Joi.string().required(),
  horarioApertura: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  horarioCierre: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  ubicacionGPS: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required()
  }).optional(),
  imagenes: Joi.array().items(Joi.string().uri()).optional(),
  servicios: Joi.array().items(Joi.string()).optional(),
  estado: Joi.string().optional(),
  bancos: Joi.array().items(
    Joi.object({
      banco: Joi.string().required(),
      cuenta: Joi.string().required()
    })
  ).optional(),
  cedulaJuridica: Joi.string().optional(),
  braintreeMerchantId: Joi.string().optional(),
  braintreeAccountId: Joi.string().optional(),
  braintreeStatus: Joi.string().optional(),
  redesSociales: Joi.object().optional(),
  cupones: Joi.array().items(Joi.string()).optional(),
  createdAt: Joi.date().iso().optional(),
  updatedAt: Joi.date().iso().optional()
});

module.exports = (req, res, next) => {
  const { error } = centroDeportivoSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  next();
};
