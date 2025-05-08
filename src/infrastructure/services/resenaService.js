const Resena = require('../../domain/entities/resena');
const ResenaRepository = require('../repositories/resenaRepository');
const CanchaRepository = require('../repositories/canchasRepository');
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');

class ResenaService {
  constructor() {
    this.resenaRepository = ResenaRepository;
    this.canchaRepository = CanchaRepository;
    this.centroRepository = CentroDeportivoRepository;
  }

  async crearResena(resenaData) {
    // Validar existencia de cancha o centro
    if (resenaData.canchaId) {
      const cancha = await this.canchaRepository.findById(resenaData.canchaId);
      if (!cancha) {
        throw new Error('La cancha especificada no existe');
      }
      // Si la cancha existe, obtener el centroId asociado
      resenaData.centroId = cancha.centroDeportivoId;
    } else if (resenaData.centroId) {
      const centro = await this.centroRepository.findById(resenaData.centroId);
      if (!centro) {
        throw new Error('El centro deportivo especificado no existe');
      }
    }

    // Validar que el usuario no haya hecho una reseña previa
    if (resenaData.canchaId) {
      const reseñaExistente = await this.resenaRepository.findByUserAndCancha(
        resenaData.userId,
        resenaData.canchaId
      );
      if (reseñaExistente) {
        throw new Error('Ya has realizado una reseña para esta cancha');
      }
    } else if (resenaData.centroId) {
      const reseñaExistente = await this.resenaRepository.findByUserAndCentro(
        resenaData.userId,
        resenaData.centroId
      );
      if (reseñaExistente) {
        throw new Error('Ya has realizado una reseña para este centro deportivo');
      }
    }

    const resena = new Resena(resenaData);
    resena.validar();
    return await this.resenaRepository.create(resena);
  }

  async actualizarResena(resenaId, updateData) {
    const resenaExistente = await this.resenaRepository.findById(resenaId);
    if (!resenaExistente) {
      throw new Error('Reseña no encontrada');
    }

    // Si se está actualizando la cancha o centro, validar su existencia
    if (updateData.canchaId) {
      const cancha = await this.canchaRepository.findById(updateData.canchaId);
      if (!cancha) {
        throw new Error('La cancha especificada no existe');
      }
      updateData.centroId = cancha.centroDeportivoId;
    } else if (updateData.centroId) {
      const centro = await this.centroRepository.findById(updateData.centroId);
      if (!centro) {
        throw new Error('El centro deportivo especificado no existe');
      }
    }

    // Validar que no exista otra reseña del mismo usuario para el nuevo elemento
    if (updateData.canchaId && updateData.canchaId !== resenaExistente.canchaId) {
      const reseñaExistente = await this.resenaRepository.findByUserAndCancha(
        resenaExistente.userId,
        updateData.canchaId
      );
      if (reseñaExistente) {
        throw new Error('Ya existe una reseña de este usuario para la cancha especificada');
      }
    } else if (updateData.centroId && updateData.centroId !== resenaExistente.centroId) {
      const reseñaExistente = await this.resenaRepository.findByUserAndCentro(
        resenaExistente.userId,
        updateData.centroId
      );
      if (reseñaExistente) {
        throw new Error('Ya existe una reseña de este usuario para el centro especificado');
      }
    }

    return await this.resenaRepository.update(resenaId, updateData);
  }

  async obtenerResena(resenaId) {
    const resena = await this.resenaRepository.findById(resenaId);
    if (!resena) {
      throw new Error('Reseña no encontrada');
    }
    return resena;
  }

  async obtenerResenasPorUsuario(userId) {
    return await this.resenaRepository.findByUserId(userId);
  }

  async obtenerResenasPorCancha(canchaId) {
    const cancha = await this.canchaRepository.findById(canchaId);
    if (!cancha) {
      throw new Error('La cancha especificada no existe');
    }
    return await this.resenaRepository.findByCanchaId(canchaId);
  }

  async obtenerResenasPorCentro(centroId) {
    const centro = await this.centroRepository.findById(centroId);
    if (!centro) {
      throw new Error('El centro deportivo especificado no existe');
    }
    return await this.resenaRepository.findByCentroId(centroId);
  }

  async eliminarResena(resenaId) {
    const resena = await this.resenaRepository.findById(resenaId);
    if (!resena) {
      throw new Error('Reseña no encontrada');
    }
    await this.resenaRepository.delete(resenaId);
  }

  async obtenerResenasFiltradas({ canchaId, centroId, calificacionMinima, lastEvaluatedKey, limit }) {
    // Validar existencia de cancha o centro
    if (canchaId) {
      const cancha = await this.canchaRepository.findById(canchaId);
      if (!cancha) {
        throw new Error('La cancha especificada no existe');
      }
    } else {
      const centro = await this.centroRepository.findById(centroId);
      if (!centro) {
        throw new Error('El centro deportivo especificado no existe');
      }
    }

    return await this.resenaRepository.findWithFilters({
      canchaId,
      centroId,
      calificacionMinima,
      lastEvaluatedKey,
      limit
    });
  }

  async obtenerEstadisticasCancha(canchaId) {
    const cancha = await this.canchaRepository.findById(canchaId);
    if (!cancha) {
      throw new Error('La cancha especificada no existe');
    }
    return await this.resenaRepository.obtenerEstadisticasCalificacionesCancha(canchaId);
  }

  async obtenerEstadisticasCentro(centroId) {
    const centro = await this.centroRepository.findById(centroId);
    if (!centro) {
      throw new Error('El centro deportivo especificado no existe');
    }
    return await this.resenaRepository.obtenerEstadisticasCalificacionesCentro(centroId);
  }
}

module.exports = ResenaService; 