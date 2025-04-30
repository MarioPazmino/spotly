// src/interfaces/http/routes/v1/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../../controllers/v1/UserController');
const cognitoAuth = require('../../../middlewares/cognitoAuth');
const authorization = require('../../../middlewares/authorization');
const { tokenRefresher, tokenHeaderApplier } = require('../../../middlewares/tokenRefresher');

// Función para obtener usuario para verificación de propiedad
const getUserForOwnershipCheck = async (req) => {
  const userRepository = req.app.get('userRepository');
  return await userRepository.findById(req.params.userId);
};
// Rutas públicas
router.post('/', UserController.createUser);

router.get('/',
  cognitoAuth.authenticate(),
  tokenRefresher.checkAndRefresh(),
  tokenHeaderApplier.apply(),
  authorization.checkPermission('read:usuarios'),
  UserController.getAllUsers
);

router.get('/:userId',
  cognitoAuth.authenticate(),
  tokenRefresher.checkAndRefresh(),
  tokenHeaderApplier.apply(),
  authorization.checkOwnership(getUserForOwnershipCheck),
  UserController.getUserById
);

router.put('/:userId',
  cognitoAuth.authenticate(),
  tokenRefresher.checkAndRefresh(),
  tokenHeaderApplier.apply(),
  authorization.checkOwnership(getUserForOwnershipCheck),
  UserController.updateUser
);

router.delete('/:userId',
  cognitoAuth.authenticate(),
  tokenRefresher.checkAndRefresh(),
  tokenHeaderApplier.apply(),
  authorization.checkPermission('delete:usuarios'),
  UserController.deleteUser
);
module.exports = router;