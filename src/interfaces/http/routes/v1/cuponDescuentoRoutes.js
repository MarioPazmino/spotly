// src/interfaces/http/routes/v1/cuponDescuentoRoutes.js
const express = require('express');
const router = express.Router();
const cuponDescuentoController = require('../../http/controllers/v1/cuponDescuentoController');
const validarCuponDescuento = require('../../middlewares/validarCuponDescuento');
const auth = require('../../middlewares/CognitoAuthMiddleware').authenticate();
const authorization = require('../../middlewares/authorization');

// Middleware para validar UUID
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

// Crear cupón (solo admin del centro)
router.post('/', auth, authorization(['admin_centro']), validarCuponDescuento, (req, res, next) => cuponDescuentoController.create(req, res, next));
// Aplicar cupón por código (no requiere auth, puede ser público)
router.post('/aplicar', (req, res, next) => cuponDescuentoController.applyCoupon(req, res, next));
// Obtener cupón por ID (requiere UUID válido)
router.get('/:cuponId', validateUUID('cuponId'), (req, res, next) => cuponDescuentoController.getById(req, res, next));
// Buscar cupón por código (puede ser público)
router.get('/codigo/:codigo', (req, res, next) => cuponDescuentoController.findByCodigo(req, res, next));
// Obtener todos los cupones de un centro (requiere UUID válido y autenticación)
router.get('/centro/:centroId', auth, validateUUID('centroId'), (req, res, next) => cuponDescuentoController.findAllByCentroId(req, res, next));
// Actualizar cupón (solo admin del centro)
router.put('/:cuponId', auth, validateUUID('cuponId'), authorization(['admin_centro']), validarCuponDescuento, (req, res, next) => cuponDescuentoController.update(req, res, next));
// Eliminar cupón (solo admin del centro)
router.delete('/:cuponId', auth, validateUUID('cuponId'), authorization(['admin_centro']), (req, res, next) => cuponDescuentoController.delete(req, res, next));

module.exports = router;