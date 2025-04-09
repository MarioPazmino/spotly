//src/domain/entities/pagos.js
class Pago {
  constructor({
    pagoId, // Renombrado de 'id' a 'pagoId'
    reservaId, // FK a Reservas.ReservaId
    userId, // FK a Usuarios.UserId
    monto,
    metodoPago, // 'tarjeta', 'transferencia', etc.
    estado, // 'Pendiente', 'Completado'
    createdAt,
    updatedAt
  }) {
    this.pagoId = pagoId;
    this.reservaId = reservaId;
    this.userId = userId;
    this.monto = monto;
    this.metodoPago = metodoPago;
    this.estado = estado;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Pago;