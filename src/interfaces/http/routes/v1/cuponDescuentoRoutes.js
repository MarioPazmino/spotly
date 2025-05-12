// src/interfaces/http/routes/v1/cuponDescuentoRoutes.js
const express = require('express');
const router = express.Router();

// Importar controlador de cupones
const cuponDescuentoController = require('../../controllers/v1/cuponDescuentoController');

// Importar middlewares
const auth = require('../../../middlewares/auth/jwtAuthMiddleware');
const authorizationMiddleware = require('../../../middlewares/authorization');
const procesarCuerpo = require('../../../middlewares/procesarCuerpoMiddleware');
const validadorCupon = require('../../../middlewares/validarCuponDescuento');

// Definición de rutas con middlewares específicos
// 1. Crear cupón: requiere auth, autorización y validación
router.post('/', 
  auth, 
  (req, res, next) => authorizationMiddleware.checkPermission('write:cupon')(req, res, next), 
  procesarCuerpo,
  validadorCupon.validarCrearCupon,
  (req, res, next) => cuponDescuentoController.create(req, res, next)
);

// 2. Aplicar cupón: requiere auth y procesamiento del cuerpo
router.post('/aplicar', 
  auth, 
  procesarCuerpo,
  (req, res, next) => cuponDescuentoController.applyCoupon(req, res, next)
);

// 3. Buscar cupón por código (puede ser público)
router.get('/codigo/:codigo', 
  (req, res, next) => cuponDescuentoController.findByCodigo(req, res, next)
);

// 4. Obtener todos los cupones de un centro (requiere UUID válido y autenticación)
router.get('/centro/:centroId', 
  auth, 
  (req, res, next) => authorizationMiddleware.checkPermission('read:cupon')(req, res, next),
  validadorCupon.validarCentroUUID, 
  (req, res, next) => cuponDescuentoController.findAllByCentroId(req, res, next)
);

// 5. Obtener cupón por ID (requiere UUID válido)
router.get('/:cuponId', 
  validadorCupon.validarCuponUUID, 
  (req, res, next) => cuponDescuentoController.getById(req, res, next)
);

// 6. Actualizar cupón: requiere auth, UUID válido, autorización, procesamiento y validación
router.put('/:cuponId', 
  auth, 
  validadorCupon.validarCuponUUID, 
  (req, res, next) => authorizationMiddleware.checkPermission('update:cupon')(req, res, next),
  procesarCuerpo,
  validadorCupon.validarActualizarCupon,
  (req, res, next) => cuponDescuentoController.update(req, res, next)
);

// 7. Eliminar cupón: requiere auth, UUID válido y autorización
router.delete('/:cuponId', 
  auth, 
  validadorCupon.validarCuponUUID, 
  (req, res, next) => authorizationMiddleware.checkPermission('delete:cupon')(req, res, next),
  (req, res, next) => cuponDescuentoController.delete(req, res, next)
);

module.exports = router;