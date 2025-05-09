// src/interfaces/http/controllers/v1/uploadImagenes/ImagenUsuarioController.js
const Boom = require('@hapi/boom');
const UserProfileService = require('../../../../../infrastructure/services/user/userProfileService');
const UserRepository = require('../../../../../infrastructure/repositories/userRepository');
const { sanitizeImageUrl } = require('../../../../../utils/sanitizeInput');

// Instanciar los servicios
const userRepository = new UserRepository();
const userProfileService = new UserProfileService(userRepository);

/**
 * Subir o actualizar imagen de perfil de usuario (solo 1 imagen)
 * Permite archivo o URL
 */
exports.uploadImagen = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.sub;

    // Procesar archivo subido
    if (req.file) {
      try {
        // Procesar la imagen y actualizar el perfil del usuario
        const updatedUser = await userProfileService.updateProfileImage(
          userId, 
          req.file.buffer, 
          req.file.originalname, 
          requesterId
        );
        
        // Sanitizar URL para seguridad
        const sanitizedUrl = sanitizeImageUrl(updatedUser.imagenPerfil);
        
        // Devolver respuesta exitosa
        return res.status(200).json({
          imagenPerfil: sanitizedUrl,
          message: 'Imagen de perfil actualizada correctamente'
        });
      } catch (uploadError) {
        console.log(`Error al procesar la imagen para usuario ${userId}:`, uploadError.message);
        return res.status(400).json({
          error: 'Error al procesar la imagen',
          message: uploadError.message,
          details: 'Asegúrate de que la imagen sea válida (JPEG, PNG o WEBP) y no exceda los 5MB.'
        });
      }
    } else {
      // No se proporcionó ningún archivo
      return res.status(400).json({
        error: 'No se proporcionó ninguna imagen',
        message: 'Se requiere una imagen para actualizar el perfil',
        details: 'Debes proporcionar un archivo de imagen válido'
      });
    }
  } catch (error) {
    // Manejo de errores específicos
    if (error.isBoom) {
      const statusCode = error.output.statusCode;
      const errorMessage = error.output.payload.message;
      
      return res.status(statusCode).json({
        error: error.output.payload.error,
        message: errorMessage,
        details: error.data || 'Error al procesar la solicitud'
      });
    }
    
    // Error genérico
    console.error(`Error al subir imagen para usuario ${req.params.userId}:`, error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al procesar la imagen',
      details: 'Por favor, intenta nuevamente más tarde'
    });
  }
};
