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
    
    // Parámetros de consulta base
    const params = {
      TableName: this.TABLE_NAME,
      Limit: limit,
      ExclusiveStartKey: options.lastEvaluatedKey
    };
    
    // Construir filtros si existen
    if (Object.keys(filters).length > 0) {
      let filterExpression = [];
      let expressionAttributeValues = {};
      let expressionAttributeNames = {};
      
      Object.entries(filters).forEach(([key, value], index) => {
        // Manejamos arrays (como servicios) y valores simples de manera diferente
        if (Array.isArray(value)) {
          // Para arrays hacemos búsqueda de al menos un elemento coincidente
          filterExpression.push(`contains(#${key}, :${key}${index})`);
          value.forEach((item, i) => {
            expressionAttributeValues[`:${key}${index}_${i}`] = item;
            if (i > 0) {
              filterExpression.push(`OR contains(#${key}, :${key}${index}_${i})`);
            }
          });
        } else if (typeof value === 'string') {
          // Para cadenas, hacemos búsqueda con contains para mayor flexibilidad
          filterExpression.push(`contains(#${key}, :${key}${index})`);
          expressionAttributeValues[`:${key}${index}`] = value;
        } else {
          // Para otros tipos (números, booleanos), hacemos coincidencia exacta
          filterExpression.push(`#${key} = :${key}${index}`);
          expressionAttributeValues[`:${key}${index}`] = value;
        }
        
        expressionAttributeNames[`#${key}`] = key;
      });
      
      params.FilterExpression = filterExpression.join(' AND ');
      params.ExpressionAttributeValues = expressionAttributeValues;
      params.ExpressionAttributeNames = expressionAttributeNames;
    }
    
    try {
      const result = await dynamoDB.scan(params).promise();
      
      // Transformamos cada item a la entidad CentroDeportivo
      const items = result.Items.map(item => new CentroDeportivo(item));
      
      // Ordenar resultados según parámetros
      const sortedItems = this._sortItems(items, sort, order);
      
      // Construir respuesta paginada
      return {
        items: sortedItems,
        count: result.Count,
        totalCount: result.ScannedCount,
        page,
        limit,
        lastEvaluatedKey: result.LastEvaluatedKey || null,
        hasNextPage: !!result.LastEvaluatedKey
      };
    } catch (error) {
      console.error('Error al listar centros deportivos:', error);
      throw error;
    }
  }

    // Método auxiliar para ordenar items
    _sortItems(items, sortField, order) {
      return items.sort((a, b) => {
        if (a[sortField] < b[sortField]) {
          return order === 'asc' ? -1 : 1;
        }
        if (a[sortField] > b[sortField]) {
          return order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

  // Puedes agregar más métodos como buscar por usuario, listar todos, etc.
}

module.exports = CentroDeportivoRepository;