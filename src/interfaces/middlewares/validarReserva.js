// src/interfaces/middlewares/validarReserva.js
const Reserva = require('../../domain/entities/reserva');

function validarReserva(req, res, next) {
  try {
    // Si es PUT (actualización), permite campos opcionales pero valida si hay campos clave
    if (req.method === 'PUT') {
      // Si no hay ningún campo relevante, pasa igual
      if (!req.body.userId && !req.body.canchaId && !req.body.horarioIds) {
        return next();
      }
      // Valida solo los campos presentes
      const reserva = new Reserva({
        reservaId: req.params.id || req.body.reservaId || 'tmp',
        userId: req.body.userId,
        canchaId: req.body.canchaId,
        horarioIds: req.body.horarioIds,
      });
      return next();
    }
    // Para POST (creación), requiere los campos mínimos
    const reserva = new Reserva({
      reservaId: req.body.reservaId || 'tmp',
      userId: req.body.userId,
      canchaId: req.body.canchaId,
      horarioIds: req.body.horarioIds,
    });
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Reserva inválida: ' + err.message });
  }
}

module.exports = validarReserva;