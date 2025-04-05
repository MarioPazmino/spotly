import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';

class CentroDeportivoRepository {
  constructor() {
    const options = process.env.IS_OFFLINE
      ? {
          region: 'localhost',
          endpoint: 'http://localhost:8000',
        }
      : {};

    this.dynamoDb = new AWS.DynamoDB.DocumentClient(options);
    this.tableName = process.env.CENTROS_DEPORTIVOS_TABLE || 'CentrosDeportivos-dev';
  }

  async getAll() {
    try {
      const result = await this.dynamoDb
        .scan({
          TableName: this.tableName,
        })
        .promise();

      return result.Items;
    } catch (error) {
      console.error('Error obteniendo centros deportivos:', error);
      throw Boom.internal('Error al obtener los centros deportivos');
    }
  }

  async getById(id) {
    try {
      const result = await this.dynamoDb
        .get({
          TableName: this.tableName,
          Key: { id },
        })
        .promise();

      if (!result.Item) {
        throw Boom.notFound(`Centro deportivo con ID ${id} no encontrado`);
      }

      return result.Item;
    } catch (error) {
      if (error.isBoom) throw error;
      console.error('Error obteniendo centro deportivo:', error);
      throw Boom.internal('Error al obtener el centro deportivo');
    }
  }

  async create(centroDeportivo) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();

    const newCentroDeportivo = {
      ...centroDeportivo,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await this.dynamoDb
        .put({
          TableName: this.tableName,
          Item: newCentroDeportivo,
        })
        .promise();

      return newCentroDeportivo;
    } catch (error) {
      console.error('Error creando centro deportivo:', error);
      throw Boom.internal('Error al crear el centro deportivo');
    }
  }

  async update(id, centroDeportivo) {
    const timestamp = new Date().toISOString();

    try {
      // Verificar que el centro deportivo existe
      await this.getById(id);

      const updatedCentroDeportivo = {
        ...centroDeportivo,
        id,
        updatedAt: timestamp,
      };

      await this.dynamoDb
        .put({
          TableName: this.tableName,
          Item: updatedCentroDeportivo,
        })
        .promise();

      return updatedCentroDeportivo;
    } catch (error) {
      if (error.isBoom) throw error;
      console.error('Error actualizando centro deportivo:', error);
      throw Boom.internal('Error al actualizar el centro deportivo');
    }
  }

  async delete(id) {
    try {
      // Verificar que el centro deportivo existe
      await this.getById(id);

      await this.dynamoDb
        .delete({
          TableName: this.tableName,
          Key: { id },
        })
        .promise();

      return { id };
    } catch (error) {
      if (error.isBoom) throw error;
      console.error('Error eliminando centro deportivo:', error);
      throw Boom.internal('Error al eliminar el centro deportivo');
    }
  }
}

export default CentroDeportivoRepository;
