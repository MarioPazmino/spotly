// src/infrastructure/services/s3Service.js
const AWS = require('aws-sdk');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// Configuración de AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;

/**
 * Sube una imagen a S3 y retorna la key del objeto (no la URL pública)
 * @param {Buffer} buffer - Buffer del archivo
 * @param {string} originalName - Nombre original del archivo
 * @param {string} centroId - ID del centro deportivo o usuario
 * @returns {Promise<string>} key del objeto en S3
 */
async function uploadImage(buffer, originalName, centroId) {
  const ext = path.extname(originalName).toLowerCase();
  const key = `centros/${centroId}/${uuidv4()}${ext}`;

  // Validar tamaño máximo (ahora 15MB)
  const MAX_SIZE_BYTES = 15 * 1024 * 1024;
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new Error('La imagen excede el tamaño máximo permitido de 15MB.');
  }

  // Validar tipo MIME real usando sharp
  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err) {
    throw new Error('No se pudo procesar la imagen o el archivo no es una imagen válida.');
  }

  // Solo permitir JPEG, PNG y WEBP
  if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new Error('Solo se permiten imágenes JPEG, PNG o WEBP.');
  }

  // Ajustar ContentType según el formato real
  let contentType;
  if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
    contentType = 'image/jpeg';
  } else if (metadata.format === 'png') {
    contentType = 'image/png';
  } else if (metadata.format === 'webp') {
    contentType = 'image/webp';
  }

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  };

  await s3.putObject(params).promise();
  return key;
}

/**
 * Genera una presigned URL para acceder temporalmente a un objeto privado
 * @param {string} key - Key del objeto en S3
 * @param {number} expiresInSeconds - Tiempo de expiración en segundos (por defecto 1h)
 * @returns {string} Presigned URL
 */
function getPresignedUrl(key, expiresInSeconds = 3600) {
  const params = {
    Bucket: BUCKET,
    Key: key,
    Expires: expiresInSeconds,
  };
  return s3.getSignedUrl('getObject', params);
}

module.exports = {
  uploadImage,
  getPresignedUrl,
};
