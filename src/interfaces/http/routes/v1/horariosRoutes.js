// src/interfaces/http/routes/v1/horariosRoutes.js
const express = require('express');
const HorariosController = require('../../controllers/v1/horariosController');
const validarHorario = require('../../../middlewares/validarHorario');
// Importar el middleware de autenticación JWT existente
const auth = require('../../../middlewares/auth/jwtAuthMiddleware');
const authorization = require('../../../middlewares/authorization');
// Importar middleware de verificación de propiedad de cancha
const { verificarPropiedadCanchasBulk, verificarPropiedadCanchaUpdate } = require('../../../middlewares/auth/verificarPropiedadCanchaMiddleware');

// El controlador ahora tiene su propio servicio implementado internamente
const controller = new HorariosController();

// Middleware inline para validar UUID (copiado de centroDeportivoRoutes.js)
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

const router = express.Router();

// GET /api/v1/horarios/:id
router.get('/:id', validateUUID('id'), (req, res, next) => controller.getById(req, res, next));

// GET /api/v1/horarios?canchaId=...&fecha=...
router.get('/', (req, res, next) => controller.listByCanchaAndFecha(req, res, next));

// POST /api/v1/horarios
router.post('/', 
  auth, 
  authorization.checkPermission('write:horarios'), 
  validarHorario, // Este middleware ya validará y obtendrá el canchaId si no se proporciona
  (req, res, next) => controller.create(req, res, next)
);

// POST /api/v1/horarios/bulk
router.post('/bulk', 
  auth, 
  authorization.checkPermission('write:horarios'),
  verificarPropiedadCanchasBulk, // Este middleware validará las canchas para creación masiva
  (req, res, next) => controller.bulkCreate(req, res, next)
);

// GET /api/v1/horarios/rango-fechas
router.get('/rango-fechas', (req, res, next) => controller.listByCanchaAndRangoFechas(req, res, next));

// PATCH /api/v1/horarios/:id
router.patch('/:id', 
  validateUUID('id'), 
  auth, 
  authorization.checkPermission('update:horarios'),
  verificarPropiedadCanchaUpdate, // Este middleware validará que el usuario tenga permisos para actualizar este horario
  validarHorario, 
  (req, res, next) => controller.update(req, res, next)
);

// DELETE /api/v1/horarios/:id
router.delete('/:id', 
  validateUUID('id'), 
  auth, 
  authorization.checkPermission('delete:horarios'),
  verificarPropiedadCanchaUpdate, // Validar que el usuario tenga permisos para eliminar este horario
  (req, res, next) => controller.delete(req, res, next)
);

module.exports = router;