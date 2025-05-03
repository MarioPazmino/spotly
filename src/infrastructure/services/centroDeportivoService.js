//src/infrastructure/services/centroDeportivoService.js
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const CentroDeportivo = require('../../domain/entities/centro-deportivo');
const Boom = require('@hapi/boom');
const { v4: uuidv4 } = require('uuid'); // Necesitarás añadir esta dependencia

class CentroDeportivoService {
  constructor() {
    this.repo = new CentroDeportivoRepository();
  }

  async listCentros(filters = {}, options = {}) {
    return await this.repo.findAll(filters, options);
  }

  async createCentro(centroData) {
    // Validar datos necesarios
    if (!centroData.nombre || !centroData.direccion || !centroData.telefonoPrincipal || !centroData.userId) {
      throw Boom.badRequest('Faltan campos obligatorios para crear el centro deportivo');
    }

    // Crear un centro deportivo con ID único
    const centro = new CentroDeportivo({
      ...centroData,
      centroId: centroData.centroId || uuidv4(),  // Usar ID existente o generar uno nuevo
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return await this.repo.save(centro);
  }

  async getCentroById(centroId) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    
    const centro = await this.repo.findById(centroId);
    if (!centro) throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    return centro;
  }

  async updateCentro(centroId, updateData) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    
    // Verificar que el centro existe
    const existingCentro = await this.repo.findById(centroId);
    if (!existingCentro) {
      throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    }

    // Validar que haya al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      throw Boom.badRequest('Debe proporcionar al menos un campo para actualizar');
    }
    
    // Añadir marca de tiempo de actualización
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    return await this.repo.update(centroId, dataToUpdate);
  }

  async deleteCentro(centroId) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    
    // Verificar que el centro existe
    const existingCentro = await this.repo.findById(centroId);
    if (!existingCentro) {
      throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    }
    
    return await this.repo.delete(centroId);
  }

  // Método auxiliar para validar el formato del centroId
  validateCentroId(centroId) {
    // Verificar que el ID no sea null o undefined
    if (!centroId) {
      throw Boom.badRequest('El ID del centro deportivo es obligatorio');
    }
    
    // Verificar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(centroId)) {
      throw Boom.badRequest('El formato del ID de centro deportivo es inválido');
    }
  }

  // Validar propiedad del centro deportivo
  async validateOwnership(centroId, userId) {
    const centro = await this.getCentroById(centroId);
    if (centro.userId !== userId) {
      throw Boom.forbidden('No tienes permisos para modificar este centro deportivo');
    }
    return centro;
  }
}

module.exports = new CentroDeportivoService();