// src/infrastructure/services/storage-service.js
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';

class StorageService {
  constructor() {
    this.s3 = new AWS.S3();
    this.bucketName = process.env.S3_BUCKET_NAME;
  }

  async uploadImage(base64Image, folder = 'images') {
    try {
      // Extraer la data y el tipo del base64
      const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

      if (!matches || matches.length !== 3) {
        throw Boom.badRequest('Formato de imagen inválido');
      }

      const type = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      // Obtener extensión
      const extension = type.split('/')[1];
      const allowedExtensions = ['jpeg', 'jpg', 'png', 'gif'];

      if (!allowedExtensions.includes(extension)) {
        throw Boom.badRequest('Formato de imagen no soportado');
      }

      // Generar nombre único
      const filename = `${folder}/${uuidv4()}.${extension}`;

      // Parámetros para S3
      const params = {
        Bucket: this.bucketName,
        Key: filename,
        Body: buffer,
        ContentType: type,
        ACL: 'public-read'
      };

      // Subir a S3
      const result = await this.s3.upload(params).promise();

      return result.Location;
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      if (error.isBoom) throw error;
      throw Boom.internal('Error al subir la imagen');
    }
  }

  async deleteImage(imageUrl) {
    try {
      // Extraer el key de la URL
      const key = imageUrl.split(`${this.bucketName}/`)[1];

      const params = {
        Bucket: this.bucketName,
        Key: key
      };

      await this.s3.deleteObject(params).promise();

      return true;
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      throw Boom.internal('Error al eliminar la imagen');
    }
  }
}

export default StorageService;
