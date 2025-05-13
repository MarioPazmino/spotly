//src/infrastructure/services/reservaService.js
const reservaRepository = require('../repositories/reservaRepository');
const Boom = require('@hapi/boom');
const cuponDescuentoService = require('../services/cuponDescuentoService');
const CuponesDescuento = require('../../domain/entities/cupon-descuento');
const { sanitizeObject } = require('../../utils/sanitizeInput');
const canchasRepository = require('../repositories/canchasRepository');
const horariosRepository = require('../repositories/horariosRepository');

// Función auxiliar para convertir formato de hora (HH:MM) a minutos totales
function parseHoraToMinutes(hora) {
  if (!hora) return 0;
  
  // Si es un string en formato HH:MM
  if (typeof hora === 'string' && hora.includes(':')) {
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }
  
  // Si es un número, asumir que son horas
  if (typeof hora === 'number') {
    return hora * 60;
  }
  
  return 0;
}

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

    // Calcular el total de la reserva basado en el precio de la cancha y la cantidad de horarios
    if (!data.total && data.canchaId && data.horarioIds && data.horarioIds.length > 0) {
      // Obtener la información de la cancha
      const cancha = await canchasRepository.findById(data.canchaId);
      if (!cancha) {
        throw Boom.notFound(`La cancha con ID ${data.canchaId} no existe.`);
      }

      // Verificar que la cancha tenga un precio por hora definido
      if (!cancha.precioPorHora || isNaN(cancha.precioPorHora)) {
        throw Boom.badData(`La cancha con ID ${data.canchaId} no tiene un precio por hora válido.`);
      }

      // Obtener los horarios para calcular la duración total y validar que pertenezcan a la cancha
      let duracionTotalHoras = 0;
      const horariosNoPertenecientes = [];
      
      for (const horarioId of data.horarioIds) {
        const horario = await horariosRepository.getById(horarioId);
        if (!horario) {
          throw Boom.notFound(`El horario ${horarioId} no existe.`);
        }
        
        // Verificar que el horario pertenezca a la cancha seleccionada
        if (horario.canchaId !== data.canchaId) {
          horariosNoPertenecientes.push(horarioId);
          continue; // Saltamos este horario para no incluirlo en el cálculo
        }
        
        // Calcular duración del horario en horas
        const horaInicio = parseHoraToMinutes(horario.horaInicio);
        const horaFin = parseHoraToMinutes(horario.horaFin);
        const duracionMinutos = horaFin - horaInicio;
        const duracionHoras = duracionMinutos / 60;
        
        duracionTotalHoras += duracionHoras;
      }
      
      // Si hay horarios que no pertenecen a la cancha, lanzar error
      if (horariosNoPertenecientes.length > 0) {
        throw Boom.badRequest(`Los siguientes horarios no pertenecen a la cancha seleccionada: ${horariosNoPertenecientes.join(', ')}`);
      }
      
      // Calcular el total basado en la duración total en horas
      data.total = cancha.precioPorHora * duracionTotalHoras;
    }

    if (data.codigoPromoAplicado) {
      const cupon = await cuponDescuentoService.findByCodigo(data.codigoPromoAplicado);
      if (!cupon) {
        throw Boom.badRequest('El cupón no existe.');
      }
      
      // Validar que el cupón pertenezca al mismo centro deportivo que la cancha
      const cancha = await canchasRepository.findById(data.canchaId);
      if (!cancha) {
        throw Boom.notFound(`La cancha con ID ${data.canchaId} no existe.`);
      }
      
      if (cupon.centroId !== cancha.centroId) {
        throw Boom.badRequest(`El cupón ${data.codigoPromoAplicado} no es válido para esta cancha. Pertenece a otro centro deportivo.`);
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


  eliminarReserva(id) {
    return reservaRepository.eliminarReserva(id);
  }
}

module.exports = new ReservaService();