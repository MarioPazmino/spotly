// src/interfaces/http/routes/v1/centroDeportivoRoutes.js
const express = require('express');
const router = express.Router();
const CentroDeportivoController = require('../../controllers/v1/CentroDeportivoController');
const auth = require('../../../middlewares/CognitoAuthMiddleware').authenticate();
const { validateCentro, validateLocationSearch, validateCentroQuery, validateImagenes } = require('../../../middlewares/validateCentroDeportivo');
const Authorization = require('../../../middlewares/authorization');
const ImagenCentroController = require('../../controllers/v1/uploadImagenes/ImagenCentroController');
const multer = require('multer');
const upload = multer(); // memoria, no disco
const checkCentroOwnership = require('../../../middlewares/checkCentroOwnership');
const { validate: isUuid } = require('uuid');

// Middleware inline para validar UUID
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

// Listar centros deportivos (acceso público o autenticado)
router.get('/centros', auth, validateCentroQuery, CentroDeportivoController.listCentros);

// NUEVO ENDPOINT: Buscar centros deportivos por ubicación GPS
router.get('/centros/cercanos', auth, validateLocationSearch, CentroDeportivoController.findCentrosByLocation);

// Crear centro deportivo (solo admin_centro o super_admin)
router.post('/centros', auth, validateCentro, (req, res, next) => {
  try {
    Authorization.checkPermission('write:centro')(req.user.groups);
    // Asignar el ID del usuario al centro deportivo
    req.body.userId = req.user.sub;
    CentroDeportivoController.createCentro(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Obtener centro deportivo por ID (acceso público o autenticado)
router.get('/centros/:centroId', auth, validateUUID('centroId'), CentroDeportivoController.getCentroById);

// Actualizar centro deportivo (solo admin_centro dueño o super_admin)
router.put('/centros/:centroId', 
  auth, 
  validateUUID('centroId'),
  validateCentro,
  checkCentroOwnership,
  (req, res, next) => {
    try {
      Authorization.checkPermission('update:centro')(req.user.groups);
      CentroDeportivoController.updateCentro(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Actualizar parcialmente centro deportivo (solo admin_centro dueño o super_admin)
router.patch('/centros/:centroId',
  auth,
  validateUUID('centroId'),
  validateCentro,
  checkCentroOwnership,
  (req, res, next) => {
    try {
      Authorization.checkPermission('update:centro')(req.user.groups);
      CentroDeportivoController.updateCentro(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Eliminar centro deportivo (solo admin_centro dueño o super_admin)
router.delete('/centros/:centroId',
  auth,
  validateUUID('centroId'),
  checkCentroOwnership,
  (req, res, next) => {
    try {
      Authorization.checkPermission('delete:centro')(req.user.groups);
      CentroDeportivoController.deleteCentro(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

// Subir imágenes a un centro deportivo
router.post('/centros/:centroId/imagenes',
  auth,
  validateUUID('centroId'),
  checkCentroOwnership,
  validateImagenes,
  ImagenCentroController.uploadImagenes
);

// Nuevo endpoint: Eliminar imagen específica de un centro deportivo
router.delete('/centros/:centroId/imagenes/:key',
  auth,
  validateUUID('centroId'),
  checkCentroOwnership,
  ImagenCentroController.deleteImagen
);

module.exports = router;