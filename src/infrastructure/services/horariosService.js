// src/infrastructure/services/horariosService.js
const horariosRepository = require('../repositories/horariosRepository');
const { normalizarFechaHoraGuayaquil, formatearHoraGuayaquil, ZONA_GUAYAQUIL } = require('../../utils/fechas');

class HorariosService {
  constructor(repo = horariosRepository) {
    this.repo = repo;
  }

  async getById(horarioId) {
    const horario = await this.repo.getById(horarioId);
    if (!horario) return null;
    // Normaliza las horas a zona Guayaquil
    horario.horaInicio = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaInicio));
    horario.horaFin = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaFin));
    return horario;
  }

  /**
   * Lista horarios por cancha y rango de fechas, paginado
   */
  async listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, limit = 20, exclusiveStartKey = null, estado = null) {
    const result = await this.repo.listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, limit, exclusiveStartKey, estado);
    // Normaliza las horas a zona Guayaquil
    result.items = result.items.map(horario => {
      horario.horaInicio = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaInicio));
      horario.horaFin = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaFin));
      return horario;
    });
    return result;
  }

  /**
   * Lista horarios por cancha y fecha, paginado
   */
  async listByCanchaAndFecha(canchaId, fecha, limit = 20, exclusiveStartKey = null, estado = null) {
    const result = await this.repo.listByCanchaAndFecha(canchaId, fecha, limit, exclusiveStartKey, estado);
    // Normaliza las horas a zona Guayaquil
    result.items = result.items.map(horario => {
      horario.horaInicio = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaInicio));
      horario.horaFin = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaFin));
      return horario;
    });
    return result;
  }

  /**
   * Lista horarios por reservaId, paginado
   */
  async listByReservaId(reservaId, limit = 20, exclusiveStartKey = null, estado = null) {
    const result = await this.repo.listByReservaId(reservaId, limit, exclusiveStartKey, estado);
    // Normaliza las horas a zona Guayaquil
    result.items = result.items.map(horario => {
      horario.horaInicio = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaInicio));
      horario.horaFin = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaFin));
      return horario;
    });
    return result;
  }

  /**
   * Crea un horario validando solapamientos
   */
  async create(data) {
    let { canchaId, fecha, horaInicio, horaFin } = data;
    // Normalizar a zona Guayaquil (por si el frontend envía otra zona)
    const inicioUTC = normalizarFechaHoraGuayaquil(fecha, horaInicio);
    const finUTC = normalizarFechaHoraGuayaquil(fecha, horaFin);
    // Guardar siempre en formato HH:mm (hora local Guayaquil)
    horaInicio = formatearHoraGuayaquil(inicioUTC);
    horaFin = formatearHoraGuayaquil(finUTC);
    fecha = format(utcToZonedTime(inicioUTC, ZONA_GUAYAQUIL), 'yyyy-MM-dd', { timeZone: ZONA_GUAYAQUIL });
    // Validar solapamiento
    const existentes = await this.repo.listByCanchaAndFecha(canchaId, fecha);
    for (const h of existentes) {
      if (
        (horaInicio < h.horaFin && horaFin > h.horaInicio)
      ) {
        throw new Error('El horario se solapa con otro existente: ' + h.horaInicio + '-' + h.horaFin);
      }
    }
    // Guardar datos normalizados
    return this.repo.create({ ...data, fecha, horaInicio, horaFin });
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
    // 3. Validar duplicados exactos (canchaId, fecha, horaInicio, horaFin)
    const existentesPorCanchaFecha = {};
    for (const key of Object.keys(agrupados)) {
      const [canchaId, fecha] = key.split('|');
      if (!existentesPorCanchaFecha[key]) {
        existentesPorCanchaFecha[key] = await this.repo.listByCanchaAndFecha(canchaId, fecha);
      }
    }
    // Si todo OK, crear todos (evitando duplicados exactos)
    const creados = [];
    const duplicados = [];
    for (const h of horariosArray) {
      const key = `${h.canchaId}|${h.fecha}`;
      const existentes = existentesPorCanchaFecha[key] || [];
      const yaExiste = existentes.some(ex =>
        ex.horaInicio === h.horaInicio &&
        ex.horaFin === h.horaFin &&
        ex.canchaId === h.canchaId &&
        ex.fecha === h.fecha
      );
      if (!yaExiste) {
        const creado = await this.repo.create(h);
        creados.push(creado);
      } else {
        duplicados.push(h);
      }
    }
    return { creados, duplicados };

  }

  /**
   * Actualiza múltiples horarios a la vez
   * @param {Array} updatesArray [{horarioId, ...camposAActualizar}]
   */
  async bulkUpdate(updatesArray) {}

  /**
   * Elimina todos los horarios de una cancha en un rango de fechas
   * @param {string} canchaId
   * @param {string} fechaInicio
   * @param {string} fechaFin
   * @returns {Promise<Array>} Array de horarioIds eliminados
   */
  async deleteByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin) {
    return await this.repo.deleteByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin);
  }

  async bulkUpdate(updatesArray) {
    if (!Array.isArray(updatesArray) || updatesArray.length === 0) {
      throw new Error('Debe enviar un array de actualizaciones');
    }
    const actualizados = [];
    for (const upd of updatesArray) {
      if (!upd.horarioId) throw new Error('Falta horarioId en una actualización');
      // Puedes agregar validaciones de solapamiento si es necesario
      const actualizado = await this.repo.update(upd.horarioId, upd);
      actualizados.push(actualizado);
    }
    return actualizados;
  }
}

module.exports = new HorariosService();
