//src/interfaces/middlewares/validarPagos.js    

module.exports = function validarPagos(req, res, next) {
  const { monto, metodoPago, detallesPago } = req.body;

  // Validar formato de monto
  if (typeof monto !== 'number' || isNaN(monto)) {
    return res.status(400).json({ error: 'El monto debe ser un número válido' });
  }

  // Validar formato de método de pago
  const metodosPermitidos = ['tarjeta', 'transferencia', 'efectivo'];
  if (!metodoPago || !metodosPermitidos.includes(metodoPago)) {
    return res.status(400).json({ error: 'Método de pago no válido' });
  }

  // Validar estructura de detallesPago
  if (!detallesPago || typeof detallesPago !== 'object') {
    return res.status(400).json({ error: 'Se requieren detalles del pago' });
  }

  // Validar estructura según método de pago
  switch (metodoPago) {
    case 'tarjeta':
      if (!detallesPago.paymentMethodNonce || typeof detallesPago.paymentMethodNonce !== 'string') {
        return res.status(400).json({ error: 'Se requiere paymentMethodNonce para pagos con tarjeta' });
      }
      break;

    case 'transferencia':
      if (!detallesPago.bancoDestino || typeof detallesPago.bancoDestino !== 'string') {
        return res.status(400).json({ error: 'Se requiere bancoDestino para transferencias' });
      }
      if (!detallesPago.cuentaDestino || typeof detallesPago.cuentaDestino !== 'string') {
        return res.status(400).json({ error: 'Se requiere cuentaDestino para transferencias' });
      }
      break;

    case 'efectivo':
      // No requiere validación de estructura para efectivo
      break;
  }

  next();
};