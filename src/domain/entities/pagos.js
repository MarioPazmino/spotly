//src/domain/entities/pagos.js
class Pago {
  constructor({
    pagoId, // Identificador único del pago
    ReservaId, // ID de la reserva asociada (FK)
    userId, // ID del usuario que paga (FK)
    centroDeportivoId, // ID del centro asociado a esta reserva
    monto, // Cantidad monetaria del pago
    metodoPago, // Método: 'tarjeta', 'transferencia', 'efectivo', etc.
    // Campos específicos para transferencia bancaria
    bancoDestino, // Banco seleccionado por el cliente (ej.: "Banco Pichincha")
    cuentaDestino, // Número de cuenta destino (ej.: "1234567890")
    comprobanteTransferencia, // URL o referencia del comprobante
    aprobado, // Validación del admin_centro (true/false)
    // Campos específicos para Braintree (pagos por tarjeta)
    braintreeTransactionId, // ID de la transacción en Braintree
    comisionPlataforma, // Monto de la comisión (si aplica)
    // Campos específicos para pagos en efectivo
    codigoPago, // Código único para validar pago en efectivo
    // Metadatos
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
    // Transferencia bancaria
    this.bancoDestino = bancoDestino || null;
    this.cuentaDestino = cuentaDestino || null;
    this.comprobanteTransferencia = comprobanteTransferencia || null;
    this.aprobado = aprobado || false; // Aprobación manual del admin_centro
    // Braintree
    this.braintreeTransactionId = braintreeTransactionId;
    this.comisionPlataforma = comisionPlataforma;
    // Pagos en efectivo
    this.codigoPago = codigoPago || null;
    // Metadatos
    this.estado = estado || 'Pendiente'; // Estan pendientes por aprobación del admin_centro
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Pago;