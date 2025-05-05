// src/infrastructure/services/cuponDescuentoService.js
// Ahora solo maneja horaInicio y horaFin (formato HHmm) para la vigencia de cupones.
const CuponDescuentoRepository = require('../repositories/cuponDescuentoRepository');
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const { esHoraEnRango, normalizarFechaGuayaquil, estaEnRango } = require('../../utils/fechas');

class CuponDescuentoService {
  constructor(repo = new CuponDescuentoRepository()) {
    this.repo = repo;
  }
  async create(data, userId) {
    // Validar existencia del centro deportivo
    const centroRepo = new CentroDeportivoRepository();
    const centro = await centroRepo.findById(data.centroId);
    if (!centro) throw new Error('El centroId asociado no existe');
    // Validar que solo el admin del centro pueda crear cupones
    if (!userId || centro.adminId !== userId) {
      throw new Error('Solo el administrador del centro puede crear cupones');
    }
    // Permitir varios cupones por centro, pero el código debe ser único por centro
    const existente = await this.repo.findByCentroIdYCodigo(data.centroId, data.codigo);
    if (existente) {
      throw new Error('Ya existe un cupón con ese código para este centro');
    }

    // Normalizar fechas
    if (data.fechaInicio) data.fechaInicio = normalizarFechaGuayaquil(data.fechaInicio);
    if (data.fechaFin) data.fechaFin = normalizarFechaGuayaquil(data.fechaFin);
    // Validar que usosRestantes no sea negativo ni mayor que maximoUsos
    if (data.usosRestantes !== undefined) {
      if (data.usosRestantes < 0) throw new Error('usosRestantes no puede ser negativo');
      if (data.maximoUsos !== undefined && data.usosRestantes > data.maximoUsos) throw new Error('usosRestantes no puede ser mayor que maximoUsos');
    }
    return this.repo.create(data);
  }
  async getById(cuponId) {
    return this.repo.getById(cuponId);
  }
  async findByCodigo(codigo) {
    return this.repo.findByCodigo(codigo);
  }
  async update(cuponId, updates, userId) {
    // Validar que usosRestantes no sea negativo ni mayor que maximoUsos
    if (updates.usosRestantes !== undefined) {
      // Obtener maximoUsos actualizado o actual
      let maximoUsos = updates.maximoUsos;
      if (maximoUsos === undefined) {
        const cupon = await this.repo.getById(cuponId);
        maximoUsos = cupon ? cupon.maximoUsos : undefined;
      }
      if (updates.usosRestantes < 0) throw new Error('usosRestantes no puede ser negativo');
      if (maximoUsos !== undefined && updates.usosRestantes > maximoUsos) throw new Error('usosRestantes no puede ser mayor que maximoUsos');
    }
    // Impedir modificar centroId
    if (updates.centroId !== undefined) {
      const cupon = await this.repo.getById(cuponId);
      if (!cupon) throw new Error('Cupón no encontrado');
      if (updates.centroId !== cupon.centroId) {
        throw new Error('No se permite modificar el centroId de un cupón');
      }
      // Si es igual, simplemente no lo actualices
      delete updates.centroId;
    }
    // Validar que solo el admin del centro pueda actualizar cupones
    const cupon = await this.repo.getById(cuponId);
    if (!cupon) throw new Error('Cupón no encontrado');
    const centroRepo = new CentroDeportivoRepository();
    const centro = await centroRepo.findById(cupon.centroId);
    if (!userId || centro.adminId !== userId) {
      throw new Error('Solo el administrador del centro puede actualizar cupones');
    }

    // Normalizar fechas
    if (updates.fechaInicio) updates.fechaInicio = normalizarFechaGuayaquil(updates.fechaInicio);
    if (updates.fechaFin) updates.fechaFin = normalizarFechaGuayaquil(updates.fechaFin);
    // Si se intenta cambiar el código, asegurar unicidad por centro
    if (updates.codigo !== undefined && updates.codigo !== cupon.codigo) {
      const existente = await this.repo.findByCentroIdYCodigo(cupon.centroId, updates.codigo);
      if (existente && existente.cuponId !== cuponId) {
        throw new Error('Ya existe un cupón con ese código para este centro');
      }
    }
    return this.repo.update(cuponId, updates);
  }

  // Aplica un cupón por código y actualiza usosRestantes
  async applyCoupon(codigo) {
    const cupon = await this.repo.findByCodigo(codigo);
    if (!cupon) throw new Error('Cupón no encontrado');
    // Validar rango de fechas
    const { fechaInicio, fechaFin } = cupon;
    const hoy = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (hoy < inicio || hoy > fin) {
      throw new Error('El cupón no está vigente en la fecha actual');
    }
    if (cupon.usosRestantes !== undefined && cupon.usosRestantes <= 0) {
      throw new Error('El cupón ya no tiene usos disponibles');
    }
    // Actualiza usosRestantes
    const nuevosUsos = cupon.usosRestantes !== undefined ? cupon.usosRestantes - 1 : undefined;
    const actualizado = await this.repo.update(cupon.cuponId, { usosRestantes: nuevosUsos });
    return actualizado;
  }
  async delete(cuponId) {
    return this.repo.delete(cuponId);
  }

  // Obtener todos los cupones de un centro
  async findAllByCentroId(centroId, limit = 20, lastKey = undefined) {
    return this.repo.findAllByCentroId(centroId, limit, lastKey);
  }

  // Aplicar cupón: validar vigencia usando utilidades de fechas
  async applyCoupon({ codigo, centroId }) {
    const cupon = await this.repo.findByCentroIdYCodigo(centroId, codigo);
    if (!cupon) {
      throw new Error('Cupón no válido para este centro');
    }
    // Aplicar cupón: validar vigencia solo por fecha (ISO sin segundos)
    const ahora = new Date();
    if (!estaEnRango(ahora, cupon.fechaInicio, cupon.fechaFin)) {
      throw new Error('El cupón no está vigente');
    }
    if (cupon.usosRestantes <= 0) {
      throw new Error('El cupón ya no tiene usos disponibles');
    }
    // Actualizar usosRestantes de forma atómica y segura en DynamoDB
    const actualizado = await this.repo.descontarUsoSeguro(cupon.cuponId);
    if (!actualizado) {
      throw new Error('No se pudo aplicar el cupón (concurrencia: sin usos disponibles)');
    }
    return actualizado;
  }
}

module.exports = new CuponDescuentoService();