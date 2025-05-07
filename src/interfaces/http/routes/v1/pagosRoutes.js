//src/interfaces/http/routes/v1/pagosRoutes.js
const express = require('express');
const router = express.Router();
const authorization = require('../../../middlewares/authorization');
const validarPagos = require('../../../middlewares/validarPagos');
const pagosController = require('../../controllers/v1/pagosController');
const ComprobanteTransferenciaController = require('../../controllers/v1/uploadImagenes/ComprobanteTransferenciaController');
const multer = require('multer');
const { validate: isUuid } = require('uuid');
const upload = multer({ storage: multer.memoryStorage() });
const pagosService = require('../../../../infrastructure/services/pagosService');

// Middleware para validar métodos de pago disponibles
const validarMetodoPagoDisponible = async (req, res, next) => {
  try {
    const centroId = req.body.centroId || req.params.centroId;
    if (!centroId) {
      return res.status(400).json({ error: 'Se requiere el ID del centro deportivo' });
    }

    const metodosDisponibles = await pagosService.getMetodosPagoDisponibles(centroId);
    const metodoPago = req.body.metodoPago;

    // Si es una operación de pago, validar el método
    if (metodoPago) {
      if (!metodosDisponibles.includes(metodoPago)) {
        return res.status(400).json({
          error: `El método de pago ${metodoPago} no está disponible para este centro deportivo`,
          metodosDisponibles,
          mensaje: `Este centro solo acepta: ${metodosDisponibles.join(', ')}`
        });
      }
    }

    // Agregar los métodos disponibles al request para uso posterior
    req.metodosPagoDisponibles = metodosDisponibles;
    next();
  } catch (error) {
    next(error);
  }
};

// Función para validar UUID
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

// Rutas de pagos
router.post('/', 
  authorization.checkPermission('create:pagos'), 
  validarPagos, 
  validarMetodoPagoDisponible,
  pagosController.crearPago
);

router.get('/', 
  authorization.checkPermission('read:pagos'), 
  pagosController.listarPagos
);

router.get('/centro/:centroId', 
  validateUUID('centroId'), 
  authorization.checkPermission('read:pagos'), 
  pagosController.listarPagosPorCentro
);

router.get('/usuario/:userId', 
  validateUUID('userId'), 
  authorization.checkPermission('read:pagos_propios'), 
  pagosController.listarPagosPorUsuario
);

router.get('/reserva/:reservaId', 
  validateUUID('reservaId'), 
  authorization.checkPermission('read:pagos'), 
  pagosController.obtenerPagosPorReserva
);

router.get('/:pagoId', 
  validateUUID('pagoId'), 
  authorization.checkPermission('read:pagos'), 
  pagosController.obtenerPagoPorId
);

router.put('/:pagoId', 
  validateUUID('pagoId'), 
  authorization.checkPermission('update:pagos'), 
  validarPagos, 
  pagosController.actualizarPago
);

router.delete('/:pagoId', 
  validateUUID('pagoId'), 
  authorization.checkPermission('delete:pagos'), 
  pagosController.eliminarPago
);

// Rutas para pagos en efectivo
router.post('/:pagoId/efectivo/validar', 
  validateUUID('pagoId'), 
  authorization.checkPermission('update:pagos'), 
  pagosController.validarPagoEfectivo
);

router.get('/:pagoId/efectivo/codigo', 
  validateUUID('pagoId'), 
  authorization.checkPermission('read:pagos_propios'), 
  pagosController.obtenerCodigoPago
);

// Rutas para comprobantes de transferencia
router.post('/:pagoId/comprobante', 
  validateUUID('pagoId'),
  authorization.checkPermission('update:comprobantes_propios'), 
  upload.single('comprobante'), 
  ComprobanteTransferenciaController.uploadComprobante
);

router.get('/:pagoId/comprobante', 
  validateUUID('pagoId'), 
  authorization.checkPermission('read:comprobantes_propios'), 
  ComprobanteTransferenciaController.getComprobante
);

router.put('/:pagoId/comprobante', 
  validateUUID('pagoId'),
  authorization.checkPermission('update:comprobantes_propios'), 
  upload.single('comprobante'),
  ComprobanteTransferenciaController.updateComprobante
);

router.delete('/:pagoId/comprobante', 
  validateUUID('pagoId'),
  authorization.checkPermission('delete:comprobantes'), 
  ComprobanteTransferenciaController.deleteComprobante
);

// Rutas de Braintree
router.get('/braintree/client-token/:centroId', 
  validateUUID('centroId'), 
  authorization.checkPermission('create:pagos'),
  validarMetodoPagoDisponible,
  pagosController.generarToken
);

router.get('/braintree/transaction/:transactionId', 
  validateUUID('transactionId'),
  authorization.checkPermission('read:pagos'), 
  pagosController.verificarEstado
);

router.post('/braintree/refund/:transactionId', 
  validateUUID('transactionId'),
  authorization.checkPermission('refund:pagos'), 
  pagosController.reembolsar
);

// Ruta para obtener métodos de pago disponibles
router.get('/metodos-disponibles/:centroId',
  validateUUID('centroId'),
  authorization.checkPermission('read:pagos'),
  pagosController.getMetodosPagoDisponibles
);

module.exports = router;