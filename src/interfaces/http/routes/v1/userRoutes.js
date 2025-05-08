// src/interfaces/http/routes/v1/userRoutes.js
const express = require('express');
const router = express.Router();

const UserController = require('../../controllers/v1/UserController');
const ImagenUsuarioController = require('../../controllers/v1/uploadImagenes/ImagenUsuarioController');
const { checkPermission } = require('../../../middlewares/authorization');
const multer = require('multer');

// Configuración básica de multer para manejar la subida de archivos
const upload = multer();

// Middleware de autenticación que verifica tokens JWT
const auth = (req, res, next) => {
  try {
    // Verificar si hay un token de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No se proporcionó un token de autenticación válido' });
    }

    // Extraer el token
    const token = authHeader.split(' ')[1];
    
    // En producción, el token ya ha sido verificado por API Gateway/Cognito
    // y la información del usuario está disponible en req.requestContext.authorizer
    // Aquí solo extraemos la información del usuario del token
    
    // Si estamos en desarrollo y no hay información de usuario, usamos un usuario de prueba
    if (process.env.STAGE === 'dev' && (!req.requestContext || !req.requestContext.authorizer)) {
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
    }
    
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(401).json({ error: 'Error al verificar el token de autenticación' });
  }
};

// Rutas públicas
// router.post('/', UserController.createUser); // Registro de usuarios (cliente o admin_centro)

// Rutas administrativas (solo super_admin)
router.get('/pendientes', auth, checkPermission('approve:admin_centro'), UserController.listPendingAdmins);
router.post('/aprobar/:userId', auth, checkPermission('approve:admin_centro'), UserController.approveAdminCenter);

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

module.exports = router;