// src/interfaces/http/routes/v1/index.js
const express = require('express');
const router = express.Router();

/**
 * Este archivo reúne todas las rutas de la versión 1 de la API
 */

// Importar las rutas específicas de cada recurso
const userRoutes = require('./userRoutes');

// Registrar las rutas de cada recurso
router.use('/usuarios', userRoutes);

// Aquí se pueden registrar otras rutas de la versión 1
// router.use('/centros-deportivos', require('./centroDeportivoRoutes'));
// router.use('/canchas', require('./canchaRoutes'));
// router.use('/horarios', require('./horariosRoutes'));
// router.use('/reservations', require('./reservationRoutes'));
// router.use('/pagos', require('./pagosRoutes'));

module.exports = router;