// src/interfaces/http/routes/v1/canchasRoutes.js
const express = require('express');
const router = express.Router();
const CanchasController = require('../../controllers/v1/CanchasController');
const ImagenCanchaController = require('../../controllers/v1/uploadImagenes/ImagenCanchaController');
// Middleware de autenticación simplificado para desarrollo
const auth = (req, res, next) => {
  // En desarrollo, simulamos un usuario autenticado
  req.user = {
    userId: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'cliente',
    picture: null,
    registrationSource: 'cognito',
    pendienteAprobacion: null,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    groups: ['cliente']
  };
  next();
};
const multer = require('multer');
const upload = multer();
const { validate: isUuid } = require('uuid');

// Middleware inline para validar UUID
function validateUUID(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!isUuid(value)) {
      return res.status(400).json({
        message: `El parámetro ${paramName} debe ser un UUID válido.`
      });
    }
    next();
  };
}

// Crear una cancha
router.post('/canchas', auth, CanchasController.createCancha);

// Obtener cancha por ID
router.get('/canchas/:canchaId', auth, validateUUID('canchaId'), CanchasController.getCanchaById);

// Subir imágenes a una cancha
router.post('/canchas/:canchaId/imagenes', auth, validateUUID('canchaId'), upload.array('imagenes', 3), ImagenCanchaController.uploadImagenes);

// Actualizar cancha
router.put('/canchas/:canchaId', auth, validateUUID('canchaId'), CanchasController.updateCancha);

// Eliminar cancha
router.delete('/canchas/:canchaId', auth, validateUUID('canchaId'), CanchasController.deleteCancha);

// Listar canchas por centro deportivo
router.get('/centros/:centroId/canchas', auth, validateUUID('centroId'), CanchasController.listCanchasByCentro);

// Nuevo endpoint: Eliminar imagen específica de una cancha
router.delete('/canchas/:canchaId/imagenes/:key', auth, validateUUID('canchaId'), ImagenCanchaController.deleteImagen);

module.exports = router;