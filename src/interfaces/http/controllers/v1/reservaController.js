const reservaService = require('../../../../infrastructure/services/reservaService');

exports.crearReserva = async (req, res) => {
  try {
    // Obtener userId del token JWT
    const userId = req.user && (req.user.userId || req.user.sub);
    
    if (!userId) {
      return res.status(401).json({ 
        error: 'No autorizado', 
        mensaje: 'No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.' 
      });
    }
    
    // Crear objeto de datos con el userId del token
    const reservaData = {
      ...req.body,
      userId  // Sobrescribir cualquier userId que pudiera venir en el cuerpo
    };
    
    const reserva = await reservaService.crearReserva(reservaData);
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
    
    // Verificar si el usuario es admin basado en los grupos del token JWT
    const userGroups = req.user && req.user.groups ? req.user.groups : [];
    const isAdmin = userGroups.includes('super_admin') || userGroups.includes('admin_centro');
    
    // Si es admin, permitir filtros adicionales
    const filters = isAdmin ? { estado, fechaInicio, fechaFin } : {};
    
    // Obtener el userId del parámetro de ruta
    const userId = req.params.userId;
    console.log(`Obteniendo reservas para el usuario con ID: ${userId}`);
    
    // Verificar permisos - solo el propio usuario o un admin pueden ver las reservas
    const currentUserId = req.user && (req.user.userId || req.user.sub);
    if (!isAdmin && currentUserId !== userId) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'No tienes permiso para ver las reservas de este usuario'
      });
    }
    
    const result = await reservaService.obtenerReservasPorUsuario(
      userId,
      {
        limit: limit ? parseInt(limit) : undefined,
        lastKey: lastKey ? JSON.parse(lastKey) : undefined,
        ...filters
      }
    );
    
    // Si no hay reservas, devolver un mensaje más descriptivo
    if (!result.items || result.items.length === 0) {
      return res.json({
        reservas: [],
        mensaje: 'No se encontraron reservas para este usuario',
        lastKey: null
      });
    }
    
    res.json({ reservas: result.items, lastKey: result.lastKey });
  } catch (err) {
    console.error(`Error al obtener reservas por usuario: ${err.message}`);
    if (err.isBoom) {
      res.status(err.output.statusCode).json(err.output.payload);
    } else {
      res.status(400).json({
        error: 'Error al obtener reservas',
        mensaje: err.message,
        detalles: 'Verifica que el ID de usuario sea correcto y que tengas los permisos necesarios'
      });
    }
  }
};

exports.obtenerReservasPorCancha = async (req, res) => {
  try {
    const { limit, lastKey, estado, fechaInicio, fechaFin } = req.query;
    
    // Verificar si el usuario es admin basado en los grupos del token JWT
    const userGroups = req.user && req.user.groups ? req.user.groups : [];
    const isAdmin = userGroups.includes('super_admin') || userGroups.includes('admin_centro');
    
    const filters = isAdmin ? { estado, fechaInicio, fechaFin } : {};
    const result = await reservaService.obtenerReservasPorCancha(
      req.params.canchaId,
      {
        limit: limit ? parseInt(limit) : undefined,
        lastKey: lastKey ? JSON.parse(lastKey) : undefined,
        ...filters
      }
    );
    
    // Si no hay reservas, devolver un mensaje más descriptivo
    if (!result.items || result.items.length === 0) {
      return res.json({
        reservas: [],
        mensaje: 'No se encontraron reservas para esta cancha',
        lastKey: null
      });
    }
    
    res.json({ reservas: result.items, lastKey: result.lastKey });
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

// No es necesario exportar de nuevo, ya exportamos cada función individualmente
