// src/utils/sanitizeInput.js
const { v4: uuidv4 } = require('uuid');

/**
 * Sanitiza un texto eliminando caracteres potencialmente peligrosos
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
function sanitizeText(text) {
  if (!text) return text;
  return text
    .trim()
    .replace(/[<>]/g, '') // Eliminar caracteres < y >
    .replace(/javascript:/gi, '') // Eliminar javascript: protocol
    .replace(/on\w+=/gi, '') // Eliminar atributos on* (onclick, onload, etc)
    .replace(/data:/gi, '') // Eliminar data: protocol
    .replace(/vbscript:/gi, '') // Eliminar vbscript: protocol
    .replace(/&/g, '&amp;') // Convertir & a entidad HTML
    .replace(/"/g, '&quot;') // Convertir " a entidad HTML
    .replace(/'/g, '&#x27;') // Convertir ' a entidad HTML
    .replace(/\//g, '&#x2F;'); // Convertir / a entidad HTML
}

/**
 * Sanitiza un ID asegurando que sea un UUID válido
 * @param {string} id - ID a sanitizar
 * @returns {string} ID sanitizado o nuevo UUID si no es válido
 */
const sanitizeId = (id) => {
  if (!id) return uuidv4();
  const sanitized = sanitizeText(id);
  // Validar formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sanitized) ? sanitized : uuidv4();
};

/**
 * Sanitiza un email asegurando que tenga un formato válido
 * @param {string} email - Email a sanitizar
 * @returns {string} Email sanitizado
 */
const sanitizeEmail = (email) => {
  if (!email) return '';
  const sanitized = sanitizeText(email).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized) ? sanitized : '';
};

/**
 * Sanitiza un número asegurando que esté dentro de un rango
 * @param {number} num - Número a sanitizar
 * @param {number} min - Valor mínimo permitido
 * @param {number} max - Valor máximo permitido
 * @returns {number} Número sanitizado
 */
const sanitizeNumber = (num, min = 0, max = 100) => {
  const parsed = Number(num);
  if (isNaN(parsed)) return min;
  return Math.min(Math.max(parsed, min), max);
};

/**
 * Sanitiza una fecha asegurando que sea una fecha válida
 * @param {string|Date} date - Fecha a sanitizar
 * @returns {string} Fecha en formato ISO o fecha actual si no es válida
 */
const sanitizeDate = (date) => {
  if (!date) return new Date().toISOString();
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

/**
 * Sanitiza un objeto de reseña
 * @param {Object} resena - Objeto de reseña a sanitizar
 * @returns {Object} Objeto sanitizado
 */
function sanitizeResena(resena) {
  if (!resena) return resena;
  const sanitized = { ...resena };
  
  // Sanitizar campos de texto
  if (sanitized.comentario) {
    sanitized.comentario = sanitizeText(sanitized.comentario);
  }
  if (sanitized.resenaId) {
    sanitized.resenaId = sanitizeText(sanitized.resenaId);
  }
  if (sanitized.userId) {
    sanitized.userId = sanitizeText(sanitized.userId);
  }
  if (sanitized.canchaId) {
    sanitized.canchaId = sanitizeText(sanitized.canchaId);
  }
  if (sanitized.centroId) {
    sanitized.centroId = sanitizeText(sanitized.centroId);
  }
  if (sanitized.fecha) {
    sanitized.fecha = sanitizeText(sanitized.fecha);
  }
  if (sanitized.createdAt) {
    sanitized.createdAt = sanitizeText(sanitized.createdAt);
  }
  if (sanitized.updatedAt) {
    sanitized.updatedAt = sanitizeText(sanitized.updatedAt);
  }

  return sanitized;
}

/**
 * Sanitiza un objeto de usuario
 * @param {Object} usuario - Objeto de usuario a sanitizar
 * @returns {Object} Objeto de usuario sanitizado
 */
const sanitizeUsuario = (usuario) => {
  if (!usuario) return null;
  
  // Validar registrationSource
  const validSources = ['web', 'mobile', 'cognito', 'google', 'facebook'];
  const registrationSource = usuario.registrationSource || usuario.registration_source;
  const sanitizedSource = validSources.includes(registrationSource) 
    ? registrationSource 
    : 'cognito';
  
  return {
    id: sanitizeId(usuario.id),
    email: sanitizeEmail(usuario.email),
    nombre: sanitizeText(usuario.nombre),
    apellido: sanitizeText(usuario.apellido),
    telefono: sanitizeText(usuario.telefono),
    role: sanitizeText(usuario.role),
    registrationSource: sanitizedSource,
    pendiente_aprobacion: sanitizeText(usuario.pendiente_aprobacion),
    picture: sanitizeText(usuario.picture)
  };
};

/**
 * Sanitiza un objeto de cancha
 * @param {Object} cancha - Objeto de cancha a sanitizar
 * @returns {Object} Objeto de cancha sanitizado
 */
const sanitizeCancha = (cancha) => {
  if (!cancha) return null;
  
  return {
    id: sanitizeId(cancha.id),
    centroDeportivoId: sanitizeId(cancha.centroDeportivoId),
    nombre: sanitizeText(cancha.nombre),
    descripcion: sanitizeText(cancha.descripcion),
    tipo: sanitizeText(cancha.tipo),
    precio: sanitizeNumber(cancha.precio, 0),
    capacidad: sanitizeNumber(cancha.capacidad, 1),
    imagen: sanitizeText(cancha.imagen)
  };
};

/**
 * Sanitiza una URL de imagen asegurando que sea una URL válida
 * @param {string} url - URL de la imagen a sanitizar
 * @returns {string} URL sanitizada o cadena vacía si no es válida
 */
const sanitizeImageUrl = (url) => {
  if (!url) return '';
  
  try {
    // Validar que sea una URL válida
    const parsedUrl = new URL(url);
    
    // Verificar que sea una URL de Amazon S3 o CloudFront
    const isS3Url = parsedUrl.hostname.includes('amazonaws.com') || 
                    parsedUrl.hostname.includes('cloudfront.net') || 
                    parsedUrl.hostname.includes('spotly');
    
    if (!isS3Url) {
      console.log(`URL rechazada: ${url} - No es una URL de S3 válida`);
      return '';
    }
    
    // Verificar que la extensión sea de imagen común permitida
    // Extraer la extensión del path o del query param X-Amz-SignedHeaders si existe
    let extension = '';
    
    // Intentar obtener la extensión del path
    const pathParts = parsedUrl.pathname.split('.');
    if (pathParts.length > 1) {
      extension = pathParts.pop().toLowerCase();
    }
    
    // Si no hay extensión en el path, verificar si es una URL firmada de S3
    // Las URLs firmadas pueden no tener extensión visible en el path
    if (!extension && parsedUrl.searchParams.has('X-Amz-SignedHeaders')) {
      // Para URLs firmadas de S3, aceptamos sin verificar extensión
      return url;
    }
    
    // Lista ampliada de extensiones válidas
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'jfif', 'jpe', 'jif', 'jfi'];
    
    // Si tenemos una extensión, verificar que sea válida
    if (extension && !validExtensions.includes(extension)) {
      console.log(`URL rechazada: ${url} - Extensión no válida: ${extension}`);
      return '';
    }
    
    // Si llegamos aquí, la URL es válida
    return url;
  } catch (error) {
    console.log(`Error al validar URL: ${url} - ${error.message}`);
    return '';
  }
};

/**
 * Sanitiza un objeto de centro deportivo
 * @param {Object} centro - Objeto de centro deportivo a sanitizar
 * @returns {Object} Objeto de centro deportivo sanitizado
 */
const sanitizeCentroDeportivo = (centro) => {
  if (!centro) return null;
  
  return {
    id: sanitizeId(centro.id),
    userId: sanitizeId(centro.userId),
    nombre: sanitizeText(centro.nombre),
    descripcion: sanitizeText(centro.descripcion),
    direccion: sanitizeText(centro.direccion),
    telefono: sanitizeText(centro.telefono),
    email: sanitizeEmail(centro.email),
    cedulaJuridica: sanitizeText(centro.cedulaJuridica),
    horaApertura: sanitizeText(centro.horaApertura),
    horaCierre: sanitizeText(centro.horaCierre),
    imagen: sanitizeImageUrl(centro.imagen)
  };
};

/**
 * Sanitiza un objeto genérico recursivamente
 * @param {Object} obj - Objeto a sanitizar
 * @returns {Object} Objeto sanitizado
 */
function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Si es un array, sanitizar cada elemento
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Si es un objeto, sanitizar cada propiedad
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitizar valores según su tipo
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value; // Mantener valores numéricos, booleanos, etc.
    }
  }
  
  return sanitized;
}

module.exports = {
  sanitizeText,
  sanitizeId,
  sanitizeEmail,
  sanitizeNumber,
  sanitizeDate,
  sanitizeResena,
  sanitizeObject,
  sanitizeUsuario,
  sanitizeCancha,
  sanitizeCentroDeportivo,
  sanitizeImageUrl
};
