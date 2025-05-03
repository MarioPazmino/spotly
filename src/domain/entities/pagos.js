//src/domain/entities/pagos.js
class Pago {
  constructor({
    pagoId, // Identificador único del pago
    ReservaId, // ID de la reserva asociada (FK)
    userId, // ID del usuario que paga (FK)
    centroDeportivoId, // ID del centro asociado a esta reserva

    monto, // Cantidad monetaria del pago
    metodoPago, // Método: 'tarjeta', 'transferencia', 'efectivo', etc.

    braintreeTransactionId, // ID de la transacción en Braintree
    comisionPlataforma, // Monto de la comisión (si aplica)

    estado, // Estado: 'Pendiente', 'Completado', 'Rechazado', etc.
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.pagoId = pagoId;
    this.ReservaId = ReservaId;
    this.userId = userId;
    this.centroDeportivoId = centroDeportivoId;
    this.monto = monto;
    this.metodoPago = metodoPago;
    this.braintreeTransactionId = braintreeTransactionId;
    this.comisionPlataforma = comisionPlataforma;
    this.estado = estado;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Pago;