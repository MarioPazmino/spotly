// src/interfaces/http/controllers/v1/ImagenUsuarioController.js
const Boom = require('@hapi/boom');
const UserService = require('../../../../../infrastructure/services/userService');
const { uploadUserProfileImage, getPresignedUrl } = require('../../../../../infrastructure/services/s3Service');
const { sanitizeImageUrl } = require('../../../../../utils/sanitizeInput');

/**
 * Subir o actualizar imagen de perfil de usuario (solo 1 imagen)
 * Permite archivo o URL
 */
exports.uploadImagen = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let url = null;

    // 1. Procesar archivo subido
    if (req.file) {
      // Subir imagen como privada y obtener key
      const key = await uploadUserProfileImage(req.file.buffer, req.file.originalname, userId);
      // Generar presigned URL para mostrar la imagen
      url = getPresignedUrl(key); // Usar expiración configurable
    }

    // Eliminada la opción de procesar URL externa por seguridad

    if (!url) {
      throw Boom.badRequest('Debes subir una imagen válida.');
    }

    // Sanitizar la URL antes de guardarla
    const sanitizedUrl = sanitizeImageUrl(url);
    if (!sanitizedUrl) {
      throw Boom.badRequest('La URL de la imagen no es válida.');
    }

    // 3. Actualizar usuario con la URL sanitizada
    const updated = await UserService.updateUserProfile(userId, { picture: sanitizedUrl }, userId);
    return res.status(200).json({ picture: sanitizedUrl });
  } catch (error) {
    next(error);
  }
};
