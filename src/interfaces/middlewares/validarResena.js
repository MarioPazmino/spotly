const { sanitizeResena } = require('../../../utils/sanitizeInput');

const validarResena = (req, res, next) => {
  try {
    // Sanitizar datos de entrada
    const sanitizedData = sanitizeResena(req.body);
    req.body = sanitizedData;

    // Validar campos requeridos
    const { userId, calificacion, comentario } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'El ID del usuario es requerido' });
    }
    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'La calificación debe ser un número entre 1 y 5' });
    }
    if (!comentario || comentario.trim().length === 0) {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }

    // Validar que se proporcione exactamente uno de los IDs
    const { canchaId, centroId } = req.body;
    if (!canchaId && !centroId) {
      return res.status(400).json({ error: 'Se requiere un ID de cancha o centro deportivo' });
    }
    if (canchaId && centroId) {
      return res.status(400).json({ error: 'Solo se puede especificar un ID de cancha o centro deportivo, no ambos' });
    }

    next();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = validarResena; 