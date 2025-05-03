//src/infrastructure/repositories/centroDeportivoRepository.js
const AWS = require('aws-sdk');
const CentroDeportivo = require('../../domain/entities/centro-deportivo');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

class CentroDeportivoRepository {
  constructor() {
    this.TABLE_NAME = process.env.CENTROS_DEPORTIVOS_TABLE;
  }

  async save(centro) {
    const params = {
      TableName: this.TABLE_NAME,
      Item: centro
    };
    await dynamoDB.put(params).promise();
    return centro;
  }

  async findById(centroId) {
    const params = {
      TableName: this.TABLE_NAME,
      Key: { centroId }
    };
    const result = await dynamoDB.get(params).promise();
    return result.Item ? new CentroDeportivo(result.Item) : null;
  }

  async update(centroId, updateData) {
    // Construye la expresión de actualización dinámicamente
    const updateExpressionParts = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    for (const [key, value] of Object.entries(updateData)) {
      updateExpressionParts.push(`#${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
      expressionAttributeNames[`#${key}`] = key;
    }
    const params = {
      TableName: this.TABLE_NAME,
      Key: { centroId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };
    const result = await dynamoDB.update(params).promise();
    return result.Attributes ? new CentroDeportivo(result.Attributes) : null;
  }

  async delete(centroId) {
    const params = {
      TableName: this.TABLE_NAME,
      Key: { centroId }
    };
    await dynamoDB.delete(params).promise();
    return { centroId, deleted: true };
  }

  /**
   * Busca centros deportivos con filtros SOLO sobre campos indexados.
   * Filtros soportados:
   *   - userId (requiere índice UserIdEstadoIndex)
   *   - estado (requiere índice UserIdEstadoIndex)
   *   - userId + estado (requiere índice UserIdEstadoIndex)
   *   - nombre (requiere índice NombreIndex)
   *   - horaAperturaMinima (requiere índice HoraAperturaMinimaIndex)
   *   - horaCierreMaxima (requiere índice HoraCierreMaximaIndex)
   *
   * @param {Object} filters - Filtros válidos: userId, estado, nombre, abiertoDespuesDe, abiertoAntesDe
   * @param {Object} options - Opciones de paginación y ordenamiento
   */
  async findAll(filters = {}, options = {}) {
    const { limit = 10, sort = 'nombre', order = 'asc' } = options;
    let lastEvaluatedKey = options.lastEvaluatedKey;
    let itemsFiltrados = [];
    let scannedCount = 0;
    let dynamoLastEvaluatedKey = null;
    let done = false;
    const SCAN_BATCH_SIZE = limit; // Para paginación eficiente, igual al limit solicitado

    // Solo se permiten filtros sobre campos indexados
    const canQueryByUserId = filters.userId && !filters.estado && !filters.nombre && !filters.abiertoDespuesDe && !filters.abiertoAntesDe;
    const canQueryByUserIdEstado = filters.userId && filters.estado && !filters.nombre && !filters.abiertoDespuesDe && !filters.abiertoAntesDe;
    const canQueryByEstado = filters.estado && !filters.userId && !filters.nombre && !filters.abiertoDespuesDe && !filters.abiertoAntesDe;
    const canQueryByNombre = filters.nombre && !filters.userId && !filters.estado && !filters.abiertoDespuesDe && !filters.abiertoAntesDe;
    const canQueryByApertura = filters.abiertoDespuesDe && !filters.userId && !filters.estado && !filters.nombre && !filters.abiertoAntesDe;
    const canQueryByCierre = filters.abiertoAntesDe && !filters.userId && !filters.estado && !filters.nombre && !filters.abiertoDespuesDe;

    if (canQueryByUserId || canQueryByUserIdEstado || canQueryByEstado || canQueryByNombre || canQueryByApertura || canQueryByCierre) {
      // Construir parámetros para query
      let params = {
        TableName: this.TABLE_NAME,
        Limit: SCAN_BATCH_SIZE,
        ExclusiveStartKey: lastEvaluatedKey
      };
      if (canQueryByUserIdEstado) {
        params.IndexName = 'UserIdEstadoIndex';
        params.KeyConditionExpression = 'userId = :userId AND estado = :estado';
        params.ExpressionAttributeValues = {
          ':userId': filters.userId,
          ':estado': filters.estado
        };
      } else if (canQueryByUserId) {
        params.IndexName = 'UserIdEstadoIndex';
        params.KeyConditionExpression = 'userId = :userId';
        params.ExpressionAttributeValues = {
          ':userId': filters.userId
        };
      } else if (canQueryByEstado) {
        params.IndexName = 'UserIdEstadoIndex';
        params.KeyConditionExpression = 'estado = :estado';
        params.ExpressionAttributeValues = {
          ':estado': filters.estado
        };
      } else if (canQueryByNombre) {
        params.IndexName = 'NombreIndex';
        params.KeyConditionExpression = 'nombre = :nombre';
        params.ExpressionAttributeValues = {
          ':nombre': filters.nombre
        };
      } else if (canQueryByApertura) {
        params.IndexName = 'HoraAperturaMinimaIndex';
        params.KeyConditionExpression = 'horaAperturaMinima <= :abiertoDespuesDe';
        params.ExpressionAttributeValues = {
          ':abiertoDespuesDe': filters.abiertoDespuesDe
        };
      } else if (canQueryByCierre) {
        params.IndexName = 'HoraCierreMaximaIndex';
        params.KeyConditionExpression = 'horaCierreMaxima >= :abiertoAntesDe';
        params.ExpressionAttributeValues = {
          ':abiertoAntesDe': filters.abiertoAntesDe
        };
      }

      try {
        const result = await dynamoDB.query(params).promise();
        scannedCount += result.ScannedCount || 0;
        dynamoLastEvaluatedKey = result.LastEvaluatedKey || null;
        const items = result.Items.map(item => new CentroDeportivo(item));
        let itemsFiltradosBatch = items;
        itemsFiltrados = itemsFiltrados.concat(itemsFiltradosBatch);
        done = true;
      } catch (error) {
        console.error('Error en query de centros deportivos:', error);
        throw error;
      }
    } else {
      // Si no hay filtros válidos, lanzar error y documentar
      throw new Error('Solo se permiten filtros sobre campos indexados: userId, estado, userId+estado, nombre, horaAperturaMinima, horaCierreMaxima. Otros filtros no están soportados por eficiencia.');
    }

    // Ordenar resultados
    itemsFiltrados = this._sortItems(itemsFiltrados, sort, order);

    return {
      items: itemsFiltrados,
      count: itemsFiltrados.length,
      scannedCount,
      lastEvaluatedKey: dynamoLastEvaluatedKey
    };
  }

  // Método auxiliar para ordenar items
  _sortItems(items, sortField, order) {
    // Verificar si el campo de ordenamiento existe
    if (!items.length || items[0][sortField] === undefined) {
      // Si el campo no existe, usamos nombre como fallback
      sortField = 'nombre';
    }
    
    return items.sort((a, b) => {
      // Manejar caso especial: ordenar por distancia (para búsquedas por ubicación)
      if (sortField === 'distance') {
        const distA = a.distance || Infinity;
        const distB = b.distance || Infinity;
        return order === 'asc' ? distA - distB : distB - distA;
      }
      
      // Para el resto de campos
      if (a[sortField] === undefined && b[sortField] === undefined) return 0;
      if (a[sortField] === undefined) return order === 'asc' ? 1 : -1;
      if (b[sortField] === undefined) return order === 'asc' ? -1 : 1;
      
      // Ordenamiento específico según tipo de dato
      if (typeof a[sortField] === 'string') {
        return order === 'asc' 
          ? a[sortField].localeCompare(b[sortField]) 
          : b[sortField].localeCompare(a[sortField]);
      }
      
      // Ordenamiento para números y otros tipos
      if (a[sortField] < b[sortField]) {
        return order === 'asc' ? -1 : 1;
      }
      if (a[sortField] > b[sortField]) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
}

module.exports = CentroDeportivoRepository;