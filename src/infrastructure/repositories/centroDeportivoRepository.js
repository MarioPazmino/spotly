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

  async findAll(filters = {}, options = {}) {
    const { page = 1, limit = 10, sort = 'nombre', order = 'asc' } = options;
    let lastEvaluatedKey = options.lastEvaluatedKey;
    let itemsFiltrados = [];
    let scannedCount = 0;
    let dynamoLastEvaluatedKey = null;
    let done = false;
    // Sobrelectura: múltiplo del límite para cada scan
    const SCAN_BATCH_SIZE = Math.max(limit * 3, 50);

    while (!done && itemsFiltrados.length < limit) {
      const params = {
        TableName: this.TABLE_NAME,
        Limit: SCAN_BATCH_SIZE,
        ExclusiveStartKey: lastEvaluatedKey
      };
      // Construir filtros si existen (solo para los que DynamoDB pueda usar)
      // (aquí puedes optimizar para query si tienes índices)
      if (Object.keys(filters).length > 0) {
        let filterExpression = [];
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};
        Object.entries(filters).forEach(([key, value], index) => {
          if (value === undefined || value === null) return;
          if (Array.isArray(value)) {
            const orExpressions = [];
            value.forEach((item, i) => {
              const paramName = `:${key}${index}_${i}`;
              orExpressions.push(`contains(#${key}, ${paramName})`);
              expressionAttributeValues[paramName] = item;
            });
            if (orExpressions.length > 0) {
              filterExpression.push(`(${orExpressions.join(' OR ')})`);
            }
          } else if (typeof value === 'object' && value !== null) {
            // Objetos (como ubicacionGPS, redesSociales)
          } else if (typeof value === 'string') {
            expressionAttributeValues[`:${key}${index}`] = value;
            if (key === 'cedulaJuridica' || key === 'userId' || key === 'braintreeMerchantId' || key === 'braintreeStatus') {
              filterExpression.push(`#${key} = :${key}${index}`);
            } else {
              filterExpression.push(`contains(#${key}, :${key}${index})`);
            }
            expressionAttributeNames[`#${key}`] = key;
          } else {
            filterExpression.push(`#${key} = :${key}${index}`);
            expressionAttributeValues[`:${key}${index}`] = value;
            expressionAttributeNames[`#${key}`] = key;
          }
        });
        if (filterExpression.length > 0) {
          params.FilterExpression = filterExpression.join(' AND ');
          params.ExpressionAttributeValues = expressionAttributeValues;
          params.ExpressionAttributeNames = expressionAttributeNames;
        }
      }
      try {
        const result = await dynamoDB.scan(params).promise();
        scannedCount += result.ScannedCount || 0;
        dynamoLastEvaluatedKey = result.LastEvaluatedKey || null;
        // Transformar a entidad y aplicar filtros en memoria si es necesario
        const items = result.Items.map(item => new CentroDeportivo(item));
        // Aquí podrías aplicar filtros en memoria adicionales si los necesitas
        itemsFiltrados = itemsFiltrados.concat(items);
        if (!dynamoLastEvaluatedKey) {
          done = true;
        } else {
          lastEvaluatedKey = dynamoLastEvaluatedKey;
        }
      } catch (error) {
        console.error('Error al listar centros deportivos:', error);
        throw error;
      }
    }
    // Ordenar y paginar resultados filtrados
    const sortedItems = this._sortItems(itemsFiltrados, sort, order).slice(0, limit);
    const hasNextPage = !!dynamoLastEvaluatedKey && itemsFiltrados.length > limit;
    return {
      items: sortedItems,
      count: sortedItems.length,
      totalCount: scannedCount,
      page,
      limit,
      lastEvaluatedKey: hasNextPage ? dynamoLastEvaluatedKey : null,
      hasNextPage
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