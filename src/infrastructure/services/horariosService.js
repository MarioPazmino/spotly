// src/infrastructure/services/horariosService.js
const horariosRepository = require('../repositories/horariosRepository');

class HorariosService {
  constructor(repo = horariosRepository) {
    this.repo = repo;
  }

  async getById(horarioId) {
    return this.repo.getById(horarioId);
  }

  /**
   * Lista horarios por cancha y rango de fechas, paginado
   */
  async listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, limit = 20, exclusiveStartKey = null, estado = null) {
    return this.repo.listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, limit, exclusiveStartKey, estado);
  }

  /**
   * Lista horarios por cancha y fecha, paginado
   */
  async listByCanchaAndFecha(canchaId, fecha, limit = 20, exclusiveStartKey = null) {
    return this.repo.listByCanchaAndFecha(canchaId, fecha, limit, exclusiveStartKey);
  }

  /**
   * Lista horarios por reservaId, paginado
   */
  async listByReservaId(reservaId, limit = 20, exclusiveStartKey = null) {
    return this.repo.listByReservaId(reservaId, limit, exclusiveStartKey);
  }

  /**
   * Crea un horario validando solapamientos
   */
  async create(data) {
    const { canchaId, fecha, horaInicio, horaFin } = data;
    const existentes = await this.repo.listByCanchaAndFecha(canchaId, fecha);
    // Verificar solapamiento
    for (const h of existentes) {
      if (
        (horaInicio < h.horaFin && horaFin > h.horaInicio)
      ) {
        throw new Error('El horario se solapa con otro existente: ' + h.horaInicio + '-' + h.horaFin);
      }
    }
    return this.repo.create(data);
  }

  /**
   * Actualiza un horario validando solapamientos
   */
  async update(horarioId, updates) {
    // Obtener el horario actual para conservar canchaId y fecha
    const actual = await this.repo.getById(horarioId);
    // Si el horario ya tiene reservaId o estado 'Reservado', NO permitir cambiar horaInicio ni horaFin
    const tieneReserva = actual.reservaId || actual.estado === 'Reservado';
    if (tieneReserva && (updates.horaInicio !== undefined || updates.horaFin !== undefined)) {
      throw new Error('No se puede modificar horaInicio ni horaFin de un horario reservado o con reserva asociada');
    }
    const canchaId = updates.canchaId || actual.canchaId;
    const fecha = updates.fecha || actual.fecha;
    const horaInicio = updates.horaInicio || actual.horaInicio;
    const horaFin = updates.horaFin || actual.horaFin;
    const existentes = await this.repo.listByCanchaAndFecha(canchaId, fecha);
    for (const h of existentes) {
      if (h.horarioId !== horarioId && (horaInicio < h.horaFin && horaFin > h.horaInicio)) {
        throw new Error('El horario actualizado se solapa con otro existente: ' + h.horaInicio + '-' + h.horaFin);
      }
    }
    return this.repo.update(horarioId, updates);
  }

  async delete(horarioId) {
    return this.repo.delete(horarioId);
  }

  /**
   * Crea múltiples horarios a la vez, validando solapamientos
   * @param {Array} horariosArray
   */
  async bulkCreate(horariosArray) {
    if (!Array.isArray(horariosArray) || horariosArray.length === 0) {
      throw new Error('Debe enviar un array de horarios');
    }
    // Agrupar por canchaId y fecha
    const agrupados = {};
    for (const h of horariosArray) {
      const key = `${h.canchaId}|${h.fecha}`;
      if (!agrupados[key]) agrupados[key] = [];
      agrupados[key].push(h);
    }
    // Validar solapamiento entre los nuevos y con los existentes
    for (const key of Object.keys(agrupados)) {
      const [canchaId, fecha] = key.split('|');
      const nuevos = agrupados[key];
      // 1. Validar solapamiento entre los nuevos
      for (let i = 0; i < nuevos.length; i++) {
        for (let j = i + 1; j < nuevos.length; j++) {
          if (nuevos[i].horaInicio < nuevos[j].horaFin && nuevos[i].horaFin > nuevos[j].horaInicio) {
            throw new Error(`Solapamiento entre horarios enviados: ${nuevos[i].horaInicio}-${nuevos[i].horaFin} y ${nuevos[j].horaInicio}-${nuevos[j].horaFin}`);
          }
        }
      }
      // 2. Validar solapamiento con los existentes
      const existentes = await this.repo.listByCanchaAndFecha(canchaId, fecha);
      for (const nuevo of nuevos) {
        for (const existente of existentes) {
          if (nuevo.horaInicio < existente.horaFin && nuevo.horaFin > existente.horaInicio) {
            throw new Error(`El horario ${nuevo.horaInicio}-${nuevo.horaFin} se solapa con existente: ${existente.horaInicio}-${existente.horaFin}`);
          }
        }
      }
    }
    // Si todo OK, crear todos
    const creados = [];
    for (const h of horariosArray) {
      const creado = await this.repo.create(h);
      creados.push(creado);
    }
    return creados;
  }
}

module.exports = new HorariosService();
