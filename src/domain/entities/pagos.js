// src/domain/entities/pagos.js
class Pago {
  constructor({
    pagoId, // Identificador único del pago
    reservaId, // ID de la reserva asociada (FK)
    userId, // ID del usuario que paga (FK)
    monto, // Cantidad monetaria del pago
    metodoPago, // Método: 'tarjeta', 'transferencia', 'efectivo', etc.
    detallesPago, // Objeto con detalles específicos según el método de pago
    comisionPlataforma, // Monto de la comisión (aplicable solo para pagos con tarjeta)
    estado, // Estado: 'Pendiente', 'Completado', 'Rechazado', etc.
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    // Validación de campos obligatorios
    if (!pagoId || !reservaId || !userId || !monto || !metodoPago) {
      throw new Error('Campos obligatorios faltantes: pagoId, reservaId, userId, monto, metodoPago');
    }

    this.pagoId = pagoId;
    this.reservaId = reservaId;
    this.userId = userId;
    this.monto = monto;
    this.metodoPago = metodoPago;
    
    // La comisión solo aplica para pagos con tarjeta
    this.comisionPlataforma = metodoPago === 'tarjeta' ? (comisionPlataforma || 0) : 0;
    
    // Validar y asignar detalles según método de pago
    this.detallesPago = this._validarDetallesPago(metodoPago, detallesPago);
    
    // Metadatos
    this.estado = estado || this._asignarEstadoInicial(metodoPago);
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  // Método privado para validar los detalles específicos según el método de pago
  _validarDetallesPago(metodoPago, detallesPago = {}) {
    switch (metodoPago) {
      case 'tarjeta':
        return this._validarDetallesTarjeta(detallesPago);
      case 'transferencia':
        return this._validarDetallesTransferencia(detallesPago);
      case 'efectivo':
        return this._validarDetallesEfectivo(detallesPago);
      default:
        throw new Error(`Método de pago no soportado: ${metodoPago}`);
    }
  }

  // Método privado para validar detalles específicos de pago con tarjeta
  _validarDetallesTarjeta({ braintreeTransactionId }) {
    if (!braintreeTransactionId) {
      throw new Error('Para pagos con tarjeta se requiere un braintreeTransactionId');
    }
    return { 
      braintreeTransactionId,
      procesado: true // Los pagos por Braintree se procesan automáticamente
    };
  }

  // Método privado para validar detalles específicos de transferencia bancaria
  _validarDetallesTransferencia({ bancoDestino, cuentaDestino, comprobanteTransferencia, aprobado }) {
    if (!bancoDestino || !cuentaDestino) {
      throw new Error('Para transferencias se requiere bancoDestino y cuentaDestino');
    }
    return {
      bancoDestino,
      cuentaDestino,
      comprobanteTransferencia: comprobanteTransferencia || null,
      aprobado: aprobado || false
    };
  }

  // Método privado para validar detalles específicos de pago en efectivo
  _validarDetallesEfectivo({ codigoPago }) {
    if (!codigoPago) {
      throw new Error('Para pagos en efectivo se requiere un codigoPago');
    }
    return { codigoPago };
  }

  // Método para asignar estado inicial según el método de pago
  _asignarEstadoInicial(metodoPago) {
    switch (metodoPago) {
      case 'tarjeta':
        return 'Completado'; // Asumimos que los pagos con tarjeta se procesan inmediatamente
      case 'transferencia':
        return 'Pendiente'; // Requiere aprobación manual
      case 'efectivo':
        return 'Pendiente'; // Requiere verificación en persona
      default:
        return 'Pendiente';
    }
  }

  // Método para aprobar un pago pendiente
  aprobarPago() {
    if (this.estado !== 'Pendiente') {
      throw new Error(`No se puede aprobar un pago en estado ${this.estado}`);
    }
    
    if (this.metodoPago === 'transferencia') {
      this.detallesPago.aprobado = true;
    }
    
    this.estado = 'Completado';
    this.updatedAt = new Date().toISOString();
    return true;
  }

  // Método para rechazar un pago pendiente
  rechazarPago(motivo) {
    if (this.estado !== 'Pendiente') {
      throw new Error(`No se puede rechazar un pago en estado ${this.estado}`);
    }
    
    this.estado = 'Rechazado';
    this.motivoRechazo = motivo || 'No especificado';
    this.updatedAt = new Date().toISOString();
    return true;
  }
}

module.exports = Pago;