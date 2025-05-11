// src/interfaces/middlewares/upload/canchaImageUploadMiddleware.js
const multer = require('multer');

// Configuración básica de multer para manejar la subida de archivos
const upload = multer();

/**
 * Middleware para manejar la subida de imágenes de canchas
 * Responsabilidad única: Procesar la subida de archivos de imagen
 * Intenta varios nombres de campo comunes para mayor flexibilidad
 * Soporta arrays de imágenes (hasta 3) para canchas
 */
const array = (fieldName, maxCount = 3) => (req, res, next) => {
  upload.array(fieldName, maxCount)(req, res, (err) => {
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      // Si falla con el nombre original, intentar con 'imagenes'
      upload.array('imagenes', maxCount)(req, res, (err) => {
        if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
          // Si falla con 'imagenes', intentar con 'files'
          upload.array('files', maxCount)(req, res, (err) => {
            if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
              // Si falla con 'files', intentar con 'images'
              upload.array('images', maxCount)(req, res, (err) => {
                if (err) {
                  console.error('Error en upload de imágenes:', err);
                  return res.status(400).json({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'No se encontraron imágenes para subir. Use el campo "imagenes" o "files"'
                  });
                }
                next();
              });
            } else if (err) {
              console.error('Error en upload de imágenes:', err);
              return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: err.message || 'Error al procesar la subida de imágenes'
              });
            } else {
              next();
            }
          });
        } else if (err) {
          console.error('Error en upload de imágenes:', err);
          return res.status(400).json({
            statusCode: 400,
            error: 'Bad Request',
            message: err.message || 'Error al procesar la subida de imágenes'
          });
        } else {
          next();
        }
      });
    } else if (err) {
      console.error('Error en upload de imágenes:', err);
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Error al procesar la subida de imágenes'
      });
    } else {
      next();
    }
  });
};

// Exportar el middleware
module.exports = array;
