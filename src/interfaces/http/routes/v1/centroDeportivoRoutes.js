//src/interfaces/http/routes/v1/centroDeportivoRoutes.js
const express = require('express');
const router = express.Router();
const CentroDeportivoController = require('../../controllers/v1/CentroDeportivoController');
const auth = require('../../../middlewares/CognitoAuthMiddleware').authenticate();
const validateCentro = require('../../../middlewares/validateCentroDeportivo');
const Authorization = require('../../../middlewares/authorization');

// Crear centro deportivo (solo admin_centro o super_admin)
router.post('/centros', auth, validateCentro, (req, res, next) => {
  try {
    Authorization.checkPermission('write:centro')([req.user.role]);
    CentroDeportivoController.createCentro(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Obtener centro deportivo por ID (acceso público o autenticado)
router.get('/centros/:centroId', auth, CentroDeportivoController.getCentroById);

// Actualizar centro deportivo (solo admin_centro dueño o super_admin)
router.put('/centros/:centroId', auth, validateCentro, (req, res, next) => {
  try {
    Authorization.checkPermission('update:centro')([req.user.role]);
    CentroDeportivoController.updateCentro(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Eliminar centro deportivo (solo admin_centro dueño o super_admin)
router.delete('/centros/:centroId', auth, (req, res, next) => {
  try {
    Authorization.checkPermission('delete:centro')([req.user.role]);
    CentroDeportivoController.deleteCentro(req, res, next);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
