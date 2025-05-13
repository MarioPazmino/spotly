/**
 * src/interfaces/middlewares/validarMetodoPagoDisponible.js
 * Middleware para validar que el método de pago solicitado esté disponible para el centro deportivo
 * Responsabilidad única: Verificar disponibilidad de métodos de pago
 */

/**
 * Middleware para validar métodos de pago disponibles
 * @param {Object} pagosService - Servicio de pagos para consultar métodos disponibles
 * @returns {Function} Middleware Express
 */
const validarMetodoPagoDisponible = (pagosService) => {
  return async (req, res, next) => {
    try {
      let centroId = req.body.centroId || req.params.centroId;
      
      // Si no hay centroId pero hay reservaId, intentar obtener el centroId a partir de la reserva
      if (!centroId && req.body.reservaId) {
        const reservaRepository = require('../../infrastructure/repositories/reservaRepository');
        const canchasRepository = require('../../infrastructure/repositories/canchasRepository');
        
        try {
          // Obtener la reserva
          const reserva = await reservaRepository.obtenerReservaPorId(req.body.reservaId);
          if (reserva && reserva.canchaId) {
            // Obtener la cancha para conseguir el centroId
            const cancha = await canchasRepository.findById(reserva.canchaId);
            if (cancha && cancha.centroId) {
              centroId = cancha.centroId;
              console.log(`CentroId obtenido a partir de la reserva: ${centroId}`);
            }
          }
        } catch (error) {
          console.error('Error al obtener centroId a partir de reservaId:', error);
        }
      }
      
      if (!centroId) {
        return res.status(400).json({ 
          error: 'Se requiere el ID del centro deportivo o un ID de reserva válido',
          mensaje: 'Proporciona centroId directamente o un reservaId válido para continuar'
        });
      }

      const metodosDisponibles = await pagosService.getMetodosPagoDisponibles(centroId);
      const metodoPago = req.body.metodoPago;

      // Si es una operación de pago, validar el método
      if (metodoPago) {
        if (!metodosDisponibles.includes(metodoPago)) {
          return res.status(400).json({
            error: `El método de pago ${metodoPago} no está disponible para este centro deportivo`,
            metodosDisponibles,
            mensaje: `Este centro solo acepta: ${metodosDisponibles.join(', ')}`
          });
        }
      }

      // Agregar los métodos disponibles al request para uso posterior
      req.metodosPagoDisponibles = metodosDisponibles;
      next();
    } catch (error) {
      console.error('Error al validar método de pago:', error);
      next(error);
    }
  };
};

module.exports = validarMetodoPagoDisponible;
