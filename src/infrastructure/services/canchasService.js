// src/infrastructure/services/canchasService.js
const CanchasRepository = require('../repositories/canchasRepository');
const Cancha = require('../../domain/entities/cancha');
const { v4: uuidv4 } = require('uuid');
const { uploadImage, getPresignedUrl } = require('./s3Service');
const AWS = require('aws-sdk');
const { sanitizeObject } = require('../../utils/sanitizeInput');

class CanchasService {
  constructor() {
    this.repo = new CanchasRepository();
  }

  // Método privado para procesar imágenes (solo archivos subidos)
  async _procesarImagenes(files = [], centroId) {
    let imagenes = [];
    // Procesar archivos
    if (files && files.length > 0) {
      for (const file of files) {
        const key = await uploadImage(file.buffer, file.originalname, centroId);
        imagenes.push(key);
      }
    }
    // Limitar a 3 imágenes
    return imagenes.slice(0, 3);
  }

  async createCancha(canchaData, files = []) {
    const cleanData = sanitizeObject(canchaData);
    const imagenes = await this._procesarImagenes(files, cleanData.centroId);
    const cancha = new Cancha({
      ...cleanData,
      canchaId: uuidv4(),
      imagenes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return await this.repo.save(cancha);
  }

  async updateCancha(canchaId, updateData, files = []) {
    // Obtener cancha actual
    const canchaActual = await this.repo.findById(canchaId);
    if (!canchaActual) throw new Error('Cancha no encontrada');
    // Sanitizar datos de entrada
    const cleanData = sanitizeObject(updateData);
    // Unir imágenes actuales con nuevas
    let imagenes = canchaActual.imagenes || [];
    const nuevasImagenes = await this._procesarImagenes(files, canchaActual.centroId);
    imagenes = [...imagenes, ...nuevasImagenes].slice(0, 3);
    if (imagenes.length > 3) {
      throw new Error('No se permiten más de 3 imágenes por cancha.');
    }
    cleanData.imagenes = imagenes;
    cleanData.updatedAt = new Date().toISOString();
    // Condición optimista: solo actualiza si las imágenes no cambiaron desde que las leíste
    const params = {
      ...cleanData,
      imagenes,
      updatedAt: cleanData.updatedAt
    };
    try {
      // Usar condición de DynamoDB para evitar sobrescribir si alguien más modificó imágenes
      return await this.repo.update(canchaId, params, {
        ConditionExpression: 'attribute_not_exists(imagenes) OR imagenes = :oldImagenes',
        ExpressionAttributeValues: {
          ':oldImagenes': canchaActual.imagenes || []
        }
      });
    } catch (error) {
      // Manejar conflicto de concurrencia (ConditionalCheckFailedException)
      if (error.code === 'ConditionalCheckFailedException') {
        const conflict = new Error('Conflicto de concurrencia: las imágenes han sido modificadas por otro usuario.');
        conflict.statusCode = 409;
        throw conflict;
      }
      throw error;
    }
  }

  async deleteCancha(canchaId) {
    // Obtener la cancha para conocer las keys de S3
    const cancha = await this.repo.findById(canchaId);
    if (cancha && Array.isArray(cancha.imagenes)) {
      // Eliminar solo las imágenes que son keys de S3 (no URLs externas)
      const s3Keys = cancha.imagenes.filter(img => typeof img === 'string' && img.startsWith('centros/'));
      if (s3Keys.length > 0) {
        const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
        const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
        const deleteParams = {
          Bucket: BUCKET,
          Delete: {
            Objects: s3Keys.map(Key => ({ Key })),
            Quiet: true
          }
        };
        await s3.deleteObjects(deleteParams).promise();
      }
    }
    // Eliminar la cancha de la base de datos
    return await this.repo.delete(canchaId);
  }

  async listCanchasByCentro(centroId, options = {}) {
    // Paginación nativa con DynamoDB y filtros simples (tipo, disponible)
    const limit = parseInt(options.limit, 10) || 10;
    const lastEvaluatedKey = options.lastEvaluatedKey || undefined;
    const tipo = options.tipo;
    const disponible = options.disponible;
    const result = await this.repo.findAllByCentro(centroId, { limit, lastEvaluatedKey, tipo, disponible });
    // Convertir solo keys S3 válidas a presigned URLs
    const mapped = result.items.map(cancha => {
      cancha.imagenes = (cancha.imagenes || [])
        .filter(img => typeof img === 'string' && img.startsWith('centros/'))
        .map(key => getPresignedUrl(key));
      return cancha;
    });
    return {
      items: mapped,
      limit,
      count: result.count,
      lastEvaluatedKey: result.lastEvaluatedKey
    };
  }

  async getCanchaById(canchaId) {
    const cancha = await this.repo.findById(canchaId);
    if (!cancha) return null;
    // Solo retornar presigned URLs para keys de S3 válidas
    cancha.imagenes = (cancha.imagenes || [])
      .filter(img => typeof img === 'string' && img.startsWith('centros/'))
      .map(key => getPresignedUrl(key));
    return cancha;
  }
}

module.exports = new CanchasService();