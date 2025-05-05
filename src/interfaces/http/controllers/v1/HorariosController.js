// src/interfaces/http/controllers/v1/HorariosController.js
const HorariosService = require('../../../services/horariosService');

class HorariosController {
  // GET /api/v1/horarios/rango-fechas?canchaId=...&fechaInicio=...&fechaFin=...&limit=...&exclusiveStartKey=...
  // GET /api/v1/horarios/rango-fechas?canchaId=...&fechaInicio=...&fechaFin=...&limit=...&exclusiveStartKey=...&estado=...
  async listByCanchaAndRangoFechas(req, res, next) {
    try {
      const { canchaId, fechaInicio, fechaFin, limit, exclusiveStartKey, estado } = req.query;
      if (!canchaId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'canchaId, fechaInicio y fechaFin son requeridos' });
      }
      const result = await this.horariosService.listByCanchaAndRangoFechas(
        canchaId,
        fechaInicio,
        fechaFin,
        limit ? parseInt(limit) : 20,
        exclusiveStartKey ? JSON.parse(exclusiveStartKey) : null,
        estado || null
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
  // POST /api/v1/horarios/bulk
  async bulkCreate(req, res, next) {
    try {
      const horarios = req.body.horarios;
      if (!Array.isArray(horarios) || horarios.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un array de horarios' });
      }
      // Validar formato y consistencia de cada horario
      const errores = [];
      for (let i = 0; i < horarios.length; i++) {
        const h = horarios[i];
        if (!h.horaInicio || !h.horaFin) {
          errores.push({ idx: i, error: 'Faltan horaInicio u horaFin' });
          continue;
        }
        if (!/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(h.horaInicio) || !/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(h.horaFin)) {
          errores.push({ idx: i, error: 'Formato de hora inválido (debe ser HH:mm:ss)' });
          continue;
        }
        if (h.horaInicio >= h.horaFin) {
          errores.push({ idx: i, error: 'horaInicio debe ser menor que horaFin' });
        }
      }
      if (errores.length > 0) {
        return res.status(400).json({ error: 'Errores de validación en horarios', detalles: errores });
      }
      // El service ahora retorna {creados, duplicados}
      const { creados, duplicados } = await this.horariosService.bulkCreate(horarios);
      res.status(201).json({ creados, duplicados });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/v1/horarios/bulk
  async bulkUpdate(req, res, next) {
    try {
      const updates = req.body.updates;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un array de actualizaciones' });
      }
      const actualizados = await this.horariosService.bulkUpdate(updates);
      res.status(200).json({ actualizados });
    } catch (err) {
      next(err);
    }
  }
  /**
   * DELETE /api/v1/horarios/rango-fechas?canchaId=...&fechaInicio=...&fechaFin=...
   * Elimina todos los horarios de una cancha en un rango de fechas
   */
  async deleteByCanchaAndRangoFechas(req, res, next) {
    try {
      const { canchaId, fechaInicio, fechaFin } = req.query;
      if (!canchaId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'canchaId, fechaInicio y fechaFin son requeridos' });
      }
      const eliminados = await this.horariosService.deleteByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin);
      res.status(200).json({ eliminados });
    } catch (err) {
      next(err);
    }
  }

  constructor({ horariosService }) {
    this.horariosService = horariosService;
  }

  // GET /api/v1/horarios/:id
  async getById(req, res, next) {
    try {
      const horario = await this.horariosService.getById(req.params.id);
      if (!horario) return res.status(404).json({ message: 'Horario no encontrado' });
      res.json(horario);
    } catch (err) { next(err); }
  }

  // GET /api/v1/horarios?canchaId=...&fecha=...
  async listByCanchaAndFecha(req, res, next) {
    try {
      const { canchaId, fecha, limit, exclusiveStartKey, estado } = req.query;
      if (!canchaId || !fecha) return res.status(400).json({ message: 'canchaId y fecha son requeridos' });
      const result = await this.horariosService.listByCanchaAndFecha(
        canchaId,
        fecha,
        limit ? parseInt(limit) : 20,
        exclusiveStartKey ? JSON.parse(exclusiveStartKey) : null,
        estado || null
      );
      res.json(result);
    } catch (err) { next(err); }
  }

  // GET /api/v1/horarios/by-reserva/:reservaId
  async listByReservaId(req, res, next) {
    try {
      const { limit, exclusiveStartKey, estado } = req.query;
      const result = await this.horariosService.listByReservaId(
        req.params.reservaId,
        limit ? parseInt(limit) : 20,
        exclusiveStartKey ? JSON.parse(exclusiveStartKey) : null,
        estado || null
      );
      res.json(result);
    } catch (err) { next(err); }
  }

  // POST /api/v1/horarios
  async create(req, res, next) {
    try {
      const horario = await this.horariosService.create(req.body);
      res.status(201).json(horario);
    } catch (err) { next(err); }
  }

  // PATCH /api/v1/horarios/:id
  async update(req, res, next) {
    try {
      const horario = await this.horariosService.update(req.params.id, req.body);
      res.json(horario);
    } catch (err) { next(err); }
  }

  // DELETE /api/v1/horarios/:id
  async delete(req, res, next) {
    try {
      await this.horariosService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

module.exports = HorariosController;