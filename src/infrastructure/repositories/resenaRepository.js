//src/infrastructure/repositories/resenaRepository.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand
} = require('@aws-sdk/lib-dynamodb');

class ResenaRepositoryError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'ResenaRepositoryError';
    this.originalError = originalError;
  }
}

class ResenaRepository {
  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.DYNAMODB_TABLE || 'Resenas';
  }

  async handleDynamoDBError(operation, error) {
    console.error(`Error en operación ${operation}:`, error);

    if (error.name === 'ProvisionedThroughputExceededException') {
      throw new ResenaRepositoryError(
        'La operación no pudo completarse debido a límites de capacidad excedidos. Por favor, intente nuevamente en unos momentos.',
        error
      );
    }

    if (error.name === 'ResourceNotFoundException') {
      throw new ResenaRepositoryError(
        'El recurso solicitado no existe en la base de datos.',
        error
      );
    }

    if (error.name === 'ValidationException') {
      throw new ResenaRepositoryError(
        'Los datos proporcionados no son válidos para la operación.',
        error
      );
    }

    if (error.name === 'ConditionalCheckFailedException') {
      throw new ResenaRepositoryError(
        'La operación no pudo completarse porque no se cumplieron las condiciones especificadas.',
        error
      );
    }

    if (error.name === 'InternalServerError') {
      throw new ResenaRepositoryError(
        'Ocurrió un error interno en el servidor. Por favor, intente nuevamente más tarde.',
        error
      );
    }

    throw new ResenaRepositoryError(
      `Error al realizar la operación ${operation} en la base de datos.`,
      error
    );
  }

  async create(resena) {
    try {
      const params = {
        TableName: this.tableName,
        Item: resena.toJSON(),
        ConditionExpression: 'attribute_not_exists(resenaId)'
      };

      await this.docClient.send(new PutCommand(params));
      return resena;
    } catch (error) {
      await this.handleDynamoDBError('create', error);
    }
  }

  async findById(resenaId) {
    try {
      const params = {
        TableName: this.tableName,
        Key: { resenaId }
      };

      const result = await this.docClient.send(new GetCommand(params));
      return result.Item;
    } catch (error) {
      await this.handleDynamoDBError('findById', error);
    }
  }

  async findByUserId(userId) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      };

      const result = await this.docClient.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      await this.handleDynamoDBError('findByUserId', error);
    }
  }

  async findByCanchaId(canchaId) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'CanchaIdIndex',
        KeyConditionExpression: 'canchaId = :canchaId',
        ExpressionAttributeValues: {
          ':canchaId': canchaId
        }
      };

      const result = await this.docClient.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      await this.handleDynamoDBError('findByCanchaId', error);
    }
  }

  async findByCentroId(centroId) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'CentroIdIndex',
        KeyConditionExpression: 'centroId = :centroId',
        ExpressionAttributeValues: {
          ':centroId': centroId
        }
      };

      const result = await this.docClient.send(new QueryCommand(params));
      return result.Items;
    } catch (error) {
      await this.handleDynamoDBError('findByCentroId', error);
    }
  }

  async findByUserAndCancha(userId, canchaId) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'UserCanchaIndex',
        KeyConditionExpression: 'userCanchaId = :userCanchaId',
        ExpressionAttributeValues: {
          ':userCanchaId': `${userId}#${canchaId}`
        }
      };

      const result = await this.docClient.send(new QueryCommand(params));
      return result.Items[0];
    } catch (error) {
      await this.handleDynamoDBError('findByUserAndCancha', error);
    }
  }

  async findByUserAndCentro(userId, centroId) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'UserCentroIndex',
        KeyConditionExpression: 'userCentroId = :userCentroId',
        ExpressionAttributeValues: {
          ':userCentroId': `${userId}#${centroId}`
        }
      };

      const result = await this.docClient.send(new QueryCommand(params));
      return result.Items[0];
    } catch (error) {
      await this.handleDynamoDBError('findByUserAndCentro', error);
    }
  }

  async findWithFilters({ canchaId, centroId, calificacionMinima, lastEvaluatedKey = null, limit = 10 }) {
    const params = {
      TableName: this.tableName,
      IndexName: canchaId ? 'CanchaIdIndex' : 'CentroIdIndex',
      KeyConditionExpression: canchaId ? 'canchaId = :id' : 'centroId = :id',
      ExpressionAttributeValues: {
        ':id': canchaId || centroId
      },
      Limit: limit
    };

    if (calificacionMinima) {
      params.FilterExpression = 'calificacion >= :calificacionMinima';
      params.ExpressionAttributeValues[':calificacionMinima'] = calificacionMinima;
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const result = await this.docClient.send(new QueryCommand(params));
      return {
        items: result.Items,
        lastEvaluatedKey: result.LastEvaluatedKey,
        hasMore: !!result.LastEvaluatedKey
      };
    } catch (error) {
      await this.handleDynamoDBError('findWithFilters', error);
    }
  }

  async update(resenaId, updateData) {
    try {
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      const params = {
        TableName: this.tableName,
        Key: { resenaId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
        ConditionExpression: 'attribute_exists(resenaId)'
      };

      const result = await this.docClient.send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      await this.handleDynamoDBError('update', error);
    }
  }

  async delete(resenaId) {
    try {
      const params = {
        TableName: this.tableName,
        Key: { resenaId },
        ConditionExpression: 'attribute_exists(resenaId)'
      };

      await this.docClient.send(new DeleteCommand(params));
    } catch (error) {
      await this.handleDynamoDBError('delete', error);
    }
  }

  async obtenerEstadisticasCalificacionesCancha(canchaId) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'CanchaIdIndex',
        KeyConditionExpression: 'canchaId = :canchaId',
        ExpressionAttributeValues: {
          ':canchaId': canchaId
        },
        ProjectionExpression: 'calificacion'
      };

      const result = await this.docClient.send(new QueryCommand(params));
      
      if (!result.Items || result.Items.length === 0) {
        return {
          promedio: 0,
          distribucion: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
          },
          total: 0
        };
      }

      const distribucion = result.Items.reduce((acc, item) => {
        const calificacion = Math.round(item.calificacion);
        acc[calificacion] = (acc[calificacion] || 0) + 1;
        return acc;
      }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

      const sumaCalificaciones = result.Items.reduce((sum, item) => sum + item.calificacion, 0);
      const promedio = sumaCalificaciones / result.Items.length;

      return {
        promedio: Number(promedio.toFixed(1)),
        distribucion,
        total: result.Items.length
      };
    } catch (error) {
      await this.handleDynamoDBError('obtenerEstadisticasCalificacionesCancha', error);
    }
  }

  async obtenerEstadisticasCalificacionesCentro(centroId) {
    try {
      const params = {
        TableName: this.tableName,
        IndexName: 'CentroIdIndex',
        KeyConditionExpression: 'centroId = :centroId',
        ExpressionAttributeValues: {
          ':centroId': centroId
        },
        ProjectionExpression: 'calificacion'
      };

      const result = await this.docClient.send(new QueryCommand(params));
      
      if (!result.Items || result.Items.length === 0) {
        return {
          promedio: 0,
          distribucion: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0
          },
          total: 0
        };
      }

      const distribucion = result.Items.reduce((acc, item) => {
        const calificacion = Math.round(item.calificacion);
        acc[calificacion] = (acc[calificacion] || 0) + 1;
        return acc;
      }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

      const sumaCalificaciones = result.Items.reduce((sum, item) => sum + item.calificacion, 0);
      const promedio = sumaCalificaciones / result.Items.length;

      return {
        promedio: Number(promedio.toFixed(1)),
        distribucion,
        total: result.Items.length
      };
    } catch (error) {
      await this.handleDynamoDBError('obtenerEstadisticasCalificacionesCentro', error);
    }
  }
}

module.exports = ResenaRepository;
