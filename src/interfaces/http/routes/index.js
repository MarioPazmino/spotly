// src/interfaces/http/routes/index.js
const express = require('express');
const router = express.Router();
const v1Routes = require('./v1');

/**
 * Este es el archivo central para el manejo de versiones en las rutas.
 * Todas las versiones de la API se registran aquí.
 */

// Configura las rutas para cada versión
router.use('/v1', v1Routes);

// Cuando tengas la versión 2 lista, puedes agregar:
// const v2Routes = require('./v2');
// router.use('/v2', v2Routes);

// Ruta por defecto (última versión estable)
router.use('/', v1Routes); // Actualmente apunta a v1, pero podría cambiar en el futuro

module.exports = router;