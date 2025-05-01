// src/interfaces/http/routes/v1/userRoutes.js
const express = require('express');
const router = express.Router();

const UserController = require('../../controllers/v1/UserController');
const authenticate = require('../../../middlewares/CognitoAuthMiddleware');
const { checkPermission } = require('../../../middlewares/authorization');

// Middleware de autenticación
const auth = authenticate.authenticate();

// Rutas públicas
router.post('/', UserController.createUser); // Registro de usuarios (cliente o admin_centro)

// Rutas protegidas
router.get('/:userId', auth, UserController.getUserById); // Obtener usuario por ID
router.put('/:userId', auth, UserController.updateUserProfile); // Actualizar perfil de usuario
router.delete('/:userId', auth, checkPermission('delete:user'), UserController.deleteUser); // Eliminar usuario

// Rutas administrativas (solo super_admin)
router.get('/pendientes', auth, checkPermission('approve:admin_centro'), UserController.listPendingAdmins); // Listar admins pendientes
router.post('/aprobar/:userId', auth, checkPermission('approve:admin_centro'), UserController.approveAdminCenter); // Aprobar admin_centro

// Rutas de autenticación y autorización de Cognito
router.post('/pre-signup', UserController.preSignUp);
router.post('/post-confirmation', UserController.postConfirmation);
router.post('/post-authentication', UserController.postAuthentication);

module.exports = router;