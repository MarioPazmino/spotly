// src/interfaces/middlewares/validarReserva.js
const Reserva = require('../../domain/entities/reserva');

function validarReserva(req, res, next) {
  try {
    // Obtener userId del token JWT
    const userId = req.user && (req.user.userId || req.user.sub);
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'No autorizado', 
        mensaje: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.' 
      });
    }
    
    // Si es PUT (actualización), permite campos opcionales pero valida si hay campos clave
    if (req.method === 'PUT') {
      // Si no hay ningún campo relevante, pasa igual
      if (!req.body.canchaId && !req.body.horarioIds) {
        return next();
      }
      // Valida solo los campos presentes
      const reserva = new Reserva({
        reservaId: req.params.id || req.body.reservaId || 'tmp',
        userId, // Usar el userId del token
        canchaId: req.body.canchaId,
        horarioIds: req.body.horarioIds,
      });
      return next();
    }
    
    // Para POST (creación), requiere los campos mínimos
    if (!req.body.canchaId) {
      return res.status(400).json({ 
        error: 'Datos insuficientes', 
        mensaje: 'Se requiere especificar una cancha (canchaId)' 
      });
    }
    
    if (!req.body.horarioIds || !Array.isArray(req.body.horarioIds) || req.body.horarioIds.length === 0) {
      return res.status(400).json({ 
        error: 'Datos insuficientes', 
        mensaje: 'Se requiere especificar al menos un horario (horarioIds)' 
      });
    }
    
    // Para la creación, usamos un ID temporal que será reemplazado por el servicio
    const reserva = new Reserva({
      reservaId: 'tmp-' + Date.now(), // ID temporal que será reemplazado
      userId, // Usar el userId del token
      canchaId: req.body.canchaId,
      horarioIds: req.body.horarioIds,
    });
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Reserva inválida: ' + err.message });
  }
}

module.exports = validarReserva;