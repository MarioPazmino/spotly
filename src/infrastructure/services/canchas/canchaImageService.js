// src/infrastructure/services/canchas/canchaImageService.js
/**
 * Servicio para la gestión de imágenes de canchas en S3
 * Responsabilidad única: Manejar operaciones específicas de imágenes para canchas
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('../../../utils/logger');

// Configuración de AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Constantes específicas para imágenes de canchas
const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const JPEG_ALIASES = ['jpg', 'jpeg', 'jfif', 'jpe', 'jif', 'jfi']; // Todos los alias comunes para JPEG

/**
 * Valida el tamaño y formato de una imagen de cancha
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @returns {Promise<Object>} Metadata de la imagen validada
 * @throws {Error} Si la validación falla
 */
async function validateCanchaImage(buffer, originalName) {
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
 * Sube una imagen de cancha a S3
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} centroId - ID del centro deportivo
 * @param {string} canchaId - ID de la cancha
 * @returns {Promise<string>} key del objeto en S3
 */
async function uploadCanchaImage(buffer, originalName, centroId, canchaId) {
  try {
    // Validar la imagen
    await validateCanchaImage(buffer, originalName);
    
    // Generar nombre único para la imagen
    const ext = path.extname(originalName).toLowerCase();
    const fileName = `${uuidv4()}${ext}`;
    
    // Crear key para S3 (organizando por cancha directamente)
    const key = `canchas/${canchaId}/images/${fileName}`;
    
    // Subir a S3
    await s3.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: `image/${ext.substring(1)}`,
      ACL: 'private' // Importante: imágenes privadas, acceso solo por URL presignada
    }).promise();
    
    logger.info(`Imagen de cancha subida exitosamente a S3: ${key}`);
    return key;
  } catch (error) {
    logger.error(`Error al subir imagen de cancha a S3: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Genera una presigned URL para acceder temporalmente a una imagen de cancha
 * @param {string} key - Key del objeto en S3
 * @param {number} [expiresInSeconds] - Tiempo de expiración en segundos
 * @returns {string} Presigned URL
 */
function getCanchaImageUrl(key, expiresInSeconds = 3600) {
  try {
    // Usar variable de entorno para tiempo de expiración o valor por defecto
    const expiration = parseInt(process.env.PRESIGNED_URL_EXPIRATION || expiresInSeconds, 10);
    
    const url = s3.getSignedUrl('getObject', {
      Bucket: BUCKET,
      Key: key,
      Expires: expiration
    });
    
    return url;
  } catch (error) {
    logger.error(`Error al generar URL presignada para imagen de cancha: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Extrae la key de S3 de una URL presignada
 * @param {string} url - URL presignada de S3
 * @returns {string|null} Key del objeto o null si no se pudo extraer
 */
function extractKeyFromCanchaImageUrl(url) {
  try {
    if (!url || typeof url !== 'string') {
      return null;
    }
    
    // Si ya es una key de S3, devolverla directamente
    if (url.startsWith('canchas/')) {
      return url;
    }
    
    // Extraer key de URL presignada
    const urlObj = new URL(url);
    
    // Verificar que sea una URL de S3
    if (!urlObj.hostname.includes('amazonaws.com')) {
      return null;
    }
    
    // Extraer la key del path o de los parámetros de consulta
    let key = null;
    
    // Método 1: Extraer de path (para URLs de tipo path-style)
    const pathParts = urlObj.pathname.split('/');
    if (pathParts.length > 2) {
      // El primer elemento es vacío, el segundo es el bucket
      key = pathParts.slice(2).join('/');
    }
    
    // Método 2: Extraer de parámetros de consulta (para URLs presignadas)
    if (!key && urlObj.searchParams.has('Key')) {
      key = urlObj.searchParams.get('Key');
    }
    
    return key;
  } catch (error) {
    logger.error(`Error al extraer key de URL de imagen de cancha: ${error.message}`, { error });
    return null;
  }
}

/**
 * Elimina una imagen de cancha de S3
 * @param {string} key - Key del objeto a eliminar
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
async function deleteCanchaImage(key) {
  try {
    // Verificar que la key sea válida
    if (!key || typeof key !== 'string' || !key.startsWith('canchas/')) {
      throw new Error('Key de imagen inválida');
    }
    
    // Eliminar de S3
    await s3.deleteObject({
      Bucket: BUCKET,
      Key: key
    }).promise();
    
    logger.info(`Imagen de cancha eliminada exitosamente de S3: ${key}`);
    return true;
  } catch (error) {
    logger.error(`Error al eliminar imagen de cancha de S3: ${error.message}`, { error });
    throw error;
  }
}

module.exports = {
  uploadCanchaImage,
  getCanchaImageUrl,
  extractKeyFromCanchaImageUrl,
  deleteCanchaImage,
  validateCanchaImage
};
