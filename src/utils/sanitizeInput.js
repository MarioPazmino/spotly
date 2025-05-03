// Funciones de sanitización para prevenir XSS y ataques de inyección
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
 * Sanitiza un objeto recursivamente
 * @param {object} obj
 * @returns {object}
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  } else if (obj && typeof obj === 'object') {
    const clean = {};
    for (const key in obj) {
      clean[key] = sanitizeObject(obj[key]);
    }
    return clean;
  } else if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  return obj;
}

module.exports = { sanitizeString, sanitizeObject };
