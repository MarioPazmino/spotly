// src/interfaces/http/routes/v1/horariosRoutes.js
const express = require('express');
const HorariosController = require('../../controllers/v1/HorariosController');
const horariosService = require('../../../infrastructure/services/horariosService');
const validarHorario = require('../../../middlewares/validarHorario');
const auth = require('../../../middlewares/CognitoAuthMiddleware').authenticate();
const authorization = require('../../../middlewares/authorization');

const controller = new HorariosController({ horariosService });
const router = express.Router();

// GET /api/v1/horarios/:id
router.get('/:id', (req, res, next) => controller.getById(req, res, next));

// GET /api/v1/horarios?canchaId=...&fecha=...
router.get('/', (req, res, next) => controller.listByCanchaAndFecha(req, res, next));

// GET /api/v1/horarios/by-reserva/:reservaId
router.get('/by-reserva/:reservaId', (req, res, next) => controller.listByReservaId(req, res, next));

// POST /api/v1/horarios
router.post('/', auth, (req, res, next) => {
  try {
    authorization.checkPermission('write:horarios')(req.user.groups);
    next();
  } catch (error) {
    next(error);
  }
}, validarHorario, (req, res, next) => controller.create(req, res, next));

// POST /api/v1/horarios/bulk
router.post('/bulk', auth, (req, res, next) => {
  try {
    authorization.checkPermission('write:horarios')(req.user.groups);
    next();
  } catch (error) {
    next(error);
  }
}, (req, res, next) => controller.bulkCreate(req, res, next));

// GET /api/v1/horarios/rango-fechas
router.get('/rango-fechas', (req, res, next) => controller.listByCanchaAndRangoFechas(req, res, next));

// PATCH /api/v1/horarios/:id
router.patch('/:id', auth, (req, res, next) => {
  try {
    authorization.checkPermission('update:horarios')(req.user.groups);
    next();
  } catch (error) {
    next(error);
  }
}, validarHorario, (req, res, next) => controller.update(req, res, next));

// DELETE /api/v1/horarios/:id
router.delete('/:id', auth, (req, res, next) => {
  try {
    authorization.checkPermission('delete:horarios')(req.user.groups);
    next();
  } catch (error) {
    next(error);
  }
}, (req, res, next) => controller.delete(req, res, next));

module.exports = router;