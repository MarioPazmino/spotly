// src/interfaces/http/routes/v1/centroDeportivoRoutes.js
const express = require('express');
const router = express.Router();
const CentroDeportivoController = require('../../controllers/v1/CentroDeportivoController');
const auth = require('../../../middlewares/CognitoAuthMiddleware').authenticate();
const { validateCentro, validateLocationSearch, validateCentroQuery } = require('../../../middlewares/validateCentroDeportivo');
const Authorization = require('../../../middlewares/authorization');
const ImagenCentroController = require('../../controllers/v1/ImagenCentroController');
const multer = require('multer');
const upload = multer(); // memoria, no disco
const checkCentroOwnership = require('../../../middlewares/checkCentroOwnership');

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
router.get('/centros/:centroId', auth, CentroDeportivoController.getCentroById);

// Actualizar centro deportivo (solo admin_centro dueño o super_admin)
router.put('/centros/:centroId', 
  auth, 
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

// --- Subida de imágenes para centros deportivos ---
// Subir imágenes (archivos y/o URLs) a un centro deportivo
router.post('/centros/:centroId/imagenes',
  auth,
  checkCentroOwnership,
  (req, res, next) => {
    try {
      Authorization.checkPermission('write:centro')(req.user.groups);
      next();
    } catch (error) {
      next(error);
    }
  },
  upload.array('imagenes', 3),
  ImagenCentroController.uploadImagenes
);

module.exports = router;