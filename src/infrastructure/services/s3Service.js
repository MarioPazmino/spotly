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
    throw new Error('El archivo excede el tamaño máximo permitido de 5MB.');
  }

  // Validación básica por extensión
  const ext = path.extname(originalName).toLowerCase().substring(1);
  const format = ext === 'jpg' ? 'jpeg' : ext;
  
  // Validar formato permitido
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new Error('Solo se permiten imágenes JPEG, PNG o WEBP.');
  }
  
  // Validación básica de magic numbers para tipos comunes
  if (!isValidMime(buffer, format)) {
    throw new Error('El archivo no corresponde a una imagen válida.');
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
  deleteObject
};
