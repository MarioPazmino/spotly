// src/interfaces/middlewares/errorHandler.js
function errorHandler(error) {
  console.error('Error en la solicitud:', error);
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
      message: process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Se produjo un error en el servidor'
        : error.message || 'Error inesperado',
      statusCode
    })
  };
}
module.exports = errorHandler;