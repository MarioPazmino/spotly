// src/interfaces/middlewares/validateCentroDeportivo.js
const Joi = require('joi');
const Boom = require('@hapi/boom');

// Servicios válidos predefinidos
const SERVICIOS_VALIDOS = [
  // Deportes
  "futbol", 
  "natación", 
  "gimnasio", 
  "tenis", 
  "baloncesto", 
  "voleibol", 
  "padel", 
  "squash", 
  "yoga", 
  "pilates",
  "crossfit",
  "spinning",
  
  // Bienestar
  "sauna",
  "spa",
  "masajes",
  
  // Comodidades
  "estacionamiento",
  "wifi",
  "cafetería",
  "vestuarios",
  "duchas",
  "casilleros",
  "tienda"
];
const REDES_VALIDAS = ["facebook", "instagram", "twitter"];

// Esquema base con todos los campos posibles del centro deportivo
const centroDeportivoBaseSchema = Joi.object({
  nombre: Joi.string().required().min(3).max(100),
  direccion: Joi.string().required().min(5).max(200),
  telefonoPrincipal: Joi.string().pattern(/^[+][1-9]\d{7,14}$/).required()
    .messages({
      'string.pattern.base': 'El teléfono principal debe estar en formato internacional E.164 (ej: +593989508266)'
    }),
  telefonoSecundario: Joi.string().allow(null, '').pattern(/^[+][1-9]\d{7,14}$/)
    .messages({
      'string.pattern.base': 'El teléfono secundario debe estar en formato internacional E.164 (ej: +593989508266)'
    }),
  email: Joi.string().email(),
  descripcion: Joi.string().max(500),
  userId: Joi.string(),
  // --- HORARIO FLEXIBLE POR DÍA ---
  horario: Joi.array().items(
    Joi.object({
      dia: Joi.string().valid('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo').required(),
      abre: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      cierra: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    }).custom((value, helpers) => {
      // Convertir horas a minutos para comparación
      const convertToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };

      const abreMinutos = convertToMinutes(value.abre);
      const cierraMinutos = convertToMinutes(value.cierra);
      
      // Caso especial: 00:00 como hora de cierre se considera como fin del día (24:00)
      const cierraMinutosAjustado = value.cierra === '00:00' ? 24 * 60 : cierraMinutos;
      
      // Verificar que la hora de apertura sea anterior a la hora de cierre
      if (abreMinutos >= cierraMinutosAjustado) {
        return helpers.message({
          custom: `Para el día ${value.dia}, la hora de apertura (${value.abre}) debe ser anterior a la hora de cierre (${value.cierra})`
        });
      }
      
      return value;
    })
  ),
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
  imagenes: Joi.array().max(3).items(Joi.string().uri()),
  servicios: Joi.array().items(Joi.string().valid(...SERVICIOS_VALIDOS))
    .messages({
      'any.only': `El servicio debe ser uno de: ${SERVICIOS_VALIDOS.join(', ')}`
    }).unique(),
  estado: Joi.string().valid('abierto', 'cerrado', 'mantenimiento', 'vacaciones'),
  bancos: Joi.array()
    .max(3)
    .unique((a, b) => a.cuenta === b.cuenta)
    .items(
      Joi.object({
        banco: Joi.string().required()
          .messages({
            'any.required': 'El campo "banco" es obligatorio (no se permite "nombre")'
          }),
        titular: Joi.string().required()
          .messages({
            'any.required': 'El campo "titular" es obligatorio (no se permite "tipoCuenta")'
          }),
        cuenta: Joi.string().pattern(/^\d{10,20}$/).required()
          .messages({
            'string.pattern.base': 'La cuenta bancaria debe tener entre 10 y 20 dígitos numéricos',
            'any.required': 'El campo "cuenta" es obligatorio (no se permite "numeroCuenta")'
          })
      }).unknown(false) // No permitir campos adicionales o con nombres incorrectos
        .messages({
          'object.unknown': 'Campo no permitido en bancos. Solo se permiten: "banco", "titular" y "cuenta"'
        })
    )
    .default([]),
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
});

// Esquemas específicos para creación y actualización
const createSchema = Joi.object({
  // Campos obligatorios
  nombre: Joi.string().required().min(3).max(100)
    .messages({
      'string.empty': 'El nombre del centro deportivo es obligatorio',
      'string.min': 'El nombre debe tener al menos 3 caracteres',
      'string.max': 'El nombre no puede exceder los 100 caracteres',
      'any.required': 'El nombre del centro deportivo es obligatorio'
    }),
  direccion: Joi.string().required().min(5).max(200)
    .messages({
      'string.empty': 'La dirección del centro deportivo es obligatoria',
      'string.min': 'La dirección debe tener al menos 5 caracteres',
      'string.max': 'La dirección no puede exceder los 200 caracteres',
      'any.required': 'La dirección del centro deportivo es obligatoria'
    }),
  telefonoPrincipal: Joi.string().pattern(/^[+][1-9]\d{7,14}$/).required()
    .messages({
      'string.empty': 'El teléfono principal es obligatorio',
      'string.pattern.base': 'El teléfono principal debe estar en formato internacional E.164 (ej: +593989508266)',
      'any.required': 'El teléfono principal es obligatorio'
    }),
  telefonoSecundario: Joi.string().allow(null, '').pattern(/^[+][1-9]\d{7,14}$/)
    .messages({
      'string.pattern.base': 'El teléfono secundario debe estar en formato internacional E.164 (ej: +593989508266)'
    }),
  email: Joi.string().email().allow(null, '')
    .messages({
      'string.email': 'El formato del email no es válido'
    }),
  descripcion: Joi.string().max(500).allow(null, '')
    .messages({
      'string.max': 'La descripción no puede exceder los 500 caracteres'
    }),
  userId: Joi.string().required()
    .messages({
      'any.required': 'El ID del usuario administrador es obligatorio'
    }),
  horario: Joi.array().items(
    Joi.object({
      dia: Joi.string().valid('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo').required()
        .messages({
          'any.only': 'El día debe ser uno de: lunes, martes, miercoles, jueves, viernes, sabado, domingo',
          'any.required': 'El día de la semana es obligatorio'
        }),
      abre: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        .messages({
          'string.pattern.base': 'La hora de apertura debe tener formato HH:MM (00:00 a 23:59)',
          'any.required': 'La hora de apertura es obligatoria'
        }),
      cierra: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
        .messages({
          'string.pattern.base': 'La hora de cierre debe tener formato HH:MM (00:00 a 23:59)',
          'any.required': 'La hora de cierre es obligatoria'
        })
    })
  ).messages({
    'array.base': 'El horario debe ser un array con los días de la semana'
  }),
  ubicacionGPS: Joi.object({
    lat: Joi.number().min(-90).max(90).required()
      .messages({
        'number.base': 'La latitud debe ser un número',
        'number.min': 'La latitud debe estar entre -90 y 90 grados',
        'number.max': 'La latitud debe estar entre -90 y 90 grados',
        'any.required': 'La latitud es obligatoria'
      }),
    lng: Joi.number().min(-180).max(180).required()
      .messages({
        'number.base': 'La longitud debe ser un número',
        'number.min': 'La longitud debe estar entre -180 y 180 grados',
        'number.max': 'La longitud debe estar entre -180 y 180 grados',
        'any.required': 'La longitud es obligatoria'
      })
  }).messages({
    'object.base': 'La ubicación GPS debe ser un objeto con latitud y longitud',
    'any.required': 'La ubicación GPS es obligatoria'
  }),
  servicios: Joi.array().items(Joi.string())
    .messages({
      'array.base': 'Los servicios deben ser un array'
    }),
  estado: Joi.string().valid('abierto', 'cerrado', 'mantenimiento', 'vacaciones')
    .messages({
      'any.only': 'El estado debe ser uno de: abierto, cerrado, mantenimiento, vacaciones'
    }),
  
  // Campos adicionales que deben ser soportados
  centroId: Joi.string().allow(null),
  imagenes: Joi.array().items(Joi.string()).default([]),
  horaAperturaMinima: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  horaCierreMaxima: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).allow(null),
  bancos: Joi.array().items(
    Joi.object({
      banco: Joi.string().required()
        .messages({
          'any.required': 'El campo "banco" es obligatorio (posiblemente estás usando "nombre" en su lugar)'
        }),
      titular: Joi.string().required()
        .messages({
          'any.required': 'El campo "titular" es obligatorio (posiblemente estás usando "tipoCuenta" en su lugar)'
        }),
      cuenta: Joi.string().pattern(/^\d{10,20}$/).required()
        .messages({
          'string.pattern.base': 'La cuenta bancaria debe tener entre 10 y 20 dígitos numéricos',
          'any.required': 'El campo "cuenta" es obligatorio (posiblemente estás usando "numeroCuenta" en su lugar)'
        })
    }).unknown(false)
      .messages({
        'object.unknown': 'Campo no permitido en bancos. Los campos correctos son: "banco", "titular" y "cuenta"'
      })
  ).default([]),
  cedulaJuridica: Joi.string().pattern(/^\d{13}$/).allow(null)
    .messages({
      'string.pattern.base': 'La cédula jurídica (RUC) debe tener exactamente 13 dígitos numéricos (Ecuador)'
    }),
  braintreeMerchantId: Joi.string().allow(null),
  braintreeStatus: Joi.string().valid('activa', 'pendiente', 'rechazada').default('pendiente'),
  redesSociales: Joi.object().default({}),
  createdAt: Joi.string().isoDate().allow(null),
  updatedAt: Joi.string().isoDate().allow(null)
}).unknown(false); // NO permitir campos adicionales no definidos explícitamente

const updateSchema = Joi.object({
  nombre: Joi.string().min(3).max(100),
  direccion: Joi.string().min(5).max(200),
  telefonoPrincipal: Joi.string().pattern(/^[+][1-9]\d{7,14}$/),
  telefonoSecundario: Joi.string().allow(null, '').pattern(/^[+][1-9]\d{7,14}$/),
  email: Joi.string().email(),
  descripcion: Joi.string().max(500),
  horario: Joi.array().items(
    Joi.object({
      dia: Joi.string().valid('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo').required(),
      abre: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      cierra: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required()
    })
  ),
  ubicacionGPS: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }),
  servicios: Joi.array().items(Joi.string().valid(...SERVICIOS_VALIDOS)),
  estado: Joi.string().valid('abierto', 'cerrado', 'mantenimiento', 'vacaciones'),
  
  // Campos adicionales que también deben poder actualizarse
  bancos: Joi.array().items(
    Joi.object({
      banco: Joi.string().required()
        .messages({
          'any.required': 'El campo "banco" es obligatorio (posiblemente estás usando "nombre" en su lugar)'
        }),
      titular: Joi.string().required()
        .messages({
          'any.required': 'El campo "titular" es obligatorio (posiblemente estás usando "tipoCuenta" en su lugar)'
        }),
      cuenta: Joi.string().pattern(/^\d{5,20}$/).required()
        .messages({
          'string.pattern.base': 'La cuenta bancaria debe tener entre 5 y 20 dígitos numéricos',
          'any.required': 'El campo "cuenta" es obligatorio (posiblemente estás usando "numeroCuenta" en su lugar)'
        })
    }).unknown(false)
      .messages({
        'object.unknown': 'Campo no permitido en bancos. Los campos correctos son: "banco", "titular" y "cuenta"'
      })
  ),
  cedulaJuridica: Joi.string().pattern(/^\d{13}$/).allow(null, '')
    .messages({
      'string.pattern.base': 'La cédula jurídica (RUC) debe tener exactamente 13 dígitos numéricos (Ecuador)'
    }),
  redesSociales: Joi.object().default({})
}).min(1).unknown(false).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar',
  'object.unknown': 'Campo no permitido. Verifique que todos los campos sean válidos.'
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
// Solo permitimos campos indexados para evitar escaneos completos de la tabla
const centroDeportivoQuerySchema = Joi.object({
  // Campos indexados permitidos
  userId: Joi.string(),
  estado: Joi.string().valid('abierto', 'cerrado', 'mantenimiento', 'vacaciones'),
  nombre: Joi.string(),
  // Campos para filtrar por horario
  abiertoDespuesDe: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  abiertoAntesDe: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  
  // Parámetros de paginación y ordenamiento
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  lastEvaluatedKey: Joi.string(),
  sort: Joi.string().valid('nombre', 'createdAt').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc')
}).messages({
  'any.invalid': 'Valor inválido para el filtro',
  'string.pattern.base': 'El formato de hora debe ser HH:MM (00:00 a 23:59)'
});

/**
 * Middleware para validar centro deportivo según el método HTTP
 */
const validateCentro = (req, res, next) => {
  try {
    const { error } = createSchema.validate(req.body, { abortEarly: false });
    if (error) {
      // Crear un objeto de respuesta de error estructurado
      const errorResponse = {
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Error en la validación del centro deportivo',
        details: {}
      };
      
      // Agrupar errores por campo para una mejor presentación
      error.details.forEach(detail => {
        // Manejar campos anidados como bancos[0].nombre
        let field = detail.path[0] || 'general';
        const index = detail.path[1]; // Para arrays como bancos[0]
        
        if (detail.path.length > 1) {
          if (field === 'bancos') {
            // Para bancos, mostrar un mensaje más claro
            field = 'bancos';
            
            // Personalizar mensajes para problemas comunes con bancos
            if (detail.message.includes('pattern')) {
              detail.message = `La cuenta bancaria en la posición ${index} debe tener entre 5 y 20 dígitos numéricos`;
            } else if (detail.message.includes('unknown')) {
              detail.message = `Campo no permitido en banco ${index}. Usa "banco", "titular" y "cuenta" en lugar de "nombre", "tipoCuenta" o "numeroCuenta"`;
            } else if (detail.message.includes('required')) {
              // Identificar qué campo falta
              const missingField = detail.path[detail.path.length - 1];
              detail.message = `El campo "${missingField}" es obligatorio en el banco ${index}`;
            }
          } else {
            // Para otros campos anidados, mostrar la ruta completa
            field = detail.path.join('.');
          }
        }
        
        if (!errorResponse.details[field]) {
          errorResponse.details[field] = [];
        }
        
        errorResponse.details[field].push(detail.message);
      });
      
      // Eliminar duplicados en cada campo
      for (const field in errorResponse.details) {
        errorResponse.details[field] = [...new Set(errorResponse.details[field])];
      }
      
      // Crear un mensaje de error más legible para la consola
      const formattedErrors = [];
      for (const field in errorResponse.details) {
        formattedErrors.push(`${field}: ${errorResponse.details[field].join(' | ')}`);
      }
      
      const errorMessage = formattedErrors.join('\n');
      console.log('Error de validación:', errorMessage);
      
      // Devolver un error HTTP 400 con detalles estructurados
      return res.status(400).json(errorResponse);
    }
    next();
  } catch (err) {
    console.error('Error inesperado en la validación:', err);
    return next(Boom.badImplementation('Error interno en la validación'));
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

const validateImagenes = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(Boom.badRequest('No se proporcionaron archivos'));
  }

  if (req.files.length > 3) {
    return next(Boom.badRequest('Máximo 3 imágenes permitidas'));
  }

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
  const archivoInvalido = req.files.find(file => !tiposPermitidos.includes(file.mimetype));
  if (archivoInvalido) {
    return next(Boom.badRequest('Solo se permiten imágenes JPEG, PNG y WebP'));
  }

  next();
};

/**
 * Middleware para validar actualización de centro deportivo
 */
const validateUpdateCentro = (req, res, next) => {
  try {
    const { error } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      // Crear un objeto de respuesta de error estructurado
      const errorResponse = {
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'Error en la validación del centro deportivo',
        details: {}
      };
      
      // Agrupar errores por campo para una mejor presentación
      error.details.forEach(detail => {
        // Manejar campos anidados como bancos[0].nombre
        let field = detail.path[0] || 'general';
        const index = detail.path[1]; // Para arrays como bancos[0]
        
        if (detail.path.length > 1) {
          if (field === 'bancos') {
            // Para bancos, mostrar un mensaje más claro
            field = 'bancos';
            
            // Personalizar mensajes para problemas comunes con bancos
            if (detail.message.includes('pattern')) {
              detail.message = `La cuenta bancaria en la posición ${index} debe tener entre 5 y 20 dígitos numéricos`;
            } else if (detail.message.includes('unknown')) {
              detail.message = `Campo no permitido en banco ${index}. Usa "banco", "titular" y "cuenta" en lugar de "nombre", "tipoCuenta" o "numeroCuenta"`;
            } else if (detail.message.includes('required')) {
              // Identificar qué campo falta
              const missingField = detail.path[detail.path.length - 1];
              detail.message = `El campo "${missingField}" es obligatorio en el banco ${index}`;
            }
          } else {
            // Para otros campos anidados, mostrar la ruta completa
            field = detail.path.join('.');
          }
        }
        
        if (!errorResponse.details[field]) {
          errorResponse.details[field] = [];
        }
        
        errorResponse.details[field].push(detail.message);
      });
      
      // Eliminar duplicados en cada campo
      for (const field in errorResponse.details) {
        errorResponse.details[field] = [...new Set(errorResponse.details[field])];
      }
      
      // Crear un mensaje de error más legible para la consola
      const formattedErrors = [];
      for (const field in errorResponse.details) {
        formattedErrors.push(`${field}: ${errorResponse.details[field].join(' | ')}`);
      }
      
      const errorMessage = formattedErrors.join('\n');
      console.log('Error de validación en actualización:', errorMessage);
      
      // Devolver un error HTTP 400 con detalles estructurados
      return res.status(400).json(errorResponse);
    }
    next();
  } catch (err) {
    console.error('Error inesperado en la validación de actualización:', err);
    return next(Boom.badImplementation('Error interno en la validación'));
  }
};

module.exports = {
  validateCentro,
  validateUpdateCentro,
  validateLocationSearch,
  validateCentroQuery,
  validateImagenes
};