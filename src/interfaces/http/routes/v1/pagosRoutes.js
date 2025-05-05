//src/interfaces/http/routes/v1/pagosRoutes.js
const express = require('express');
const router = express.Router();
const pagosController = require('../../controllers/v1/pagosController');
const auth = require('../../../middlewares/CognitoAuthMiddleware').authenticate();
const validarPagos = require('../../../middlewares/validarPagos');

// Crear pago
router.post('/', auth, validarPagos, pagosController.crearPago);
// Obtener pago por ID
router.get('/:pagoId', auth, pagosController.obtenerPagoPorId);
// Obtener pagos por reserva
router.get('/reserva/:reservaId', auth, pagosController.obtenerPagosPorReserva);
// Actualizar pago
router.put('/:pagoId', auth, validarPagos, pagosController.actualizarPago);
// Eliminar pago
router.delete('/:pagoId', auth, pagosController.eliminarPago);

module.exports = router;