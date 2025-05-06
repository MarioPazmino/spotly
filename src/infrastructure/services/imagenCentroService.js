const { uploadImage, getPresignedUrl, deleteObject } = require('./s3Service');
const centroDeportivoService = require('./centroDeportivoService');
const AWS = require('aws-sdk');
const Boom = require('@hapi/boom');

class ImagenCentroService {
  constructor() {
    this.MAX_IMAGENES = 3;
    this.s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
    this.BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
  }

  async agregarImagenes(centroId, archivos) {
    // 1. Obtener centro actual
    const centro = await centroDeportivoService.getCentroById(centroId);
    if (!centro) {
      throw new Error('Centro deportivo no encontrado');
    }

    // 2. Procesar nuevas imágenes
    const nuevasImagenes = [];
    for (const file of archivos) {
      const key = await uploadImage(file.buffer, file.originalname, centroId);
      const presignedUrl = getPresignedUrl(key);
      nuevasImagenes.push(presignedUrl);
    }

    // 3. Unir y limitar imágenes
    const imagenesActuales = Array.isArray(centro.imagenes) ? centro.imagenes : [];
    const todasImagenes = [...imagenesActuales, ...nuevasImagenes].slice(0, this.MAX_IMAGENES);

    // 4. Actualizar centro
    await centroDeportivoService.updateCentro(centroId, { imagenes: todasImagenes });

    return todasImagenes;
  }

  async eliminarImagen(centroId, key) {
    // 1. Validar formato de key
    if (!key || typeof key !== 'string' || !key.startsWith('centros/')) {
      throw Boom.badRequest('Key de imagen inválida');
    }

    // 2. Obtener centro
    const centro = await centroDeportivoService.getCentroById(centroId);
    if (!centro) {
      throw Boom.notFound('Centro deportivo no encontrado');
    }

    // 3. Validar imágenes existentes
    if (!Array.isArray(centro.imagenes) || centro.imagenes.length === 0) {
      throw Boom.notFound('El centro no tiene imágenes');
    }

    // 4. Buscar imagen
    const index = centro.imagenes.findIndex(img => img === key);
    if (index === -1) {
      throw Boom.notFound('Imagen no encontrada en el centro');
    }

    try {
      // 5. Verificar existencia en S3
      await this.s3.headObject({ 
        Bucket: this.BUCKET, 
        Key: key 
      }).promise();

      // 6. Eliminar de S3
      await this.s3.deleteObject({ 
        Bucket: this.BUCKET, 
        Key: key 
      }).promise();

      // 7. Actualizar centro
      centro.imagenes.splice(index, 1);
      await centroDeportivoService.updateCentro(centroId, { imagenes: centro.imagenes });

      return centro.imagenes;
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        // La imagen ya no existe en S3, solo actualizar DynamoDB
        centro.imagenes.splice(index, 1);
        await centroDeportivoService.updateCentro(centroId, { imagenes: centro.imagenes });
        return centro.imagenes;
      }
      if (error.code === 'AccessDenied') {
        throw Boom.forbidden('No hay permisos para eliminar la imagen');
      }
      if (error.code === 'InvalidAccessKeyId') {
        throw Boom.serverUnavailable('Error de configuración de AWS');
      }
      throw Boom.boomify(error, { message: 'Error al eliminar la imagen' });
    }
  }
}

module.exports = new ImagenCentroService(); 