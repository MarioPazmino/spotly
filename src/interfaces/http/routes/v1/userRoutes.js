// src/interfaces/http/routes/v1/userRoutes.js
const express = require('express');
const router = express.Router();

const UserController = require('../../controllers/v1/UserController');
const ImagenUsuarioController = require('../../controllers/v1/ImagenUsuarioController');
const authenticate = require('../../../middlewares/CognitoAuthMiddleware');
const { checkPermission } = require('../../../middlewares/authorization');
const multer = require('multer');
const upload = multer();

// Middleware de autenticación
const auth = authenticate.authenticate();

// Rutas públicas
// router.post('/', UserController.createUser); // Registro de usuarios (cliente o admin_centro)

// Rutas protegidas
router.get('/:userId', auth, UserController.getUserById); // Obtener usuario por ID
router.put('/:userId', auth, UserController.updateUserProfile); // Actualizar perfil de usuario
router.delete('/:userId', auth, checkPermission('delete:user'), UserController.deleteUser); // Eliminar usuario
router.post('/:userId/picture', auth, upload.single('imagen'), ImagenUsuarioController.uploadImagen); // Subir o actualizar imagen de perfil de usuario (solo 1 imagen, archivo o URL)

// Rutas administrativas (solo super_admin)
router.get('/pendientes', auth, checkPermission('approve:admin_centro'), UserController.listPendingAdmins); // Listar admins pendientes
router.post('/aprobar/:userId', auth, checkPermission('approve:admin_centro'), UserController.approveAdminCenter); // Aprobar admin_centro


module.exports = router;