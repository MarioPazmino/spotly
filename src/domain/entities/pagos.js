// src/domain/entities/pagos.js
class Pago {
  constructor({
    pagoId, // Identificador único del pago
    reservaId, // ID de la reserva asociada (FK)
    userId, // ID del usuario que paga (FK)
    centroId, // ID del centro deportivo (FK)
    monto, // Cantidad monetaria del pago
    montoTotal, // Monto total de la reserva
    metodoPago, // Método: 'tarjeta', 'transferencia', 'efectivo'
    detallesPago, // Objeto con detalles específicos según el método de pago
    estado, // Estado: 'Pendiente', 'Completado', 'Rechazado', 'Bloqueado'
    intentos, // Número de intentos de pago
    esPagoParcial, // Indica si es un pago parcial
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    // Validar campos obligatorios
    this._validarCamposObligatorios({ pagoId, reservaId, userId, centroId, monto, metodoPago });
    
    // Asignar propiedades básicas
    this.pagoId = pagoId;
    this.reservaId = reservaId;
    this.userId = userId;
    this.centroId = centroId;
    this.monto = monto;
    this.montoTotal = montoTotal || monto;
    this.metodoPago = metodoPago;
    
    // Validar y asignar detalles según método de pago
    this.detallesPago = this._validarDetallesPago(metodoPago, detallesPago);
    
    // Asignar metadatos
    this.estado = estado || this._asignarEstadoInicial(metodoPago);
    this.intentos = intentos || 0;
    this.esPagoParcial = esPagoParcial || false;
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();

    // Validar reglas de negocio
    this._validarReglasNegocio();
  }

  /**
   * Validar campos obligatorios
   * @private
   */
  _validarCamposObligatorios(campos) {
    const camposFaltantes = Object.entries(campos)
      .filter(([_, valor]) => !valor)
      .map(([nombre]) => nombre);

    if (camposFaltantes.length > 0) {
      throw new Error(`Campos obligatorios faltantes: ${camposFaltantes.join(', ')}`);
    }
  }

  /**
   * Validar reglas de negocio
   * @private
   */
  _validarReglasNegocio() {
    // Validar monto positivo
    if (this.monto <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    // Validar monto total positivo
    if (this.montoTotal <= 0) {
      throw new Error('El monto total debe ser mayor a 0');
    }

    // Validar monto no excede total
    if (this.monto > this.montoTotal) {
      throw new Error(`El monto no puede exceder el monto total (${this.montoTotal})`);
    }

    // Validar pagos parciales
    this._validarMontoParcial();
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
  _validarDetallesTarjeta(detallesPago) {
    // Para tarjeta, necesitamos el ID de la transacción de Braintree
    if (!detallesPago || !detallesPago.transactionId) {
      throw new Error('Para pagos con tarjeta se requiere el ID de la transacción');
    }

    // Validar formato del transactionId
    if (!/^[a-zA-Z0-9]{6,}$/.test(detallesPago.transactionId)) {
      throw new Error('Formato de ID de transacción inválido');
    }

    return { 
      transactionId: detallesPago.transactionId,
      procesado: true // Los pagos por tarjeta se procesan automáticamente
    };
  }

  // Método privado para validar detalles específicos de transferencia bancaria
  _validarDetallesTransferencia(detallesPago) {
    if (!detallesPago) {
      throw new Error('Se requieren detalles para el pago por transferencia');
    }

    // Validar campos obligatorios
    if (!detallesPago.bancoDestino || !detallesPago.cuentaDestino) {
      throw new Error('Para transferencias se requiere bancoDestino y cuentaDestino');
    }

    // Validar que el banco seleccionado sea uno de los permitidos
    const bancosPermitidos = ['banco1', 'banco2', 'banco3'];
    if (!bancosPermitidos.includes(detallesPago.bancoDestino)) {
      throw new Error(`Banco de destino no válido. Debe ser uno de: ${bancosPermitidos.join(', ')}`);
    }

    // Validar formato de cuenta
    if (!/^[0-9]{10,20}$/.test(detallesPago.cuentaDestino)) {
      throw new Error('Formato de cuenta de destino inválido');
    }

    return {
      bancoDestino: detallesPago.bancoDestino,
      cuentaDestino: detallesPago.cuentaDestino,
      comprobanteKey: detallesPago.comprobanteKey || null,
      aprobado: detallesPago.aprobado || false,
      fechaTransferencia: detallesPago.fechaTransferencia || null,
      referencia: detallesPago.referencia || null
    };
  }

  // Método privado para validar detalles específicos de pago en efectivo
  _validarDetallesEfectivo(detallesPago = {}) {
    // Generar código único de 6 dígitos si no existe
    const codigoPago = detallesPago.codigoPago || this._generarCodigoPago();
    
    // Validar formato del código si se proporciona
    if (detallesPago.codigoPago && !/^[0-9]{6}$/.test(detallesPago.codigoPago)) {
      throw new Error('Formato de código de pago inválido. Debe ser un número de 6 dígitos');
    }
    
    // Conservar todos los campos originales y agregar/sobrescribir solo los campos requeridos
    return {
      ...detallesPago,
      codigoPago,
      validadoPor: detallesPago.validadoPor || null,
      validadoEn: detallesPago.validadoEn || null,
      motivoRechazo: detallesPago.motivoRechazo || null
    };
  }

  // Método para generar código único de 6 dígitos
  _generarCodigoPago() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Método para asignar estado inicial según el método de pago
  _asignarEstadoInicial(metodoPago) {
    switch (metodoPago) {
      case 'tarjeta':
        return 'Completado'; // Los pagos con tarjeta se procesan inmediatamente
      case 'transferencia':
        return 'Pendiente'; // Requiere aprobación manual
      case 'efectivo':
        return 'Pendiente'; // Requiere verificación en persona con código
      default:
        return 'Pendiente';
    }
  }

  // Método para validar un pago en efectivo
  validarPagoEfectivo(adminId, accion, motivoRechazo = null) {
    if (this.metodoPago !== 'efectivo') {
      throw new Error('Este método solo es válido para pagos en efectivo');
    }

    if (this.estado !== 'Pendiente') {
      throw new Error(`No se puede validar un pago en estado ${this.estado}`);
    }

    if (!['aceptar', 'rechazar'].includes(accion)) {
      throw new Error('La acción debe ser "aceptar" o "rechazar"');
    }

    this.detallesPago.validadoPor = adminId;
    this.detallesPago.validadoEn = new Date().toISOString();

    if (accion === 'aceptar') {
      this.estado = 'Completado';
    } else {
      this.estado = 'Rechazado';
      this.detallesPago.motivoRechazo = motivoRechazo || 'No especificado';
    }

    this.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Incrementar el contador de intentos y verificar si se debe bloquear
   * @returns {boolean} true si el pago está bloqueado, false si aún se pueden hacer intentos
   */
  incrementarIntento() {
    this.intentos++;
    this.updatedAt = new Date().toISOString();

    // Si se exceden los 3 intentos, bloquear el pago
    if (this.intentos >= 3) {
      this.estado = 'Bloqueado';
      return true;
    }
    return false;
  }

  /**
   * Verificar si el pago está bloqueado por exceso de intentos
   * @returns {boolean} true si el pago está bloqueado
   */
  estaBloqueado() {
    return this.estado === 'Bloqueado' || this.intentos >= 3;
  }

  /**
   * Obtener intentos restantes
   * @returns {number} número de intentos restantes
   */
  intentosRestantes() {
    return Math.max(0, 3 - this.intentos);
  }

  /**
   * Validar el monto para pagos parciales
   * @private
   */
  _validarMontoParcial() {
    if (this.esPagoParcial) {
      const montoMinimo = this.montoTotal * 0.30; // 30% del total como mínimo
      
      if (this.monto < montoMinimo) {
        throw new Error(`El monto del pago parcial debe ser al menos el 30% del total (${montoMinimo})`);
      }
      
      if (this.monto >= this.montoTotal) {
        throw new Error('El monto del pago parcial debe ser menor al monto total');
      }
    } else {
      // Para pagos no parciales, el monto debe ser igual al total
      if (this.monto !== this.montoTotal) {
        throw new Error(`El monto debe ser igual al monto total (${this.montoTotal}) para pagos no parciales`);
      }
    }
  }

  /**
   * Calcular el monto restante por pagar
   * @returns {number} Monto restante
   */
  calcularMontoRestante() {
    if (!this.esPagoParcial) {
      return 0;
    }
    return Math.max(0, this.montoTotal - this.monto);
  }

  /**
   * Calcular el porcentaje pagado
   * @returns {number} Porcentaje pagado (0-100)
   */
  calcularPorcentajePagado() {
    return (this.monto / this.montoTotal) * 100;
  }

  /**
   * Verificar si el pago está completo
   * @returns {boolean} true si el pago está completo
   */
  estaCompleto() {
    return this.monto >= this.montoTotal;
  }

  toJSON() {
    return {
      pagoId: this.pagoId,
      userId: this.userId,
      centroId: this.centroId,
      reservaId: this.reservaId,
      monto: this.monto,
      montoTotal: this.montoTotal,
      metodoPago: this.metodoPago,
      estado: this.estado,
      detallesPago: this.detallesPago,
      intentos: this.intentos,
      intentosRestantes: this.intentosRestantes(),
      esPagoParcial: this.esPagoParcial,
      montoRestante: this.calcularMontoRestante(),
      porcentajePagado: this.calcularPorcentajePagado(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Pago;