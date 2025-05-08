//src/interfaces/http/routes/v1/pagosRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { validate: isUuid } = require('uuid');
const upload = multer({ storage: multer.memoryStorage() });

// Importar controladores
const pagosController = require('../../controllers/v1/pagosController');
const ComprobanteTransferenciaController = require('../../controllers/v1/uploadImagenes/ComprobanteTransferenciaController');

// Obtener el servicio de pagos directamente del controlador
const pagosService = pagosController.pagosService;

// Implementación directa del middleware de autorización para evitar problemas de importación en Lambda
const authorization = {
  checkPermission: (requiredPermission) => {
    return (req, res, next) => {
      try {
        // Si no hay usuario autenticado, denegar acceso
        if (!req.user) {
          return res.status(401).json({ error: 'No autenticado' });
        }

        const userGroups = req.user.groups || [];
        
        // Super admin tiene todos los permisos
        if (userGroups.includes('super_admin')) {
          return next();
        }
        
        // Definir permisos por grupo
        const groupPermissions = {
          "super_admin": ["*"],
          "admin_centro": [
            "list:centro", "read:centro", "write:centro", "update:centro", "delete:centro",
            "read:canchas", "write:canchas", "update:canchas", "delete:canchas",
            "read:horarios", "write:horarios", "update:horarios", "delete:horarios",
            "read:reservas", "update:reservas", "cancel:reservas",
            "read:cupon", "write:cupon", "update:cupon", "delete:cupon",
            "read:pagos", "update:pagos", "delete:pagos", "refund:pagos",
            "read:comprobantes", "update:comprobantes", "delete:comprobantes",
            "read:resenas", "delete:resenas"
          ],
          "cliente": [
            "list:centro", "read:centro",
            "read:public", "write:reservas", "cancel:propias",
            "update:perfil", "read:pagos_propios", "create:pagos",
            "update:comprobantes_propios", "read:comprobantes_propios", "delete:comprobantes_propios"
          ]
        };

        // Verificar si el usuario tiene el permiso requerido
        let hasPermission = false;
        
        for (const group of userGroups) {
          const permissions = groupPermissions[group] || [];
          if (permissions.includes('*') || permissions.includes(requiredPermission)) {
            hasPermission = true;
            break;
          }
        }
        
        if (!hasPermission) {
          return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
        }
        
        next();
      } catch (error) {
        console.error('Error en autorización:', error);
        next(error);
      }
    };
  }
};

// Implementación directa del middleware de validación de pagos
const validarPagos = (req, res, next) => {
  const { metodoPago, detallesPago } = req.body;
  const metodosDisponibles = req.metodosPagoDisponibles || ['efectivo']; // Por defecto, efectivo siempre está disponible

  // Validar que el método de pago sea válido
  if (!metodoPago || !metodosDisponibles.includes(metodoPago)) {
    return res.status(400).json({
      error: 'Método de pago inválido',
      mensaje: `Métodos permitidos: ${metodosDisponibles.join(', ')}`
    });
  }

  // Validar que detallesPago sea un objeto
  if (!detallesPago || typeof detallesPago !== 'object') {
    return res.status(400).json({
      error: 'Detalles de pago inválidos',
      mensaje: 'Los detalles de pago deben ser un objeto'
    });
  }

  // Validaciones específicas según el método de pago
  switch (metodoPago) {
    case 'efectivo':
      // No se requieren validaciones adicionales para efectivo
      break;
      
    case 'transferencia':
      if (!detallesPago.banco || !detallesPago.numeroCuenta) {
        return res.status(400).json({
          error: 'Detalles de transferencia incompletos',
          mensaje: 'Se requiere banco y número de cuenta'
        });
      }
      break;
      
    case 'tarjeta':
      if (!detallesPago.nonce) {
        return res.status(400).json({
          error: 'Detalles de tarjeta incompletos',
          mensaje: 'Se requiere el nonce de la tarjeta'
        });
      }
      break;
      
    default:
      return res.status(400).json({
        error: 'Método de pago no soportado',
        mensaje: `Métodos soportados: ${metodosDisponibles.join(', ')}`
      });
  }

  next();
};

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