//src/interfaces/middlewares/validarPagos.js    

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

  // Validar campos requeridos según el método de pago
  switch (metodoPago) {
    case 'tarjeta':
      if (!detallesPago.paymentMethodNonce || typeof detallesPago.paymentMethodNonce !== 'string') {
        return res.status(400).json({
          error: 'Detalles de tarjeta inválidos',
          mensaje: 'Se requiere un paymentMethodNonce válido para pagos con tarjeta'
        });
      }
      break;

    case 'transferencia':
      if (!detallesPago.bancoDestino || !detallesPago.cuentaDestino) {
        return res.status(400).json({
          error: 'Detalles de transferencia inválidos',
          mensaje: 'Se requiere bancoDestino y cuentaDestino para pagos por transferencia'
        });
      }
      break;

    case 'efectivo':
      // No se requieren campos adicionales para efectivo
      break;

    default:
      return res.status(400).json({
        error: 'Método de pago no soportado',
        mensaje: `Método ${metodoPago} no está soportado`
      });
  }

  next();
};

module.exports = validarPagos;