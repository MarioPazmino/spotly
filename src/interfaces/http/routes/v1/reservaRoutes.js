//src/interfaces/http/routes/v1/reservaRoutes.js
const express = require('express');
const router = express.Router();
const validarReserva = require('../../../middlewares/validarReserva');
const reservaController = require('../../controllers/v1/reservaController');
// Middleware de autenticación simplificado para desarrollo
const auth = (req, res, next) => {
  // En desarrollo, simulamos un usuario autenticado
  req.user = {
    userId: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'cliente',
    picture: null,
    registrationSource: 'cognito',
    pendienteAprobacion: null,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    groups: ['cliente']
  };
  next();
};
const authorization = require('../../../middlewares/authorization');
const { validate: isUuid } = require('uuid');

function validateUUID(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!isUuid(value)) {
      return res.status(400).json({
        message: `El parámetro ${paramName} debe ser un UUID válido.`
      });
    }
    next();
  };
}

// Crear reserva
router.post('/', auth, validarReserva, reservaController.crearReserva);
// Obtener reserva por ID
router.get('/:id', auth, validateUUID('id'), reservaController.obtenerReservaPorId);
// Obtener reservas por usuario
router.get('/usuario/:userId', auth, validateUUID('userId'), reservaController.obtenerReservasPorUsuario);
// Obtener reservas por cancha
router.get('/cancha/:canchaId', auth, validateUUID('canchaId'), reservaController.obtenerReservasPorCancha);
// Actualizar reserva
router.put('/:id', auth, validarReserva, validateUUID('id'), reservaController.actualizarReserva);
// Eliminar reserva
router.delete('/:id', auth, validateUUID('id'), (req, res, next) => reservaController.eliminarReserva(req, res, next));

module.exports = router;