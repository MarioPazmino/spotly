
// src/interfaces/http/routes/index.js (simplificado)
const express = require('express');
const router = express.Router();

// Versión 1 de la API
const v1 = express.Router();
router.use('/v1', v1);

// Rutas de usuarios
v1.use('/usuarios', require('./v1/userRoutes'));
v1.use('/centros-deportivos', require('./v1/centroDeportivoRoutes'));

// Futuras rutas
// v1.use('/centros-deportivos', require('./v1/centroDeportivoRoutes'));
// v1.use('/canchas', require('./v1/canchaRoutes'));

module.exports = router;


// Aquí se pueden registrar otras rutas de la versión 1
// router.use('/centros-deportivos', require('./centroDeportivoRoutes'));
// router.use('/canchas', require('./canchaRoutes'));
// router.use('/horarios', require('./horariosRoutes'));
// router.use('/reservas', require('./reservationRoutes'));
// router.use('/pagos', require('./pagosRoutes'));

