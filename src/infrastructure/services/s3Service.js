// src/infrastructure/services/s3Service.js
const AWS = require('aws-sdk');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
// No usamos sharp para evitar problemas de compatibilidad con Lambda

// Configuración de AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;

// Constantes de validación
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const JPEG_ALIASES = ['jpg', 'jpeg', 'jfif', 'jpe', 'jif', 'jfi']; // Todos los alias comunes para JPEG
const MIME_TYPES = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
};

/**
 * Valida el tamaño y formato de una imagen
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @returns {Promise<Object>} Metadata de la imagen validada
 * @throws {Error} Si la validación falla
 */
async function validateImage(buffer, originalName) {
  // Validar tamaño máximo
  if (buffer.length > MAX_SIZE_BYTES) {
    const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new Error(`La imagen es demasiado grande (${sizeMB}MB). El tamaño máximo permitido es de 5MB. Por favor, comprime la imagen e intenta nuevamente.`);
  }

  // Validación básica por extensión
  const ext = path.extname(originalName).toLowerCase().substring(1);
  let format = ext;
  
  // Convertir todos los formatos JPEG a 'jpeg' para estandarizar
  if (JPEG_ALIASES.includes(ext)) {
    format = 'jpeg';
  }
  
  // Validar formato permitido
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new Error(`Formato de imagen no válido: ${ext}. Solo se permiten imágenes en formato JPEG (.jpg, .jpeg), PNG (.png) o WEBP (.webp). Por favor, convierte tu imagen a uno de estos formatos e intenta nuevamente.`);
  }
  
  // Validación básica de magic numbers para tipos comunes
  if (!isValidMime(buffer, format)) {
    throw new Error(`El archivo no corresponde a una imagen válida de formato ${format.toUpperCase()}. El archivo podría estar corrupto o tener una extensión incorrecta. Por favor, verifica que la imagen sea válida e intenta nuevamente.`);
  }
  
  // Devolver metadata simulada para compatibilidad
  return {
    format: format,
    width: 800,  // valores simulados
    height: 600
  };
}

/**
 * Valida el MIME type real del buffer usando magic numbers
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} format - Formato detectado
 * @returns {boolean} true si el MIME type es válido
 */
function isValidMime(buffer, format) {
    // JPEG: FF D8 FF
    if (format === 'jpeg' && buffer.slice(0, 3).toString('hex') === 'ffd8ff') return true;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (format === 'png' && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') return true;
    // WEBP: RIFF....WEBP
    if (format === 'webp' && buffer.slice(8, 12).toString() === 'WEBP') return true;
    return false;
  }

/**
 * Sube una imagen a S3 y retorna la key del objeto
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} centroId - ID del centro deportivo o usuario
 * @returns {Promise<string>} key del objeto en S3
 */
async function uploadImage(buffer, originalName, centroId) {
  const metadata = await validateImage(buffer, originalName);
  const ext = path.extname(originalName).toLowerCase();
  const key = `centros/${centroId}/${uuidv4()}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: MIME_TYPES[metadata.format],
  };

  await s3.putObject(params).promise();
  return key;
}

/**
 * Sube una imagen de cancha a S3
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} centroId - ID del centro deportivo
 * @param {string} canchaId - ID de la cancha
 * @returns {Promise<string>} key del objeto en S3
 */
async function uploadCanchaImage(buffer, originalName, centroId, canchaId) {
  const metadata = await validateImage(buffer, originalName);
  const ext = path.extname(originalName).toLowerCase();
  const key = `canchas/${centroId}/${canchaId}/${uuidv4()}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: MIME_TYPES[metadata.format],
  };

  await s3.putObject(params).promise();
  return key;
}

/**
 * Sube un comprobante de transferencia a S3
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} pagoId - ID del pago
 * @returns {Promise<string>} key del objeto en S3
 */
async function uploadComprobanteTransferencia(buffer, originalName, pagoId) {
  const metadata = await validateImage(buffer, originalName);
  const ext = path.extname(originalName).toLowerCase();
  const key = `comprobantes/${pagoId}/${uuidv4()}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: MIME_TYPES[metadata.format],
  };

  await s3.putObject(params).promise();
  return key;
}

/**
 * Elimina un objeto de S3 usando su key
 * @param {string} key - Key del objeto a eliminar
 * @returns {Promise<boolean>} true si se eliminó correctamente, false si hubo un error
 */
async function deleteS3Object(key) {
  if (!key) return false;
  
  try {
    const params = {
      Bucket: BUCKET,
      Key: key
    };
    
    await s3.deleteObject(params).promise();
    console.log(`Objeto eliminado correctamente: ${key}`);
    return true;
  } catch (error) {
    console.error(`Error al eliminar objeto ${key}:`, error);
    return false;
  }
}

/**
 * Extrae la key de S3 de una URL presignada
 * @param {string} url - URL presignada de S3
 * @returns {string|null} Key del objeto o null si no se pudo extraer
 */
function extractKeyFromUrl(url) {
  if (!url) return null;
  
  try {
    const parsedUrl = new URL(url);
    
    // Verificar si es una URL de S3 o CloudFront
    if (!parsedUrl.hostname.includes('amazonaws.com') && 
        !parsedUrl.hostname.includes('cloudfront.net') && 
        !parsedUrl.hostname.includes('spotly')) {
      return null;
    }
    
    // Extraer la key del path
    // El formato típico es: https://bucket.s3.region.amazonaws.com/key
    // o https://bucket.s3.region.amazonaws.com/key?params para URLs firmadas
    let key = parsedUrl.pathname.slice(1); // Remover el slash inicial
    
    // Si es una URL firmada, puede tener parámetros que debemos ignorar
    if (key.includes('?')) {
      key = key.split('?')[0];
    }
    
    return key;
  } catch (error) {
    console.error(`Error al extraer key de URL ${url}:`, error);
    return null;
  }
}

/**
 * Sube una imagen de perfil de usuario a S3
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} userId - ID del usuario
 * @returns {Promise<string>} key del objeto en S3
 */
async function uploadUserProfileImage(buffer, originalName, userId) {
  const metadata = await validateImage(buffer, originalName);
  const ext = path.extname(originalName).toLowerCase();
  const key = `usuarios/${userId}/${uuidv4()}${ext}`;

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: MIME_TYPES[metadata.format],
  };

  await s3.putObject(params).promise();
  return key;
}

/**
 * Genera una presigned URL para acceder temporalmente a un objeto privado
 * @param {string} key - Key del objeto en S3
 * @param {number} [expiresInSeconds] - Tiempo de expiración en segundos (opcional, si no se pasa se toma de ENV o 1h)
 * @returns {string} Presigned URL
 */
function getPresignedUrl(key, expiresInSeconds) {
  // Usar variable de entorno si no se pasa el parámetro
  let expiration = expiresInSeconds;
  if (typeof expiration !== 'number' || isNaN(expiration)) {
    expiration = parseInt(process.env.PRESIGNED_URL_EXPIRATION_SECONDS, 10);
    if (isNaN(expiration) || expiration <= 0) {
      expiration = 3600; // 1 hora por defecto
    }
  }
  const params = {
    Bucket: BUCKET,
    Key: key,
    Expires: expiration,
  };
  return s3.getSignedUrl('getObject', params);
}

/**
 * Elimina un objeto de S3
 * @param {string} key - Key del objeto en S3
 * @returns {Promise<void>}
 */
async function deleteObject(key) {
  const params = {
    Bucket: BUCKET,
    Key: key,
  };
  await s3.deleteObject(params).promise();
}

module.exports = {
  uploadImage,
  uploadCanchaImage,
  uploadComprobanteTransferencia,
  uploadUserProfileImage,
  getPresignedUrl,
  deleteS3Object,
  extractKeyFromUrl
};
