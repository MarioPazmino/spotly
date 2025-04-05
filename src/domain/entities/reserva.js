class Reserva {
    constructor({
      id,
      canchaId,
      usuarioId,
      fecha, // YYYY-MM-DD
      horaInicio, // HH:MM
      horaFin, // HH:MM
      estado, // 'pendiente', 'confirmada', 'cancelada', 'completada'
      metodoPago, // 'tarjeta', 'transferencia'
      montoPagado,
      montoTotal,
      referenciaPago,
      createdAt,
      updatedAt
    }) {
      this.id = id;
      this.canchaId = canchaId;
      this.usuarioId = usuarioId;
      this.fecha = fecha;
      this.horaInicio = horaInicio;
      this.horaFin = horaFin;
      this.estado = estado;
      this.metodoPago = metodoPago;
      this.montoPagado = montoPagado;
      this.montoTotal = montoTotal;
      this.referenciaPago = referenciaPago;
      this.createdAt = createdAt || new Date().toISOString();
      this.updatedAt = updatedAt || new Date().toISOString();
    }
  }
  
  export default Reserva;
  