// src/interfaces/http/routes/v1/userRoutes.js
const express = require('express');
const router = express.Router();

// Controladores
const UserController = require('../../controllers/v1/UserController');
const ImagenUsuarioController = require('../../controllers/v1/uploadImagenes/ImagenUsuarioController');

// Middlewares con responsabilidad única
const authMiddleware = require('../../../middlewares/authorization');
const jwtAuthMiddleware = require('../../../middlewares/auth/jwtAuthMiddleware');
const { profileImageUploadMiddleware } = require('../../../middlewares/upload/imageUploadMiddleware');

// Rutas públicas
// router.post('/', UserController.createUser); // Registro de usuarios (cliente o admin_centro)

// Rutas administrativas (solo super_admin)
router.get('/pendientes', jwtAuthMiddleware, authMiddleware.checkPermission('approve:admin_centro'), UserController.listPendingAdmins);
router.post('/aprobar/:userId', jwtAuthMiddleware, authMiddleware.checkPermission('approve:admin_centro'), UserController.approveAdminCenter);

// Ruta para listar todos los usuarios (solo super_admin)
router.get('/', jwtAuthMiddleware, authMiddleware.checkPermission('list:users'), UserController.listAllUsers);

// Rutas protegidas
// GET /api/v1/users/:userId - Cualquier usuario autenticado puede ver su propio perfil
router.get('/:userId', jwtAuthMiddleware, UserController.getUserById);

// PUT /api/v1/users/:userId - Solo el propio usuario puede actualizar su perfil
router.put('/:userId', jwtAuthMiddleware, authMiddleware.checkPermission('update:perfil'), UserController.updateUserProfile);

// DELETE /api/v1/users/:userId - Solo super_admin puede eliminar usuarios
router.delete('/:userId', jwtAuthMiddleware, authMiddleware.checkPermission('delete:user'), UserController.deleteUser);

// POST /api/v1/users/:userId/imagenPerfil - Solo el propio usuario puede actualizar su foto
router.post(
  '/:userId/imagenPerfil',
  jwtAuthMiddleware,
  authMiddleware.checkPermission('update:perfil'),
  profileImageUploadMiddleware,
  ImagenUsuarioController.uploadImagen
);

module.exports = router;
