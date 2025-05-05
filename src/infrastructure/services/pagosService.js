const PagosRepository = require('../repositories/pagosRepository');
const ReservaRepository = require('../repositories/reservaRepository');
const Pago = require('../../domain/entities/pagos');
const { sanitizeObject } = require('../../utils/sanitizeInput');

class PagosService {
  constructor() {
    this.repo = new PagosRepository();
  }

  async crearPago(data) {
    data = sanitizeObject(data);
    // Validar existencia de la reserva
    if (!data.reservaId) {
      throw new Error('El campo reservaId es obligatorio para crear un pago.');
    }
    try {
      await ReservaRepository.obtenerReservaPorId(data.reservaId);
    } catch (err) {
      throw new Error('No existe la reserva asociada al pago.');
    }
    return await this.repo.crearPago(data);
  }

  async obtenerPagoPorId(pagoId) {
    return await this.repo.obtenerPagoPorId(pagoId);
  }

  async obtenerPagosPorReserva(reservaId) {
    return await this.repo.obtenerPagosPorReserva(reservaId);
  }

  async actualizarPago(pagoId, updates) {
    updates = sanitizeObject(updates);
    // Si se intenta actualizar detallesPago y hay reservaId, validar existencia
    if (updates.reservaId) {
      try {
        await ReservaRepository.obtenerReservaPorId(updates.reservaId);
      } catch (err) {
        throw new Error('No existe la reserva asociada al pago.');
      }
    }
    try {
      return await this.repo.actualizarPago(pagoId, updates);
    } catch (err) {
      if (err.message && err.message.includes('No está permitido modificar el campo')) {
        throw new Error('Actualización inválida: ' + err.message);
      }
      if (err.message && err.message.includes('Requested resource not found')) {
        throw new Error('El pago que intenta actualizar no existe.');
      }
      throw err;
    }
  }

  async eliminarPago(pagoId) {
    return await this.repo.eliminarPago(pagoId);
  }
}

module.exports = PagosService;
