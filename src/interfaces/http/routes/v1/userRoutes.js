// src/interfaces/http/routes/v1/userRoutes.js
const express = require('express');
const router = express.Router();

const UserController = require('../../controllers/v1/UserController');
const ImagenUsuarioController = require('../../controllers/v1/uploadImagenes/ImagenUsuarioController');
const authenticate = require('../../../middlewares/CognitoAuthMiddleware');
const { checkPermission } = require('../../../middlewares/authorization');
const multer = require('multer');

// Configuración básica de multer para manejar la subida de archivos
const upload = multer();

// Middleware de autenticación
const auth = authenticate.authenticate();

// Rutas públicas
// router.post('/', UserController.createUser); // Registro de usuarios (cliente o admin_centro)

// Rutas protegidas
// GET /api/v1/users/:userId - Cualquier usuario autenticado puede ver su propio perfil
router.get('/:userId', auth, UserController.getUserById);

// PUT /api/v1/users/:userId - Solo el propio usuario puede actualizar su perfil
router.put('/:userId', auth, checkPermission('update:perfil'), UserController.updateUserProfile);

// DELETE /api/v1/users/:userId - Solo super_admin puede eliminar usuarios
router.delete('/:userId', auth, checkPermission('delete:user'), UserController.deleteUser);

// POST /api/v1/users/:userId/picture - Solo el propio usuario puede actualizar su foto
router.post(
  '/:userId/picture',
  auth,
  checkPermission('update:perfil'),
  upload.single('imagen'),
  ImagenUsuarioController.uploadImagen
);

// Rutas administrativas (solo super_admin)
router.get('/pendientes', auth, checkPermission('approve:admin_centro'), UserController.listPendingAdmins);
router.post('/aprobar/:userId', auth, checkPermission('approve:admin_centro'), UserController.approveAdminCenter);

module.exports = router;