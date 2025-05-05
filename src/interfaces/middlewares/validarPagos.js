//src/interfaces/middlewares/validarPagos.js    

module.exports = function validarPagos(req, res, next) {
  const { monto, metodoPago, detallesPago } = req.body;
  if (typeof monto !== 'number' || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser un número mayor a 0.' });
  }
  const metodosPermitidos = ['tarjeta', 'transferencia', 'efectivo'];
  if (!metodoPago || !metodosPermitidos.includes(metodoPago)) {
    return res.status(400).json({ error: 'Método de pago no soportado.' });
  }
  if (metodoPago === 'tarjeta') {
    if (!detallesPago || !detallesPago.braintreeTransactionId) {
      return res.status(400).json({ error: 'Para pagos con tarjeta se requiere braintreeTransactionId.' });
    }
  }
  if (metodoPago === 'transferencia') {
    if (!detallesPago || !detallesPago.bancoDestino || !detallesPago.cuentaDestino) {
      return res.status(400).json({ error: 'Para transferencias se requiere bancoDestino y cuentaDestino.' });
    }
  }
  if (metodoPago === 'efectivo') {
    // Si la lógica de tu entidad requiere un campo especial para efectivo (por ejemplo, codigoPago), valida aquí:
    // if (!detallesPago || !detallesPago.codigoPago) {
    //   return res.status(400).json({ error: 'Para pagos en efectivo se requiere codigoPago.' });
    // }
    // Si no se requiere nada, simplemente pasa
  }
  next();
};