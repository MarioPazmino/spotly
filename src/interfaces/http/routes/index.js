
// src/interfaces/http/routes/index.js (simplificado)
const express = require('express');
const router = express.Router();

// Versión 1 de la API
const v1 = express.Router();
router.use('/v1', v1);

// Rutas de usuarios
v1.use('/usuarios', require('./v1/userRoutes'));
v1.use('/centros-deportivos', require('./v1/centroDeportivoRoutes'));
v1.use('/canchas', require('./v1/canchasRoutes'));
v1.use('/horarios', require('./v1/horariosRoutes'));
v1.use('/cupones-descuento', require('./v1/cuponDescuentoRoutes'));
v1.use('/reservas', require('./v1/reservaRoutes'));
v1.use('/pagos', require('./v1/pagosRoutes'));

module.exports = router;
