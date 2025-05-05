// src/utils/sanitizeInput.js
const xss = require('xss');

/**
 * Sanitiza un string para prevenir XSS
 * @param {string} str
 * @returns {string}
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return xss(str.trim());
}

/**
 * Sanitiza el campo descripcion: elimina XSS, recorta a 500 caracteres y limpia espacios
 * @param {string} str
 * @returns {string}
 */
function sanitizeDescripcion(str) {
  if (typeof str !== 'string') return str;
  // Limitar longitud máxima a 500 caracteres
  let clean = str.trim().slice(0, 500);
  // Sanitizar contra XSS
  clean = xss(clean);
  return clean;
}

/**
 * Sanitiza un objeto recursivamente, aplicando reglas especiales a ciertos campos
 * @param {object} obj
 * @returns {object}
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj && typeof obj === 'object') {
    const clean = {};
    for (const key in obj) {
      if (key === 'descripcion' || key === 'notas') {
        clean[key] = sanitizeDescripcion(obj[key]);
      } else {
        clean[key] = sanitizeObject(obj[key]);
      }
    }
    return clean;
  } else if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  return obj;
}

module.exports = { sanitizeString, sanitizeObject, sanitizeDescripcion };
