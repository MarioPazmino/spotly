/**
 * src/interfaces/http/routes/v1/pagosRoutes.js
 * Rutas para la gestión de pagos
 * Responsabilidad única: Definir las rutas relacionadas con pagos y sus middlewares
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { validate: isUuid } = require('uuid');
const upload = multer({ storage: multer.memoryStorage() });

// Importar controladores
const pagosController = require('../../controllers/v1/pagosController');
const ComprobanteTransferenciaController = require('../../controllers/v1/uploadImagenes/ComprobanteTransferenciaController');

// Importar middlewares de autenticación y autorización
const auth = require('../../../middlewares/auth/jwtAuthMiddleware');
const authorizationMiddleware = require('../../../middlewares/authorization');
const validarPagos = require('../../../middlewares/validarPagos');
const validarMetodoPagoDisponibleFactory = require('../../../middlewares/validarMetodoPagoDisponible');

// Obtener el servicio de pagos directamente del controlador
const pagosService = pagosController.pagosService;

// Crear instancia del middleware de validación de métodos de pago
const validarMetodoPagoDisponible = validarMetodoPagoDisponibleFactory(pagosService);

/**
 * Middleware para validar UUID
 * @param {string} paramName - Nombre del parámetro a validar
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

// Definición de rutas
// Rutas de pagos
router.post('/', 
  auth, 
  authorizationMiddleware.checkPermission('create:pagos'), 
  validarPagos, 
  validarMetodoPagoDisponible,
  pagosController.crearPago
);

router.get('/', 
  auth, 
  authorizationMiddleware.checkPermission('read:pagos'), 
  pagosController.listarPagos
);

router.get('/centro/:centroId', 
  auth, 
  validateUUID('centroId'), 
  authorizationMiddleware.checkPermission('read:pagos'), 
  pagosController.listarPagosPorCentro
);

router.get('/usuario/:userId', 
  auth, 
  validateUUID('userId'), 
  authorizationMiddleware.checkPermission('read:pagos_propios'), 
  pagosController.listarPagosPorUsuario
);

router.get('/reserva/:reservaId', 
  auth, 
  validateUUID('reservaId'), 
  authorizationMiddleware.checkPermission('read:pagos'), 
  pagosController.obtenerPagosPorReserva
);

router.get('/:pagoId', 
  auth, 
  validateUUID('pagoId'), 
  authorizationMiddleware.checkPermission('read:pagos'), 
  pagosController.obtenerPagoPorId
);

router.put('/:pagoId/estado', 
  auth, 
  validateUUID('pagoId'), 
  authorizationMiddleware.checkPermission('update:pagos'), 
  pagosController.actualizarPago
);

router.delete('/:pagoId', 
  auth, 
  validateUUID('pagoId'), 
  authorizationMiddleware.checkPermission('delete:pagos'), 
  pagosController.eliminarPago
);

router.post('/:pagoId/reembolso', 
  auth, 
  validateUUID('pagoId'), 
  authorizationMiddleware.checkPermission('refund:pagos'), 
  pagosController.reembolsar
);

// Rutas para comprobantes de transferencia
router.post('/:pagoId/comprobante', 
  auth, 
  validateUUID('pagoId'), 
  authorizationMiddleware.checkPermission('update:comprobantes_propios'), 
  upload.single('comprobante'), 
  ComprobanteTransferenciaController.uploadComprobante
);

router.get('/:pagoId/comprobante', 
  auth, 
  validateUUID('pagoId'), 
  authorizationMiddleware.checkPermission('read:comprobantes'), 
  ComprobanteTransferenciaController.getComprobante
);

router.delete('/:pagoId/comprobante', 
  auth, 
  validateUUID('pagoId'), 
  authorizationMiddleware.checkPermission('delete:comprobantes'), 
  ComprobanteTransferenciaController.deleteComprobante
);

// Rutas para métodos de pago
router.get('/metodos-pago/centro/:centroId', 
  auth, 
  validateUUID('centroId'), 
  validarMetodoPagoDisponible, 
  pagosController.getMetodosPagoDisponibles
);

// Rutas para pagos con tarjeta
router.post('/tarjeta/generar-token', 
  auth, 
  authorizationMiddleware.checkPermission('create:pagos'), 
  pagosController.generarToken
);

router.post('/tarjeta/procesar', 
  auth, 
  authorizationMiddleware.checkPermission('create:pagos'), 
  validarPagos, 
  validarMetodoPagoDisponible, 
  pagosController.crearPago
);

// La ruta para obtener métodos de pago ya está definida arriba como '/metodos-pago/centro/:centroId'

module.exports = router;