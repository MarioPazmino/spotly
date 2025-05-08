// src/interfaces/http/controllers/v1/uploadImagenes/ComprobanteTransferenciaController.js
const Boom = require('@hapi/boom');
const { uploadComprobanteTransferencia, getPresignedUrl, deleteObject } = require('../../../../../infrastructure/services/s3Service');

// Importar repositorios directamente para evitar problemas de importación en Lambda
const pagosRepository = require('../../../../../infrastructure/repositories/pagosRepository');
const reservaRepository = require('../../../../../infrastructure/repositories/reservaRepository');
const centroDeportivoRepository = require('../../../../../infrastructure/repositories/centroDeportivoRepository');

class ComprobanteTransferenciaController {
  constructor() {
    // Usar repositorios directamente
    this.pagosRepo = pagosRepository;
    this.reservaRepo = reservaRepository;
    this.centroRepo = centroDeportivoRepository;
  }

  /**
   * Subir comprobante de transferencia
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async uploadComprobante(req, res, next) {
    try {
      const { pagoId } = req.params;
      
      // Verificar que existe el pago
      const pago = await this.pagosRepo.findById(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es por transferencia
      if (pago.metodoPago !== 'transferencia') {
        throw Boom.badRequest('Solo se pueden subir comprobantes para pagos por transferencia');
      }

      // Verificar que el pago está pendiente
      if (pago.estado !== 'Pendiente') {
        throw Boom.badRequest('Solo se pueden subir comprobantes para pagos pendientes');
      }

      // Verificar que se subió un archivo
      if (!req.file) {
        throw Boom.badRequest('Debes subir una imagen del comprobante');
      }

      // Verificar que no hay más de un archivo
      if (req.files && req.files.length > 1) {
        throw Boom.badRequest('Solo se permite subir un comprobante por pago');
      }

      // Verificar si ya existe un comprobante
      if (pago.detallesPago?.comprobanteKey) {
        throw Boom.badRequest('Ya existe un comprobante para este pago. Use la ruta PUT para actualizarlo.');
      }

      // Subir imagen a S3
      const key = await uploadComprobanteTransferencia(req.file.buffer, req.file.originalname, pagoId);

      // Actualizar el pago con la key del comprobante
      const updatedPago = await this.pagosRepo.update(pagoId, {
        detallesPago: {
          ...pago.detallesPago,
          comprobanteKey: key
        }
      });

      // Generar URL firmada para mostrar la imagen
      const presignedUrl = getPresignedUrl(key);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Comprobante subido exitosamente',
          comprobanteUrl: presignedUrl,
          pago: updatedPago
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtener URL del comprobante
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async getComprobante(req, res, next) {
    try {
      const { pagoId } = req.params;
      
      // Verificar que existe el pago
      const pago = await this.pagosRepo.findById(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es por transferencia y tiene comprobante
      if (pago.metodoPago !== 'transferencia' || !pago.detallesPago.comprobanteKey) {
        throw Boom.notFound('No se encontró comprobante para este pago');
      }

      // Generar URL firmada para mostrar la imagen
      const presignedUrl = getPresignedUrl(pago.detallesPago.comprobanteKey);

      return res.status(200).json({
        success: true,
        data: {
          comprobanteUrl: presignedUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualizar comprobante de transferencia
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async updateComprobante(req, res, next) {
    try {
      const { pagoId } = req.params;
      
      // Verificar que existe el pago
      const pago = await this.pagosRepo.findById(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es por transferencia
      if (pago.metodoPago !== 'transferencia') {
        throw Boom.badRequest('Solo se pueden actualizar comprobantes para pagos por transferencia');
      }

      // Verificar que el pago está pendiente
      if (pago.estado !== 'Pendiente') {
        throw Boom.badRequest('Solo se pueden actualizar comprobantes para pagos pendientes');
      }

      // Verificar que se subió un archivo
      if (!req.file) {
        throw Boom.badRequest('Debes subir una imagen del comprobante');
      }

      // Verificar que no hay más de un archivo
      if (req.files && req.files.length > 1) {
        throw Boom.badRequest('Solo se permite subir un comprobante por pago');
      }

      // Verificar que existe un comprobante previo
      if (!pago.detallesPago?.comprobanteKey) {
        throw Boom.badRequest('No existe un comprobante previo para actualizar. Use la ruta POST para subir uno nuevo.');
      }

      // Eliminar el comprobante anterior de S3
      await deleteObject(pago.detallesPago.comprobanteKey);

      // Subir nueva imagen a S3
      const key = await uploadComprobanteTransferencia(req.file.buffer, req.file.originalname, pagoId);

      // Actualizar el pago con la nueva key del comprobante
      const updatedPago = await this.pagosRepo.update(pagoId, {
        detallesPago: {
          ...pago.detallesPago,
          comprobanteKey: key
        }
      });

      // Generar URL firmada para mostrar la imagen
      const presignedUrl = getPresignedUrl(key);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Comprobante actualizado exitosamente',
          comprobanteUrl: presignedUrl,
          pago: updatedPago
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Eliminar comprobante de transferencia
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  async deleteComprobante(req, res, next) {
    try {
      const { pagoId } = req.params;
      
      // Verificar que existe el pago
      const pago = await this.pagosRepo.findById(pagoId);
      if (!pago) {
        throw Boom.notFound('Pago no encontrado');
      }

      // Verificar que el pago es por transferencia y tiene comprobante
      if (pago.metodoPago !== 'transferencia' || !pago.detallesPago?.comprobanteKey) {
        throw Boom.notFound('No se encontró comprobante para este pago');
      }

      // Verificar que el pago está pendiente
      if (pago.estado !== 'Pendiente') {
        throw Boom.badRequest('Solo se pueden eliminar comprobantes de pagos pendientes');
      }

      // Eliminar el comprobante de S3
      await deleteObject(pago.detallesPago.comprobanteKey);

      // Actualizar el pago eliminando la key del comprobante
      const updatedPago = await this.pagosRepo.update(pagoId, {
        detallesPago: {
          ...pago.detallesPago,
          comprobanteKey: null
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Comprobante eliminado exitosamente',
          pago: updatedPago
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ComprobanteTransferenciaController();
