// src/interfaces/http/controllers/v1/cuponDescuentoController.js
const cuponDescuentoService = require('../../../infrastructure/services/cuponDescuentoService');

class CuponDescuentoController {
  async create(req, res, next) {
    try {
      const userId = req.user && req.user.id;
      const cupon = await cuponDescuentoService.create(req.body, userId);
      res.status(201).json(cupon);
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const cupon = await cuponDescuentoService.getById(req.params.cuponId);
      if (!cupon) return res.status(404).json({ error: 'Cupón no encontrado' });
      res.json(cupon);
    } catch (err) { next(err); }
  }

  async findByCodigo(req, res, next) {
    try {
      const cupon = await cuponDescuentoService.findByCodigo(req.params.codigo);
      if (!cupon) return res.status(404).json({ error: 'Cupón no encontrado' });
      res.json(cupon);
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const userId = req.user && req.user.id;
      const cupon = await cuponDescuentoService.update(req.params.cuponId, req.body, userId);
      res.json(cupon);
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await cuponDescuentoService.delete(req.params.cuponId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // Obtener todos los cupones de un centro
  async findAllByCentroId(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey) : undefined;
      const result = await cuponDescuentoService.findAllByCentroId(req.params.centroId, limit, lastKey);
      res.json(result);
    } catch (err) { next(err); }
  }

  // Nuevo: aplicar cupón
  async applyCoupon(req, res, next) {
    try {
      const { codigo, centroId } = req.body;
      const cupon = await cuponDescuentoService.applyCoupon({ codigo, centroId });
      res.json(cupon);
    } catch (err) { next(err); }
  }
}

module.exports = new CuponDescuentoController();