// src/interfaces/middlewares/errorHandler.js
function errorHandler(error) {
  console.error('Error en la solicitud:', error);

  // Manejar errores estructurados para Postman
  if (error && error.status && error.code && error.message) {
    return {
      statusCode: error.status,
      body: JSON.stringify({
        error: error.message,
        mensaje: error.message,
        detalles: error.detalles || {},
        code: error.code
      })
    };
  }

  if (error.isBoom) {
    const { statusCode, payload } = error.output;
    return {
      statusCode,
      body: JSON.stringify({
        ...payload,
        ...(error.data && { data: error.data })
      })
    };
  }

  const statusCode = error.statusCode || 500;
  return {
    statusCode,
    body: JSON.stringify({
      error: statusCode === 500 ? 'Internal Server Error' : error.name,
      mensaje: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Se produjo un error en el servidor'
        : error.message || 'Error inesperado',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      statusCode
    })
  };
}

module.exports = errorHandler;