// src/infrastructure/services/centroDeportivo/centroImageService.js
/**
 * Servicio para la gestión de imágenes de centros deportivos en S3
 * Responsabilidad única: Manejar operaciones específicas de imágenes para centros deportivos
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('../../../utils/logger');

// Configuración de AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Constantes específicas para imágenes de centros deportivos
const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const JPEG_ALIASES = ['jpg', 'jpeg', 'jfif', 'jpe', 'jif', 'jfi']; // Todos los alias comunes para JPEG

/**
 * Valida el tamaño y formato de una imagen de centro deportivo
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @returns {Promise<Object>} Metadata de la imagen validada
 * @throws {Error} Si la validación falla
 */
async function validateCentroImage(buffer, originalName) {
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

  return { format };
}

/**
 * Sube una imagen de centro deportivo a S3
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} centroId - ID del centro deportivo
 * @returns {Promise<string>} key del objeto en S3
 */
async function uploadCentroImage(buffer, originalName, centroId) {
  try {
    // Validar imagen
    const { format } = await validateCentroImage(buffer, originalName);
    
    // Generar nombre único para la imagen
    const uniqueId = uuidv4();
    const key = `centros/${centroId}/${uniqueId}.${format}`;
    
    // Configurar parámetros para S3
    const params = {
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: `image/${format}`,
      ACL: 'private' // Imagen privada, accesible solo con presigned URL
    };
    
    // Subir a S3
    await s3.upload(params).promise();
    logger.info(`Imagen de centro deportivo subida para centro ${centroId}: ${key}`);
    
    return key;
  } catch (error) {
    logger.error(`Error al subir imagen para centro deportivo ${centroId}:`, error);
    throw error;
  }
}

/**
 * Genera una presigned URL para acceder temporalmente a una imagen de centro deportivo
 * @param {string} key - Key del objeto en S3
 * @param {number} [expiresInSeconds] - Tiempo de expiración en segundos
 * @returns {string} Presigned URL
 */
function getCentroImageUrl(key, expiresInSeconds) {
  const expiration = expiresInSeconds || parseInt(process.env.PRESIGNED_URL_EXPIRATION || '3600', 10);
  
  const params = {
    Bucket: BUCKET,
    Key: key,
    Expires: expiration
  };
  
  return s3.getSignedUrl('getObject', params);
}

/**
 * Extrae la key de S3 de una URL presignada
 * @param {string} url - URL presignada de S3
 * @returns {string|null} Key del objeto o null si no se pudo extraer
 */
function extractKeyFromCentroImageUrl(url) {
  if (!url) return null;
  
  try {
    // Si es una URL completa de S3
    if (url.includes(BUCKET)) {
      // Intentar extraer la key de una URL presignada
      const urlObj = new URL(url);
      
      // Si es una URL presignada (tiene parámetros de consulta)
      if (urlObj.search) {
        // La key es el pathname sin la barra inicial
        return urlObj.pathname.substring(1);
      }
      
      // Si es una URL directa de S3 (sin parámetros)
      const bucketPattern = new RegExp(`https?://${BUCKET}[^/]*/(.+)`);
      const match = url.match(bucketPattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Si es solo la key (comienza con 'centros/')
    if (url.startsWith('centros/')) {
      return url;
    }
    
    return null;
  } catch (error) {
    logger.error('Error al extraer key de URL:', error);
    return null;
  }
}

/**
 * Elimina una imagen de centro deportivo de S3
 * @param {string} key - Key del objeto a eliminar
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
async function deleteCentroImage(key) {
  if (!key) return false;
  
  try {
    const params = {
      Bucket: BUCKET,
      Key: key
    };
    
    await s3.deleteObject(params).promise();
    logger.info(`Imagen de centro deportivo eliminada: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Error al eliminar imagen de centro deportivo: ${key}`, error);
    return false;
  }
}

module.exports = {
  uploadCentroImage,
  getCentroImageUrl,
  extractKeyFromCentroImageUrl,
  deleteCentroImage,
  validateCentroImage
};
