// src/interfaces/validation/userValidation.js
const Joi = require('joi');

/**
 * Esquema de validación para registro de usuarios
 */
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  role: Joi.string().valid('cliente', 'admin_centro', 'super_admin').required(), // Validar roles permitidos
  imagenPerfil: Joi.string().uri().max(500).optional()
    .messages({
      'string.uri': 'La imagen de perfil debe ser una URL válida'
    }),
  canchasFavoritas: Joi.array().items(Joi.string().guid({version: 'uuidv4'})).optional()
    .messages({
      'array.base': 'Las canchas favoritas deben ser un array',
      'string.guid': 'Los IDs de canchas deben ser UUIDs válidos'
    })
});

/**
 * Esquema de validación para actualización de perfil de usuario
 */
const updateSchema = Joi.object({
  name: Joi.string().optional()
    .messages({
      'string.base': 'El nombre debe ser un texto',
      'string.empty': 'El nombre no puede estar vacío'
    }),
  imagenPerfil: Joi.string().uri().max(500).optional()
    .messages({
      'string.uri': 'La imagen de perfil debe ser una URL válida',
      'string.max': 'La URL de la imagen no puede exceder los 500 caracteres'
    }),
  canchasFavoritas: Joi.array().items(Joi.string().guid({version: 'uuidv4'})).optional()
    .messages({
      'array.base': 'Las canchas favoritas deben ser un array',
      'string.guid': 'Los IDs de canchas deben ser UUIDs válidos'
    })
});

/**
 * Validar datos de registro de usuario
 * @param {Object} userData - Datos del usuario a validar
 * @returns {Object} Resultado de la validación
 */
const validateRegistration = (userData) => {
  return registerSchema.validate(userData);
};

/**
 * Validar datos de actualización de perfil
 * @param {Object} userData - Datos del usuario a validar
 * @returns {Object} Resultado de la validación
 */
const validateProfileUpdate = (userData) => {
  return updateSchema.validate(userData);
};

/**
 * Validar campos permitidos para actualización
 * @param {Object} requestBody - Cuerpo de la solicitud
 * @returns {Object} Resultado de la validación con campos inválidos y sugerencias
 */
const validateAllowedFields = (requestBody) => {
  const camposPermitidos = ['name', 'imagenPerfil', 'canchasFavoritas'];
  const camposEnviados = Object.keys(requestBody);
  const camposInvalidos = camposEnviados.filter(campo => !camposPermitidos.includes(campo));
  
  const sugerencias = {};
  
  if (camposInvalidos.length > 0) {
    camposInvalidos.forEach(campoInvalido => {
      if (campoInvalido === 'imagenPerfi' || campoInvalido === 'imagenPerfil') {
        sugerencias[campoInvalido] = 'imagenPerfil';
      } else if (campoInvalido === 'picture' || campoInvalido === 'foto' || campoInvalido === 'imagen') {
        sugerencias[campoInvalido] = 'imagenPerfil';
      } else if (campoInvalido === 'nombre' || campoInvalido === 'fullname') {
        sugerencias[campoInvalido] = 'name';
      } else if (campoInvalido === 'favoritos' || campoInvalido === 'canchasFavorita') {
        sugerencias[campoInvalido] = 'canchasFavoritas';
      }
    });
  }
  
  return {
    isValid: camposInvalidos.length === 0,
    camposInvalidos,
    sugerencias: Object.keys(sugerencias).length > 0 ? sugerencias : undefined,
    camposPermitidos
  };
};

module.exports = {
  registerSchema,
  updateSchema,
  validateRegistration,
  validateProfileUpdate,
  validateAllowedFields
};
