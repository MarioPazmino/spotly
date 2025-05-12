// src/infrastructure/services/cuponDescuentoService.js
// Ahora solo maneja horaInicio y horaFin (formato HHmm) para la vigencia de cupones.
const CuponDescuentoRepository = require('../repositories/cuponDescuentoRepository');
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const { normalizarFechaHoraGuayaquil } = require('../../utils/fechas');

class CuponDescuentoService {
  constructor(repo = CuponDescuentoRepository) {
    this.repo = repo;
  }
  async create(data, userId) {
    // Validar existencia del centro deportivo
    // CentroDeportivoRepository ya exporta una instancia, no necesitamos usar 'new'
    const centro = await CentroDeportivoRepository.findById(data.centroId);
    if (!centro) throw new Error('El centroId asociado no existe');
    // Validar que solo el admin del centro pueda crear cupones
    if (!userId || centro.adminId !== userId) {
      throw new Error('Solo el administrador del centro puede crear cupones');
    }
    // Permitir varios cupones por centro, pero el código debe ser único por centro
    const existente = await this.repo.findByCentroIdYCodigo(data.centroId, data.codigo);
    if (existente) {
      throw new Error('Ya existe un cupón con ese código para este centro');
    }

    // Normalizar fechas y convertirlas a strings ISO para DynamoDB
    if (data.fechaInicio) {
      const fechaInicio = normalizarFechaHoraGuayaquil(data.fechaInicio);
      data.fechaInicio = fechaInicio instanceof Date ? fechaInicio.toISOString() : fechaInicio;
    }
    if (data.fechaFin) {
      const fechaFin = normalizarFechaHoraGuayaquil(data.fechaFin);
      data.fechaFin = fechaFin instanceof Date ? fechaFin.toISOString() : fechaFin;
    }
    
    return this.repo.create(data);
  }
  
  /**
   * Crea un cupón de descuento como super administrador, sin validar propiedad del centro
   * @param {Object} data - Datos del cupón a crear
   * @returns {Promise<Object>} Cupón creado
   */
  async createAsSuperAdmin(data) {
    // Validar existencia del centro deportivo
    const centro = await CentroDeportivoRepository.findById(data.centroId);
    if (!centro) throw new Error('El centroId asociado no existe');
    
    // Permitir varios cupones por centro, pero el código debe ser único por centro
    const existente = await this.repo.findByCentroIdYCodigo(data.centroId, data.codigo);
    if (existente) {
      throw new Error('Ya existe un cupón con ese código para este centro');
    }

    // Normalizar fechas y convertirlas a strings ISO para DynamoDB
    if (data.fechaInicio) {
      const fechaInicio = normalizarFechaHoraGuayaquil(data.fechaInicio);
      data.fechaInicio = fechaInicio instanceof Date ? fechaInicio.toISOString() : fechaInicio;
    }
    if (data.fechaFin) {
      const fechaFin = normalizarFechaHoraGuayaquil(data.fechaFin);
      data.fechaFin = fechaFin instanceof Date ? fechaFin.toISOString() : fechaFin;
    }
    
    return this.repo.create(data);
  }
  async getById(cuponId) {
    return this.repo.getById(cuponId);
  }
  async findByCodigo(codigo) {
    return this.repo.findByCodigo(codigo);
  }
  async update(cuponId, updates, userId, userGroups = []) {
    console.log("Service: Iniciando actualización de cupón", cuponId);
    console.log("Datos para actualizar:", JSON.stringify(updates));
    
    // Impedir modificar centroId
    if (updates.centroId !== undefined) {
      const cupon = await this.repo.getById(cuponId);
      if (!cupon) throw new Error('Cupón no encontrado');
      if (updates.centroId !== cupon.centroId) {
        throw {
          status: 400,
          code: 'CENTRO_ID_IMMUTABLE',
          message: 'No se permite modificar el centroId de un cupón'
        };
      }
      // Si es igual, simplemente no lo actualices
      delete updates.centroId;
    }
    
    // Obtener el cupón actual
    const cupon = await this.repo.getById(cuponId);
    console.log("Cupón actual:", JSON.stringify(cupon));
    
    if (!cupon) {
      throw {
        status: 404,
        code: 'COUPON_NOT_FOUND',
        message: 'Cupón no encontrado'
      };
    }
    
    // Verificar permisos: permitir super_admin o admin del centro
    const esSuperAdmin = Array.isArray(userGroups) && userGroups.includes('super_admin');
    console.log("Es super admin:", esSuperAdmin);
    
    if (!esSuperAdmin) {
      // Si no es super_admin, verificar si es admin del centro
      const centro = await CentroDeportivoRepository.findById(cupon.centroId);
      if (!userId || centro.adminId !== userId) {
        throw {
          status: 403,
          code: 'PERMISSION_DENIED',
          message: 'Solo el administrador del centro puede actualizar cupones'
        };
      }
    }

    // Normalizar fechas y convertirlas a strings ISO para DynamoDB
    if (updates.fechaInicio) {
      const fechaInicio = normalizarFechaHoraGuayaquil(updates.fechaInicio);
      updates.fechaInicio = fechaInicio instanceof Date ? fechaInicio.toISOString() : fechaInicio;
    }
    if (updates.fechaFin) {
      const fechaFin = normalizarFechaHoraGuayaquil(updates.fechaFin);
      updates.fechaFin = fechaFin instanceof Date ? fechaFin.toISOString() : fechaFin;
    }
    
    // Si se intenta cambiar el código, asegurar unicidad por centro
    if (updates.codigo !== undefined && updates.codigo !== cupon.codigo) {
      console.log("Verificando cambio de código:", updates.codigo, "vs", cupon.codigo);
      
      // Verificar primero si el cupón ya tiene usos
      if (cupon.usuariosUsos && Object.keys(cupon.usuariosUsos).length > 0) {
        throw {
          status: 400,
          code: 'CODE_IMMUTABLE_AFTER_USE',
          message: 'No se puede modificar el código de un cupón que ya ha sido utilizado',
          detalles: {
            camposModificables: ['tipoDescuento', 'valor', 'fechaInicio', 'fechaFin', 'maximoUsos']
          }
        };
      }
      
      // Si no tiene usos, verificar que el nuevo código sea único
      const existente = await this.repo.findByCentroIdYCodigo(cupon.centroId, updates.codigo);
      console.log("Búsqueda de código existente:", existente ? existente.cuponId : "no encontrado");
      
      if (existente && existente.cuponId !== cuponId) {
        throw {
          status: 409,
          code: 'DUPLICATE_CODE',
          message: 'Ya existe un cupón con ese código para este centro',
          detalles: {
            codigo: updates.codigo,
            centroId: cupon.centroId
          }
        };
      }
    } else {
      console.log("No se cambia el código o es el mismo. Eliminando del objeto de actualización.");
      // Si no se está cambiando el código o es el mismo, eliminar el campo
      // para evitar validaciones innecesarias
      delete updates.codigo;
    }
    
    // Validar tipo de descuento
    if (updates.tipoDescuento && !['porcentaje', 'monto'].includes(updates.tipoDescuento)) {
      throw {
        status: 400,
        code: 'INVALID_DISCOUNT_TYPE',
        message: 'Tipo de descuento inválido',
        detalles: {
          valorRecibido: updates.tipoDescuento,
          valoresPermitidos: ['porcentaje', 'monto']
        }
      };
    }
    
    // Validar valor de descuento
    if (updates.valor !== undefined) {
      const valor = Number(updates.valor);
      if (isNaN(valor) || valor <= 0) {
        throw {
          status: 400,
          code: 'INVALID_DISCOUNT_VALUE',
          message: 'El valor del descuento debe ser un número positivo',
          detalles: {
            valorRecibido: updates.valor
          }
        };
      }
      
      if (updates.tipoDescuento === 'porcentaje' && valor > 100) {
        throw {
          status: 400,
          code: 'INVALID_PERCENTAGE',
          message: 'El porcentaje de descuento no puede ser mayor a 100%',
          detalles: {
            valorRecibido: valor
          }
        };
      }
    }
    
    // Asegurar que cuponId esté presente en los datos de actualización
    if (!updates.cuponId) {
      updates.cuponId = cuponId;
    }
    
    console.log("Datos finales para actualizar:", JSON.stringify(updates));
    
    try {
      return this.repo.update(cuponId, updates);
    } catch (error) {
      console.error("Error al actualizar cupón en repositorio:", error);
      throw {
        status: 500,
        code: 'UPDATE_FAILED',
        message: 'Error al actualizar el cupón',
        detalles: {
          error: error.message
        }
      };
    }
  }


  async delete(cuponId) {
    console.log("Service: Iniciando eliminación de cupón", cuponId);
    
    // Verificar que el cupón existe
    const cupon = await this.repo.getById(cuponId);
    if (!cupon) {
      throw {
        status: 404,
        code: 'COUPON_NOT_FOUND',
        message: 'El cupón que intentas eliminar no existe'
      };
    }
    
    // Verificar si el cupón ha expirado
    const fechaActual = new Date();
    const haExpirado = cupon.fechaFin && new Date(cupon.fechaFin) < fechaActual;
    
    // Verificar si el cupón ha sido utilizado y NO ha expirado
    if (cupon.usuariosUsos && 
        Object.keys(cupon.usuariosUsos).length > 0 && 
        !haExpirado) {
      throw {
        status: 400,
        code: 'COUPON_HAS_USES',
        message: 'No se puede eliminar un cupón activo que ya ha sido utilizado',
        detalles: {
          usos: Object.keys(cupon.usuariosUsos).length,
          fechaFin: cupon.fechaFin,
          expirado: false,
          mensaje: 'Solo se pueden eliminar cupones que no han sido utilizados o que ya han expirado'
        }
      };
    }
    
    try {
      const result = await this.repo.delete(cuponId);
      return {
        cuponId,
        eliminado: true,
        message: haExpirado 
          ? 'Cupón expirado eliminado correctamente' 
          : 'Cupón eliminado correctamente'
      };
    } catch (error) {
      console.error("Error al eliminar cupón en repositorio:", error);
      throw {
        status: 500,
        code: 'DELETE_FAILED',
        message: 'Error al eliminar el cupón',
        detalles: {
          error: error.message
        }
      };
    }
  }

  // Obtener todos los cupones de un centro
  async findAllByCentroId(centroId, limit = 20, lastKey = undefined) {
    return this.repo.findAllByCentroId(centroId, limit, lastKey);
  }

  // Aplicar cupón por código
  async applyCoupon(codigo, centroId, userId) {
    if (!userId) {
      throw new Error('Se requiere el ID del usuario para aplicar el cupón');
    }

    // Verificar que el cupón exista
    const cupon = await this.repo.findByCodigo(codigo);
    if (!cupon) {
      throw new Error('Cupón no encontrado');
    }
    // Verificar que el cupón pertenezca al centro deportivo
    if (cupon.centroId !== centroId) {
      throw new Error('Este cupón no es válido para este centro deportivo');
    }
    // Verificar que el cupón esté vigente
    const ahora = new Date();
    if (cupon.fechaInicio && new Date(cupon.fechaInicio) > ahora) {
      throw new Error('Este cupón aún no está vigente');
    }
    if (cupon.fechaFin && new Date(cupon.fechaFin) < ahora) {
      throw new Error('Este cupón ya expiró');
    }

    // Verificar los usos del usuario específico
    const usosUsuario = cupon.usuariosUsos[userId] || 0;
    if (usosUsuario >= cupon.maximoUsos) {
      throw new Error(`Ya has usado este cupón el máximo número de veces permitido (${cupon.maximoUsos})`);
    }
    
    // Incrementar contador de usos para este usuario
    try {
      // Primero verificamos si ya existe el mapa usuariosUsos
      const getParams = {
        TableName: this.repo.CUPONES_DESCUENTO_TABLE,
        Key: { cuponId: cupon.cuponId },
        ProjectionExpression: "usuariosUsos"
      };
      
      const AWS = require('aws-sdk');
      const dynamoDB = new AWS.DynamoDB.DocumentClient();
      const getResult = await dynamoDB.get(getParams).promise();
      
      let updateExpression;
      let expressionAttributeValues;
      
      // Si el mapa usuariosUsos no existe, lo creamos
      if (!getResult.Item || !getResult.Item.usuariosUsos) {
        updateExpression = 'SET usuariosUsos = :newMap, updatedAt = :now';
        expressionAttributeValues = {
          ':newMap': { [userId]: 1 },
          ':now': new Date().toISOString()
        };
        
        // No usamos ExpressionAttributeNames en este caso
        const params = {
          TableName: this.repo.CUPONES_DESCUENTO_TABLE,
          Key: { cuponId: cupon.cuponId },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamoDB.update(params).promise();
        const updatedCupon = result.Attributes;
        
        return {
          ...updatedCupon,
          aplicado: true,
          tipoDescuento: cupon.tipoDescuento,
          valor: cupon.valor,
          usosRestantes: cupon.maximoUsos - (updatedCupon.usuariosUsos[userId] || 0)
        };
      } else {
        // Si ya existe, actualizamos el contador de ese usuario
        const currentUsos = getResult.Item.usuariosUsos[userId] || 0;
        updateExpression = 'SET usuariosUsos.#userId = :newCount, updatedAt = :now';
        expressionAttributeValues = {
          ':newCount': currentUsos + 1,
          ':now': new Date().toISOString()
        };
        
        // En este caso sí usamos ExpressionAttributeNames
        const params = {
          TableName: this.repo.CUPONES_DESCUENTO_TABLE,
          Key: { cuponId: cupon.cuponId },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: {
            '#userId': userId
          },
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW'
        };
        
        const result = await dynamoDB.update(params).promise();
        const updatedCupon = result.Attributes;
        
        return {
          ...updatedCupon,
          aplicado: true,
          tipoDescuento: cupon.tipoDescuento,
          valor: cupon.valor,
          usosRestantes: cupon.maximoUsos - (updatedCupon.usuariosUsos[userId] || 0)
        };
      }
      
    } catch (error) {
      console.error('Error al incrementar usos del cupón:', error);
      throw new Error(`Error al aplicar cupón: ${error.message}`);
    }
  }
}

module.exports = new CuponDescuentoService();
