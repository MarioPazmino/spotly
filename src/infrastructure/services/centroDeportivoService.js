//src/infrastructure/services/centroDeportivoService.js
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const CentroDeportivo = require('../../domain/entities/centro-deportivo');
const Boom = require('@hapi/boom');

class CentroDeportivoService {
  constructor() {
    this.repo = new CentroDeportivoRepository();
  }

  async createCentro(centroData) {
    // Aquí puedes validar datos, verificar unicidad, etc.
    const centro = new CentroDeportivo(centroData);
    return await this.repo.save(centro);
  }

  async getCentroById(centroId) {
    const centro = await this.repo.findById(centroId);
    if (!centro) throw Boom.notFound('Centro deportivo no encontrado');
    return centro;
  }

  async updateCentro(centroId, updateData) {
    // Puedes validar permisos, datos, etc.
    return await this.repo.update(centroId, updateData);
  }

  async deleteCentro(centroId) {
    return await this.repo.delete(centroId);
  }

  // Otros métodos: buscar por usuario, listar todos, etc.
}

module.exports = new CentroDeportivoService();