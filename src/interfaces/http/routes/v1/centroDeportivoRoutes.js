// src/interfaces/http/routes/v1/centroDeportivoRoutes.js
const express = require('express');
const router = express.Router();
const CentroDeportivoController = require('../../controllers/v1/CentroDeportivoController');
const auth = require('../../../middlewares/CognitoAuthMiddleware').authenticate();
const { validateCentro, validateLocationSearch, validateCentroQuery } = require('../../../middlewares/validateCentroDeportivo');
const Authorization = require('../../../middlewares/authorization');
const Boom = require('@hapi/boom');
const centroDeportivoService = require('../../../../infrastructure/services/centroDeportivoService');

// Middleware para verificar propiedad del centro deportivo
const checkCentroOwnership = async (req, res, next) => {
  try {
    // Solo verificar propiedad si el usuario es admin_centro (super_admin tiene permiso universal)
    if (req.user.groups.includes('admin_centro') && !req.user.groups.includes('super_admin')) {
      const centro = await centroDeportivoService.getCentroById(req.params.centroId);
      
      if (centro.userId !== req.user.sub) {
        throw Boom.forbidden('No tienes permisos para modificar este centro deportivo');
      }
      
      // Guardamos el centro ya obtenido para evitar consultas duplicadas
      req.centro = centro;
    }
    next();
  } catch (error) {
    next(error);
  }
};

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

module.exports = router;