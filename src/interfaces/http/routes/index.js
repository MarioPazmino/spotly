// src/interfaces/http/routes/index.js
const express = require('express');
const router = express.Router();
const v1Routes = require('./v1');

// Configura las rutas para cada versión
router.use('/v1', v1Routes);

router.use('/', v1Routes); 
module.exports = router;