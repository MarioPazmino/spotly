/**
 * Middleware de manejo de errores para Express
 * Estandariza las respuestas de error en formato JSON para Postman
 */
function expressErrorHandler(err, req, res, next) {
  console.error('Error en solicitud Express:', err);

  // Manejar errores estructurados con formato específico
  if (err && err.status && err.code && err.message) {
    return res.status(err.status).json({
      error: err.message,
      mensaje: err.message,
      detalles: err.detalles || {},
      code: err.code
    });
  }

  // Error de validación Joi (si se usa Joi)
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Error de validación',
      mensaje: err.details.map(detail => detail.message).join(', '),
      detalles: err.details,
      code: 'VALIDATION_ERROR'
    });
  }

  // Error de duplicado de MongoDB (si aplica)
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      error: 'Conflicto de datos',
      mensaje: 'Ya existe un recurso con esos datos únicos',
      detalles: err.keyValue,
      code: 'DUPLICATE_KEY'
    });
  }

  // Error de validación de Mongoose (si aplica)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      mensaje: 'Datos inválidos en la solicitud',
      detalles: Object.values(err.errors).map(val => val.message),
      code: 'VALIDATION_ERROR'
    });
  }

  // Error de AWS DynamoDB (si aplica)
  if (err.code && err.code.startsWith('Dynamic') || err.name === 'ResourceNotFoundException') {
    return res.status(500).json({
      error: 'Error de base de datos',
      mensaje: err.message || 'Error al acceder a la base de datos',
      detalles: {
        servicio: 'DynamoDB',
        error: err.code
      },
      code: 'DATABASE_ERROR'
    });
  }

  // Errores de autorización
  if (err.name === 'UnauthorizedError' || err.statusCode === 401) {
    return res.status(401).json({
      error: 'No autorizado',
      mensaje: err.message || 'No tienes autorización para realizar esta acción',
      code: 'UNAUTHORIZED'
    });
  }

  // Errores de permisos
  if (err.statusCode === 403) {
    return res.status(403).json({
      error: 'Acceso prohibido',
      mensaje: err.message || 'No tienes permiso para realizar esta acción',
      code: 'FORBIDDEN'
    });
  }

  // Errores de recurso no encontrado
  if (err.statusCode === 404) {
    return res.status(404).json({
      error: 'No encontrado',
      mensaje: err.message || 'El recurso solicitado no existe',
      code: 'NOT_FOUND'
    });
  }

  // Error de AWS S3 (si aplica)
  if (err.code && (err.code.startsWith('S3') || err.code === 'NoSuchKey')) {
    return res.status(500).json({
      error: 'Error de almacenamiento',
      mensaje: 'Error al acceder al almacenamiento de archivos',
      detalles: {
        servicio: 'S3',
        error: err.code,
        mensaje: err.message
      },
      code: 'STORAGE_ERROR'
    });
  }

  // Errores de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON inválido',
      mensaje: 'El cuerpo de la solicitud contiene JSON malformado',
      code: 'INVALID_JSON'
    });
  }

  // Por defecto: error 500 genérico
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    error: statusCode === 500 ? 'Error interno del servidor' : err.name || 'Error',
    mensaje: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Ocurrió un error inesperado en el servidor'
      : err.message || 'Error inesperado',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  });
}

module.exports = expressErrorHandler; 