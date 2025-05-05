//src/interfaces/http/controllers/v1/reservaController.js
const reservaService = require('../../../../infrastructure/services/reservaService');

exports.crearReserva = async (req, res) => {
  try {
    const reserva = await reservaService.crearReserva(req.body);
    res.status(201).json({ reserva });
  } catch (err) {
    if (err.isBoom) {
      res.status(err.output.statusCode).json(err.output.payload);
    } else {
      res.status(400).json({ error: 'Reserva inválida: ' + err.message });
    }
  }
};

exports.obtenerReservaPorId = async (req, res) => {
  try {
    const reserva = await reservaService.obtenerReservaPorId(req.params.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json({ reserva });
  } catch (err) {
    if (err.isBoom) {
      res.status(err.output.statusCode).json(err.output.payload);
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

exports.obtenerReservasPorUsuario = async (req, res) => {
  try {
    const { limit, lastKey, estado, fechaInicio, fechaFin } = req.query;
    const isAdmin = req.user && (req.user.role === 'super_admin' || req.user.role === 'admin_centro');
    const filters = isAdmin ? { estado, fechaInicio, fechaFin } : {};
    const result = await reservaService.obtenerReservasPorUsuario(
      req.params.userId,
      {
        limit: limit ? parseInt(limit) : undefined,
        lastKey: lastKey ? JSON.parse(lastKey) : undefined,
        ...filters
      }
    );
    res.json({ reservas: result.items, lastKey: result.lastKey });
  } catch (err) {
    if (err.isBoom) {
      res.status(err.output.statusCode).json(err.output.payload);
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

exports.obtenerReservasPorCancha = async (req, res) => {
  try {
    const { limit, lastKey, estado, fechaInicio, fechaFin } = req.query;
    const isAdmin = req.user && (req.user.role === 'super_admin' || req.user.role === 'admin_centro');
    const filters = isAdmin ? { estado, fechaInicio, fechaFin } : {};
    const result = await reservaService.obtenerReservasPorCancha(
      req.params.canchaId,
      {
        limit: limit ? parseInt(limit) : undefined,
        lastKey: lastKey ? JSON.parse(lastKey) : undefined,
        ...filters
      }
    );
    res.json({ reservas: result.items, lastKey: result.lastKey });
  } catch (err) {
    if (err.isBoom) {
      res.status(err.output.statusCode).json(err.output.payload);
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

exports.actualizarReserva = async (req, res) => {
  try {
    const reserva = await reservaService.actualizarReserva(req.params.id, req.body);
    res.json({ reserva });
  } catch (err) {
    if (err.isBoom) {
      res.status(err.output.statusCode).json(err.output.payload);
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

exports.eliminarReserva = async (req, res) => {
  try {
    const result = await reservaService.eliminarReserva(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.isBoom) {
      res.status(err.output.statusCode).json(err.output.payload);
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};