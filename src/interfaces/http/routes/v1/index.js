// src/interfaces/http/routes/v1/index.js
const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');

// Registrar las rutas de usuarios
router.use('/usuarios', userRoutes);

// Aquí se pueden registrar otras rutas de la versión 1
// router.use('/centros-deportivos', require('./centroDeportivoRoutes'));
// router.use('/canchas', require('./canchaRoutes'));
// router.use('/horarios', require('./horariosRoutes'));
// router.use('/reservas', require('./reservationRoutes'));
// router.use('/pagos', require('./pagosRoutes'));

module.exports = router;
