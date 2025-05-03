// src/interfaces/http/controllers/v1/ImagenUsuarioController.js
const Boom = require('@hapi/boom');
const UserService = require('../../../../infrastructure/services/userService');
const { uploadImage, getPresignedUrl } = require('../../../../infrastructure/services/s3Service');
const { sanitizeString } = require('../../../../utils/sanitizeInput');

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
      const key = await uploadImage(req.file.buffer, req.file.originalname, userId);
      // Generar presigned URL para mostrar la imagen
      url = getPresignedUrl(key, 3600); // 1 hora por defecto
    }

    // 2. Procesar URL enviada en el body
    if (req.body.url && typeof req.body.url === 'string' && /\.(jpg|jpeg|png)$/i.test(req.body.url)) {
      // Sanitizar la URL antes de usarla
      url = sanitizeString(req.body.url);
    }

    if (!url) {
      throw Boom.badRequest('Debes subir una imagen válida o proporcionar una URL de imagen (.jpg, .jpeg, .png)');
    }

    // 3. Actualizar usuario
    const updated = await UserService.updateUserProfile(userId, { picture: url }, userId);
    return res.status(200).json({ picture: url });
  } catch (error) {
    next(error);
  }
};
