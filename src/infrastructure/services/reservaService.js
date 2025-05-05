//src/infrastructure/services/reservaService.js
const reservaRepository = require('../repositories/reservaRepository');
const Boom = require('@hapi/boom');
const cuponDescuentoService = require('../services/cuponDescuentoService');
const CuponesDescuento = require('../../domain/entities/cupon-descuento');
const { sanitizeObject } = require('../../utils/sanitizeInput');

class ReservaService {
  async crearReserva(data) {
    // Validar cupón si se envía
    // Validar que solo se permita un cupón por reserva
    if (Array.isArray(data.codigoPromoAplicado) && data.codigoPromoAplicado.length > 1) {
      throw new Error('Solo se puede aplicar un cupón por reserva.');
    }
    if (typeof data.codigoPromoAplicado === 'string' && data.codigoPromoAplicado.includes(',')) {
      throw new Error('Solo se puede aplicar un cupón por reserva.');
    }
    // Validar duración de la reserva
    if (data.horaInicio && data.horaFin) {
      const inicio = new Date(data.horaInicio);
      const fin = new Date(data.horaFin);
      const diffHoras = (fin - inicio) / (1000 * 60 * 60);
      if (diffHoras < 1) {
        throw Boom.badRequest('La duración mínima de la reserva es 1 hora.');
      }
      if (diffHoras > 12) {
        throw Boom.badRequest('La duración máxima de la reserva es 12 horas.');
      }
    }
    if (data.codigoPromoAplicado) {
      const cupon = await cuponDescuentoService.findByCodigo(data.codigoPromoAplicado);
      if (!cupon) {
        throw Boom.badRequest('El cupón no existe.');
      }
      // Validar vigencia por fechas
      const ahora = new Date();
      const inicio = new Date(cupon.fechaInicio);
      const fin = new Date(cupon.fechaFin);
      if (ahora < inicio || ahora > fin) {
        throw Boom.badRequest('El cupón no está vigente.');
      }
      // Validar usos por usuario
      const reservasPrevias = await reservaRepository.buscarReservas({ userId: data.userId, codigoPromoAplicado: data.codigoPromoAplicado });
      const usosUsuario = reservasPrevias.items.length;
      if (usosUsuario >= cupon.maximoUsos) {
        throw Boom.badRequest('Ya alcanzaste el máximo de usos permitidos para este cupón como usuario.');
      }
      // Si todo ok, aplicar descuento
      let total = data.total || 0;
      let cuponEntidad = cupon instanceof CuponesDescuento ? cupon : new CuponesDescuento(cupon);
      data.descuentoAplicado = cuponEntidad.calcularDescuento(total);
      data.total = Math.max(0, total - (data.descuentoAplicado || 0));
    }
    return reservaRepository.crearReserva(data);
  }

  obtenerReservaPorId(id) {
    return reservaRepository.obtenerReservaPorId(id);
  }

  async obtenerReservasPorUsuario(userId, options = {}) {
    const result = await reservaRepository.obtenerReservasPorUsuario(userId, options);
    let items = result.items;
    // Filtros solo para superadmins
    if (options.estado) {
      items = items.filter(r => r.estado === options.estado);
    }
    if (options.fechaInicio) {
      items = items.filter(r => new Date(r.createdAt) >= new Date(options.fechaInicio));
    }
    if (options.fechaFin) {
      items = items.filter(r => new Date(r.createdAt) <= new Date(options.fechaFin));
    }
    return { items, lastKey: result.lastKey };
  }

  async obtenerReservasPorCancha(canchaId, options = {}) {
    const result = await reservaRepository.obtenerReservasPorCancha(canchaId, options);
    let items = result.items;
    // Filtros solo para superadmins
    if (options.estado) {
      items = items.filter(r => r.estado === options.estado);
    }
    if (options.fechaInicio) {
      items = items.filter(r => new Date(r.createdAt) >= new Date(options.fechaInicio));
    }
    if (options.fechaFin) {
      items = items.filter(r => new Date(r.createdAt) <= new Date(options.fechaFin));
    }
    return { items, lastKey: result.lastKey };
  }

  actualizarReserva(id, data) {
    return reservaRepository.actualizarReserva(id, data);
  }

  eliminarReserva(id) {
    return reservaRepository.eliminarReserva(id);
  }
}

module.exports = new ReservaService();