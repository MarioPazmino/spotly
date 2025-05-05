//src/interfaces/http/controllers/v1/pagosController.js

const PagosService = require('../../../infrastructure/services/pagosService');
const pagosService = new PagosService();

module.exports = {
  async crearPago(req, res, next) {
    try {
      const pago = await pagosService.crearPago(req.body);
      res.status(201).json(pago);
    } catch (err) {
      next(err);
    }
  },

  async obtenerPagoPorId(req, res, next) {
    try {
      const pago = await pagosService.obtenerPagoPorId(req.params.pagoId);
      if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
      res.json(pago);
    } catch (err) {
      next(err);
    }
  },

  async obtenerPagosPorReserva(req, res, next) {
    try {
      const pagos = await pagosService.obtenerPagosPorReserva(req.params.reservaId);
      res.json(pagos);
    } catch (err) {
      next(err);
    }
  },

  async actualizarPago(req, res, next) {
    try {
      const pago = await pagosService.actualizarPago(req.params.pagoId, req.body);
      res.json(pago);
    } catch (err) {
      next(err);
    }
  },

  async eliminarPago(req, res, next) {
    try {
      await pagosService.eliminarPago(req.params.pagoId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};