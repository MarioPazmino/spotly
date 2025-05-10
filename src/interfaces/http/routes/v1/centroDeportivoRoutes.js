// src/interfaces/http/routes/v1/centroDeportivoRoutes.js
/**
 * Rutas para la gestión de centros deportivos
 * Siguiendo el principio de responsabilidad única, las rutas se organizan en grupos lógicos:
 * 1. Rutas para operaciones CRUD básicas de centros deportivos
 * 2. Rutas para gestión de imágenes de centros deportivos
 */
const express = require('express');
const router = express.Router();

// Controladores
const CentroDeportivoController = require('../../controllers/v1/CentroDeportivoController');
const ImagenCentroController = require('../../controllers/v1/uploadImagenes/ImagenCentroController');

// Middlewares
const { validateCentro, validateUpdateCentro, validateLocationSearch, validateCentroQuery } = require('../../../middlewares/validateCentroDeportivo');
const Authorization = require('../../../middlewares/authorization');
const { centroImageUploadMiddleware } = require('../../../middlewares/upload/centroImageUploadMiddleware');
const checkCentroOwnership = require('../../../middlewares/auth/checkCentroOwnershipMiddleware');
const { validate: isUuid } = require('uuid');

// Middleware de autenticación para entorno de desarrollo
const auth = (req, res, next) => {
  // Verificar si estamos en producción o desarrollo
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // En producción, la autenticación real ya se maneja a través de API Gateway/Cognito
    // Solo pasamos al siguiente middleware
    return next();
  }
  
  // En desarrollo, simulamos un usuario autenticado con permisos de super_admin
  // para evitar problemas de permisos durante las pruebas
  req.user = {
    userId: 'test-user-id',
    sub: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'super_admin', // Usar super_admin para tener acceso completo
    picture: null,
    registrationSource: 'cognito',
    pendienteAprobacion: null,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    groups: ['super_admin'],
    'cognito:groups': ['super_admin']
  };
  
  console.log('Usuario simulado en desarrollo:', req.user);
  next();
};

/**
 * Middleware para validar UUID
 * @param {string} paramName - Nombre del parámetro a validar
 * @returns {Function} Middleware de validación
 */
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

/**
 * GRUPO 1: Rutas para operaciones CRUD básicas de centros deportivos
 * - Listar, buscar, crear, obtener, actualizar y eliminar centros deportivos
 */

// Listar centros deportivos (acceso público o autenticado)
router.get('/', auth, validateCentroQuery, CentroDeportivoController.listCentros);

// Buscar centros deportivos por ubicación GPS
router.get('/cercanos', auth, validateLocationSearch, CentroDeportivoController.findCentrosByLocation);

// Obtener centro deportivo por ID (acceso público o autenticado)
router.get('/:centroId', auth, validateUUID('centroId'), CentroDeportivoController.getCentroById);

// Crear centro deportivo (solo admin_centro o super_admin)
router.post('/', 
  auth, 
  Authorization.checkPermission('write:centro'),
  (req, res, next) => {
    try {
      // Loggear información del usuario para depuración
      console.log('Información del usuario en la ruta:', req.user);
      
      // Asignar el ID del usuario al centro deportivo antes de la validación
      if (!req.user || !req.user.sub) {
        console.log('ADVERTENCIA: req.user.sub es undefined, usando ID alternativo');
        // Usar el ID del primer usuario super_admin (temporal para pruebas)
        req.body.userId = '54f854f8-d0c1-706d-9a9a-d6f55b36aea8';
      } else {
        req.body.userId = req.user.sub;
      }
      
      console.log('userId asignado:', req.body.userId);
      next();
    } catch (error) {
      console.error('Error al asignar userId:', error);
      next(error);
    }
  }, 
  validateCentro, 
  CentroDeportivoController.createCentro
);

// Actualizar centro deportivo (solo admin_centro dueño o super_admin)
router.put('/:centroId', 
  auth, 
  validateUUID('centroId'),
  validateUpdateCentro,
  checkCentroOwnership,
  Authorization.checkPermission('update:centro'),
  CentroDeportivoController.updateCentro
);

// Actualizar parcialmente centro deportivo (solo admin_centro dueño o super_admin)
router.patch('/:centroId',
  auth,
  validateUUID('centroId'),
  validateCentro,
  checkCentroOwnership,
  Authorization.checkPermission('update:centro'),
  CentroDeportivoController.updateCentro
);

// Eliminar centro deportivo (solo admin_centro dueño o super_admin)
router.delete('/:centroId',
  auth,
  validateUUID('centroId'),
  checkCentroOwnership,
  Authorization.checkPermission('delete:centro'),
  CentroDeportivoController.deleteCentro
);

/**
 * GRUPO 2: Rutas para gestión de imágenes de centros deportivos
 * - Subir, listar y eliminar imágenes de centros deportivos
 */

// Obtener todas las imágenes de un centro deportivo
router.get('/:centroId/imagenes',
  auth,
  validateUUID('centroId'),
  ImagenCentroController.getImagenes
);

// Subir una imagen a un centro deportivo
router.post('/:centroId/imagenes',
  auth,
  validateUUID('centroId'),
  checkCentroOwnership,
  centroImageUploadMiddleware,
  ImagenCentroController.uploadImagen
);

// Eliminar imagen específica de un centro deportivo por índice
router.delete('/:centroId/imagenes/:imageIndex',
  auth,
  validateUUID('centroId'),
  checkCentroOwnership,
  (req, res, next) => {
    // Convertir el índice a número
    req.params.imageIndex = parseInt(req.params.imageIndex, 10);
    if (isNaN(req.params.imageIndex)) {
      return res.status(400).json({
        error: 'Índice inválido',
        message: 'El índice de la imagen debe ser un número válido',
        details: 'Por favor, proporciona un índice numérico para la imagen que deseas eliminar'
      });
    }
    next();
  },
  ImagenCentroController.deleteImagen
);

module.exports = router;