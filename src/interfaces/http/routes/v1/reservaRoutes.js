//src/interfaces/http/routes/v1/reservaRoutes.js
const express = require('express');
const router = express.Router();
const validarReserva = require('../../../middlewares/validarReserva');
const reservaController = require('../../controllers/v1/reservaController');
// Importar el middleware de autenticación JWT
const auth = require('../../../middlewares/auth/jwtAuthMiddleware');
const authorization = require('../../../middlewares/authorization');
const { validate: isUuid } = require('uuid');

function validateUUID(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    console.log(`Validando UUID para ${paramName}: ${value}`);
    
    // Si es la ruta de usuario, permitimos el formato no estándar de UUID
    if (paramName === 'userId' && req.path.includes('/usuario/')) {
      console.log(`Omitiendo validación estricta de UUID para userId: ${value}`);
      next();
      return;
    }
    
    if (!isUuid(value)) {
      console.log(`UUID inválido para ${paramName}: ${value}`);
      return res.status(400).json({
        message: `El parámetro ${paramName} debe ser un UUID válido.`
      });
    }
    console.log(`UUID válido para ${paramName}: ${value}`);
    next();
  };
}

// Crear reserva
router.post('/', auth, validarReserva, reservaController.crearReserva);
// Obtener reservas por usuario - IMPORTANTE: Rutas específicas primero
router.get('/usuario/:userId', auth, validateUUID('userId'), reservaController.obtenerReservasPorUsuario);
// Obtener reservas por cancha - IMPORTANTE: Rutas específicas primero
router.get('/cancha/:canchaId', auth, validateUUID('canchaId'), reservaController.obtenerReservasPorCancha);
// Obtener reserva por ID - IMPORTANTE: Rutas genéricas después
router.get('/:id', auth, validateUUID('id'), reservaController.obtenerReservaPorId);
// Actualizar reserva
//router.put('/:id', auth, validarReserva, validateUUID('id'), (req, res, next) => reservaController.actualizarReserva(req, res, next));
// Eliminar reserva
router.delete('/:id', auth, validateUUID('id'), (req, res, next) => reservaController.eliminarReserva(req, res, next));

module.exports = router;