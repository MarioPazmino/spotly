// src/interfaces/middlewares/errorHandler.js


function errorHandler(err, req, res, next) {
    console.error(err);
    
    // Si es un error de Boom, usar su formato
    if (err.isBoom) {
      const { statusCode, payload } = err.output;
      return res.status(statusCode).json({
        ...payload,
        ...(err.data && { data: err.data })
      });
    }
    
    // Para errores regulares
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
      message: process.env.NODE_ENV === 'production' && statusCode === 500 
        ? 'Se produjo un error en el servidor' 
        : err.message || 'Error inesperado',
      statusCode
    });
  }
  
  module.exports = errorHandler;