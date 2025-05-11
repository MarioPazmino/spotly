// src/interfaces/http/routes/v1/canchasRoutes.js
/**
 * Rutas para la gestión de canchas deportivas
 * Responsabilidad única: Definir las rutas y sus controladores asociados
 */
const express = require ('express');
const router = express.Router();
const CanchasController = require('../../controllers/v1/CanchasController');

// Importar el middleware de verificación de propiedad de canchas
const { checkCanchaOwnershipMiddleware } = require('../../../middlewares/auth/checkCanchaOwnershipMiddleware');

// Importar el middleware de autenticación JWT
const auth = require('../../../middlewares/auth/jwtAuthMiddleware');

// Importar el controlador de imágenes de canchas
const ImagenCanchaController = require('../../controllers/v1/uploadImagenes/ImagenCanchaController');
console.log('Controlador de imágenes de canchas importado correctamente');
// Importar el middleware de upload para imágenes de canchas
let uploadCanchaImages;
try {
  // Intentar usar el middleware específico para canchas
  uploadCanchaImages = require('../../../middlewares/upload/canchaImageUploadMiddleware');
  console.log('Middleware de upload de imágenes de canchas importado correctamente');
} catch (error) {
  console.error('Error al importar el middleware de upload de imágenes de canchas, usando implementación de respaldo:', error.message);
  
  // Usar la implementación de respaldo
  uploadCanchaImages = require('../../../middlewares/upload/canchaImageUploadMiddlewareBackup');
  console.log('Usando implementación de respaldo para el middleware de upload de imágenes de canchas');
}

console.log('Middleware de upload configurado correctamente');

// Importar el middleware de validación UUID
const validateUUID = require('../../../middlewares/validation/uuidValidationMiddleware');

// Obtener todas las canchas
router.get('/', auth, CanchasController.getAllCanchas);

// Crear una cancha
router.post('/', auth, CanchasController.createCancha);

// Listar canchas por centro deportivo (debe ir antes de la ruta paramétrica genérica)
router.get('/centro/:centroId', auth, validateUUID('centroId'), CanchasController.listCanchasByCentro);

// Obtener cancha por ID
router.get('/:canchaId', auth, validateUUID('canchaId'), CanchasController.getCanchaById);

// Subir imágenes a una cancha
router.post('/:canchaId/imagenes', auth, validateUUID('canchaId'), checkCanchaOwnershipMiddleware, uploadCanchaImages('imagenes', 3), ImagenCanchaController.uploadImagenes);

// Actualizar cancha
router.put('/:canchaId', auth, validateUUID('canchaId'), CanchasController.updateCancha);

// Eliminar cancha
router.delete('/:canchaId', auth, validateUUID('canchaId'), CanchasController.deleteCancha);

// La ruta para listar canchas por centro deportivo se movió arriba para evitar conflictos con la ruta paramétrica genérica

// Ruta de prueba para diagnosticar problemas de enrutamiento (no requiere autenticación)
router.get('/test', (req, res) => {
  console.log('Ruta de prueba de canchas accedida');
  return res.status(200).json({
    message: 'Ruta de prueba de canchas funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Nuevo endpoint: Eliminar imagen específica de una cancha por índice
router.delete('/:canchaId/imagenes/:index', auth, validateUUID('canchaId'), checkCanchaOwnershipMiddleware, ImagenCanchaController.deleteImagenPorIndice);

module.exports = router;