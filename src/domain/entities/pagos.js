//src/domain/entities/pagos.js
class Pago {
  constructor({
    pagoId, // Identificador único del pago
    ReservaId, // ID de la reserva asociada (FK)
    userId, // ID del usuario que paga (FK)
    monto, // Cantidad monetaria del pago
    metodoPago, // Método: 'tarjeta', 'transferencia', 'efectivo', etc.
    estado, // Estado: 'Pendiente', 'Completado', 'Rechazado', etc.
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.pagoId = pagoId;
    this.ReservaId = ReservaId;
    this.userId = userId;
    this.monto = monto;
    this.metodoPago = metodoPago;
    this.estado = estado;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Pago;