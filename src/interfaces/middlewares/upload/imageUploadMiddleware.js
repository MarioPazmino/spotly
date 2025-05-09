// src/interfaces/middlewares/upload/imageUploadMiddleware.js
const multer = require('multer');

// Configuración básica de multer para manejar la subida de archivos
const upload = multer();

/**
 * Middleware para manejar la subida de imágenes de perfil
 * Responsabilidad única: Procesar la subida de archivos de imagen
 * Intenta varios nombres de campo comunes para mayor flexibilidad
 */
const profileImageUploadMiddleware = (req, res, next) => {
  upload.single('imagen')(req, res, (err) => {
    if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
      // Si falla con 'imagen', intentar con 'file'
      upload.single('file')(req, res, (err) => {
        if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
          // Si falla con 'file', intentar con 'image'
          upload.single('image')(req, res, (err) => {
            if (err && err.code === 'LIMIT_UNEXPECTED_FILE') {
              // Si falla con 'image', intentar con 'imagenPerfil'
              upload.single('imagenPerfil')(req, res, (err) => {
                if (err) {
                  return next(err);
                }
                next();
              });
            } else if (err) {
              return next(err);
            } else {
              next();
            }
          });
        } else if (err) {
          return next(err);
        } else {
          next();
        }
      });
    } else if (err) {
      return next(err);
    } else {
      next();
    }
  });
};

module.exports = {
  profileImageUploadMiddleware
};
