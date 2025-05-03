// src/interfaces/middlewares/validateCentroDeportivo.js
const Joi = require('joi');

// Servicios válidos predefinidos
const SERVICIOS_VALIDOS = ["futbol", "natación", "gimnasio"];
const REDES_VALIDAS = ["facebook", "instagram", "twitter"];

// Esquema base con todos los campos posibles del centro deportivo
const centroDeportivoBaseSchema = {
  nombre: Joi.string(),
  direccion: Joi.string(),
  telefonoPrincipal: Joi.string().pattern(/^[+][1-9]\d{7,14}$/).required()
    .messages({
      'string.pattern.base': 'El teléfono principal debe estar en formato internacional E.164 (ej: +593989508266)'
    }),
  telefonoSecundario: Joi.string().allow(null, '').pattern(/^[+][1-9]\d{7,14}$/)
    .messages({
      'string.pattern.base': 'El teléfono secundario debe estar en formato internacional E.164 (ej: +593989508266)'
    }),
  userId: Joi.string(),
  horarioApertura: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .messages({
      'string.pattern.base': 'El horario de apertura debe estar en formato HH:mm (00:00 a 23:59)'
    }),
  horarioCierre: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .messages({
      'string.pattern.base': 'El horario de cierre debe estar en formato HH:mm (00:00 a 23:59)'
    }),
  ubicacionGPS: Joi.object({
    lat: Joi.number().min(-90).max(90).required()
      .messages({
        'number.min': 'La latitud debe estar entre -90 y 90 grados',
        'number.max': 'La latitud debe estar entre -90 y 90 grados',
        'any.required': 'La latitud es requerida'
      }),
    lng: Joi.number().min(-180).max(180).required()
      .messages({
        'number.min': 'La longitud debe estar entre -180 y 180 grados',
        'number.max': 'La longitud debe estar entre -180 y 180 grados',
        'any.required': 'La longitud es requerida'
      })
  }),
  imagenes: Joi.array().items(
    Joi.string().uri().pattern(/\.(jpg|jpeg|png)$/i)
      .messages({
        'string.pattern.base': 'La imagen debe ser una URL que termine en .jpg, .jpeg o .png',
        'string.uri': 'La imagen debe ser una URL válida'
      })
  ),
  servicios: Joi.array().items(Joi.string().valid(...SERVICIOS_VALIDOS))
    .messages({
      'any.only': `El servicio debe ser uno de: ${SERVICIOS_VALIDOS.join(', ')}`
    }),
  estado: Joi.string().valid('abierto', 'cerrado', 'mantenimiento', 'vacaciones'),
  bancos: Joi.array()
    .max(3)
    .unique((a, b) => a.cuenta === b.cuenta)
    .items(
      Joi.object({
        banco: Joi.string().required(),
        titular: Joi.string().required(),
        cuenta: Joi.string().pattern(/^\d{10,15}$/).required()
          .messages({
            'string.pattern.base': 'La cuenta bancaria debe tener entre 10 y 15 dígitos numéricos'
          })
      })
    ),
  cedulaJuridica: Joi.string().pattern(/^\d{13}$/).required()
    .messages({
      'string.pattern.base': 'La cédula jurídica (RUC) debe tener exactamente 13 dígitos numéricos (Ecuador)'
    }),
  braintreeMerchantId: Joi.string(),
  braintreeAccountId: Joi.string(),
  braintreeStatus: Joi.string().valid('activa', 'pendiente', 'rechazada'),
  redesSociales: Joi.object()
    .max(3)
    .custom((value, helpers) => {
      const keys = Object.keys(value || {});
      if (keys.length > 3) {
        return helpers.error('object.max');
      }
      for (const key of keys) {
        if (!REDES_VALIDAS.includes(key)) {
          return helpers.error('any.only', { key });
        }
        if (!/^https?:\/\//.test(value[key])) {
          return helpers.error('string.uri', { key });
        }
      }
      return value;
    })
    .messages({
      'object.max': 'Solo se permiten hasta 3 redes sociales',
      'any.only': 'Solo se permiten las siguientes redes sociales: facebook, instagram, twitter',
      'string.uri': 'El valor de cada red social debe ser una URL válida'
    }),
  createdAt: Joi.date().iso(),
  updatedAt: Joi.date().iso()
};

// Validación adicional: horarioApertura < horarioCierre
function validateHorarioAperturaCierre(value, helpers) {
  if (value.horarioApertura && value.horarioCierre) {
    const [haH, haM] = value.horarioApertura.split(':').map(Number);
    const [hcH, hcM] = value.horarioCierre.split(':').map(Number);
    const apertura = haH * 60 + haM;
    const cierre = hcH * 60 + hcM;
    if (apertura >= cierre) {
      return helpers.error('any.invalid', { message: 'El horario de apertura debe ser menor al de cierre' });
    }
  }
  return value;
}

// Esquemas específicos para creación y actualización
const createSchema = Joi.object({
  ...centroDeportivoBaseSchema,
  nombre: Joi.string().required(),
  direccion: Joi.string().required(),
  telefonoPrincipal: Joi.string().required(),
  userId: Joi.string().required()
}).custom(validateHorarioAperturaCierre);

const updateSchema = Joi.object({
  ...centroDeportivoBaseSchema
}).min(1).custom(validateHorarioAperturaCierre).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

// Esquema para validar parámetros de búsqueda por ubicación
const locationSearchSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required()
    .messages({
      'number.base': 'La latitud debe ser un número',
      'number.min': 'La latitud debe estar entre -90 y 90 grados',
      'number.max': 'La latitud debe estar entre -90 y 90 grados',
      'any.required': 'La latitud es requerida'
    }),
  lng: Joi.number().min(-180).max(180).required()
    .messages({
      'number.base': 'La longitud debe ser un número',
      'number.min': 'La longitud debe estar entre -180 y 180 grados',
      'number.max': 'La longitud debe estar entre -180 y 180 grados',
      'any.required': 'La longitud es requerida'
    }),
  radius: Joi.number().min(0.1).max(100).default(5)
    .messages({
      'number.base': 'El radio debe ser un número',
      'number.min': 'El radio mínimo es de 0.1 km',
      'number.max': 'El radio máximo es de 100 km'
    })
});

// Esquema para validar filtros avanzados en GET /centros
const centroDeportivoQuerySchema = Joi.object({
  nombre: Joi.string(),
  direccion: Joi.string(),
  estado: Joi.string().valid('abierto', 'cerrado', 'mantenimiento', 'vacaciones'),
  servicios: Joi.string().custom((value, helpers) => {
    // Validar que todos los servicios en la lista separada por comas sean válidos
    if (!value) return value;
    const serviciosArr = value.split(',');
    for (const s of serviciosArr) {
      if (!SERVICIOS_VALIDOS.includes(s)) {
        return helpers.error('any.invalid');
      }
    }
    return value;
  }, 'Validación de servicios').messages({
    'any.invalid': `Todos los servicios deben ser uno de: ${SERVICIOS_VALIDOS.join(', ')}`
  }),
  userId: Joi.string(),
  cedulaJuridica: Joi.string(),
  horarioApertura: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  horarioCierre: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  abiertoDespuesDe: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  abiertoAntesDe: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/),
  braintreeStatus: Joi.string().valid('activa', 'pendiente', 'rechazada'),
  'ubicacionGPS.lat': Joi.number().min(-90).max(90),
  'ubicacionGPS.lng': Joi.number().min(-180).max(180),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1),
  sort: Joi.string(),
  order: Joi.string().valid('asc', 'desc')
});

/**
 * Middleware para validar centro deportivo según el método HTTP
 */
const validateCentro = (req, res, next) => {
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

/**
 * Middleware para validar parámetros de búsqueda por ubicación
 */
const validateLocationSearch = (req, res, next) => {
  try {
    const { lat, lng, radius } = req.query;
    
    const queryParams = {
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radius: radius ? parseFloat(radius) : undefined
    };
    
    const { error } = locationSearchSchema.validate(queryParams);
    
    if (error) {
      return res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para validar filtros avanzados en GET /centros
 */
const validateCentroQuery = (req, res, next) => {
  try {
    const { error } = centroDeportivoQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: error.message,
        code: 'QUERY_VALIDATION_ERROR'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateCentro,
  validateLocationSearch,
  validateCentroQuery
};