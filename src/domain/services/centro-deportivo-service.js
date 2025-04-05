import Boom from '@hapi/boom';

class CentroDeportivoService {
  constructor(centroDeportivoRepository) {
    this.centroDeportivoRepository = centroDeportivoRepository;
  }

  async getAllCentrosDeportivos() {
    return this.centroDeportivoRepository.getAll();
  }

  async getCentroDeportivoById(id) {
    return this.centroDeportivoRepository.getById(id);
  }

  async createCentroDeportivo(centroDeportivo) {
    return this.centroDeportivoRepository.create(centroDeportivo);
  }

  async updateCentroDeportivo(id, centroDeportivo) {
    return this.centroDeportivoRepository.update(id, centroDeportivo);
  }

  async deleteCentroDeportivo(id) {
    return this.centroDeportivoRepository.delete(id);
  }
}

export default CentroDeportivoService;
