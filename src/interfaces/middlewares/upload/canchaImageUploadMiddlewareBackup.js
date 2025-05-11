// src/interfaces/middlewares/upload/canchaImageUploadMiddlewareBackup.js
/**
 * Middleware de respaldo para la carga de imágenes de canchas
 * Se utiliza cuando el middleware principal no está disponible
 */
const multer = require('multer');
const upload = multer();

/**
 * Middleware para procesar la carga de imágenes de canchas
 * @param {string} fieldName - Nombre del campo en el formulario
 * @param {number} maxCount - Número máximo de archivos permitidos
 * @returns {Function} Middleware de Express
 */
const uploadCanchaImages = (fieldName, maxCount = 3) => (req, res, next) => {
  upload.array(fieldName, maxCount)(req, res, (err) => {
    if (err) {
      console.error('Error en upload de imágenes (respaldo):', err);
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: err.message || 'Error al procesar la subida de imágenes'
      });
    }
    next();
  });
};

module.exports = uploadCanchaImages;
