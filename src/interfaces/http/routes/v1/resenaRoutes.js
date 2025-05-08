//src/interfaces/http/routes/v1/resenaRoutes.js
const express = require('express');
const ResenaController = require('../../controllers/v1/resenaController');
const validarResena = require('../../../middlewares/validarResena');
const authorization = require('../../../middlewares/authorization');
const { validate: isUuid } = require('uuid');

const router = express.Router();
const resenaController = new ResenaController();

// Middleware para validar UUIDs en parámetros
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

// Rutas públicas
router.get('/cancha/:canchaId', resenaController.obtenerResenasPorCancha.bind(resenaController));
router.get('/centro/:centroId', resenaController.obtenerResenasPorCentro.bind(resenaController));
router.get('/filtradas', resenaController.obtenerResenasFiltradas.bind(resenaController));
router.get('/estadisticas/cancha/:canchaId', resenaController.obtenerEstadisticasCancha.bind(resenaController));
router.get('/estadisticas/centro/:centroId', resenaController.obtenerEstadisticasCentro.bind(resenaController));

// Rutas protegidas
router.use((req, res, next) => authorization.autenticar(req, res, next));
router.post('/', validarResena, resenaController.crearResena.bind(resenaController));
router.put('/:resenaId', validarResena, resenaController.actualizarResena.bind(resenaController));
router.get('/:resenaId', resenaController.obtenerResena.bind(resenaController));
router.get('/usuario/:userId', resenaController.obtenerResenasPorUsuario.bind(resenaController));
router.delete('/:resenaId', resenaController.eliminarResena.bind(resenaController));

module.exports = router; 