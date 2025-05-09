// src/infrastructure/services/user/userProfileService.js
const Boom = require('@hapi/boom');
const logger = require('../../../utils/logger');
const userAuthorizationService = require('./userAuthorizationService');
const userImageService = require('./userImageService');

/**
 * Servicio para manejar operaciones relacionadas con perfiles de usuario
 */
class UserProfileService {
  constructor(userRepository) {
    this.userRepository = userRepository;
    this.MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  }

  /**
   * Obtiene un perfil de usuario por ID
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Perfil de usuario
   * @throws {Error} Si el usuario no existe
   */
  async getUserProfile(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw Boom.notFound('Usuario no encontrado');
      }
      
      // Manejar imagenPerfil: S3, externa o null
      if (user.imagenPerfil && typeof user.imagenPerfil === 'string') {
        if (user.imagenPerfil.startsWith('usuarios/')) {
          user.imagenPerfil = userImageService.getProfileImageUrl(user.imagenPerfil);
        } else if (user.imagenPerfil.startsWith('http')) {
          // Es una URL externa (Facebook, Google, etc.), se deja tal cual
        } else {
          user.imagenPerfil = null;
        }
      } else {
        user.imagenPerfil = null;
      }
      
      return user;
    } catch (error) {
      logger.error(`Error obteniendo usuario: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  /**
   * Actualiza el perfil de un usuario
   * @param {string} userId - ID del usuario a actualizar
   * @param {Object} updateData - Datos a actualizar
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @returns {Promise<Object>} Usuario actualizado
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async updateUserProfile(userId, updateData, requesterId) {
    try {
      // Verificar permisos
      await userAuthorizationService.canModifyUser(userId, requesterId, this.userRepository);
      
      // Verificar campos sensibles
      userAuthorizationService.canModifySensitiveFields(updateData, userId, requesterId);
      
      // Validar tamaño de imagen si se proporciona como buffer
      if (updateData.imagenPerfil && updateData.imagenPerfil.size > this.MAX_SIZE_BYTES) {
        throw Boom.badRequest('La imagen supera el tamaño máximo permitido de 5MB');
      }
      
      // Actualizar el usuario
      return await this.userRepository.update(userId, {
        ...updateData,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error actualizando usuario: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  /**
   * Actualiza la imagen de perfil de un usuario
   * @param {string} userId - ID del usuario
   * @param {Buffer} imageBuffer - Buffer de la imagen
   * @param {string} originalName - Nombre original del archivo
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @returns {Promise<Object>} Usuario actualizado con nueva URL de imagen
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async updateProfileImage(userId, imageBuffer, originalName, requesterId) {
    try {
      // Verificar permisos
      await userAuthorizationService.canModifyUser(userId, requesterId, this.userRepository);
      
      // Buscar la imagen anterior del usuario para eliminarla después
      let imagenAnteriorKey = null;
      try {
        const usuario = await this.userRepository.findById(userId);
        if (usuario && usuario.imagenPerfil) {
          imagenAnteriorKey = userImageService.extractKeyFromProfileImageUrl(usuario.imagenPerfil);
          logger.info(`Imagen anterior encontrada para usuario ${userId}: ${imagenAnteriorKey}`);
        }
      } catch (findError) {
        logger.warn(`No se pudo obtener la imagen anterior del usuario ${userId}:`, findError.message);
        // Continuamos con el proceso aunque no podamos obtener la imagen anterior
      }
      
      // Subir nueva imagen
      const key = await userImageService.uploadUserProfileImage(imageBuffer, originalName, userId);
      
      // Generar URL presignada
      const imageUrl = userImageService.getProfileImageUrl(key);
      
      // Actualizar perfil de usuario
      const updatedUser = await this.userRepository.update(userId, {
        imagenPerfil: key,
        updatedAt: new Date().toISOString()
      });
      
      // Eliminar imagen anterior si existe
      if (imagenAnteriorKey) {
        try {
          await userImageService.deleteProfileImage(imagenAnteriorKey);
          logger.info(`Imagen anterior eliminada para usuario ${userId}: ${imagenAnteriorKey}`);
        } catch (deleteError) {
          logger.warn(`No se pudo eliminar la imagen anterior del usuario ${userId}:`, deleteError.message);
          // No interrumpimos el flujo si falla la eliminación de la imagen anterior
        }
      }
      
      // Devolver usuario con URL presignada para mostrar
      return {
        ...updatedUser,
        imagenPerfil: imageUrl
      };
    } catch (error) {
      logger.error(`Error actualizando imagen de perfil: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }

  /**
   * Actualiza las canchas favoritas de un usuario
   * @param {string} userId - ID del usuario
   * @param {Array} canchasFavoritas - Array de IDs de canchas favoritas
   * @param {string} requesterId - ID del usuario que realiza la solicitud
   * @returns {Promise<Object>} Usuario actualizado
   * @throws {Error} Si no tiene permisos o hay errores
   */
  async updateFavoriteCourts(userId, canchasFavoritas, requesterId) {
    try {
      // Verificar permisos
      await userAuthorizationService.canModifyUser(userId, requesterId, this.userRepository);
      
      // Actualizar canchas favoritas
      return await this.userRepository.update(userId, {
        canchasFavoritas,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      logger.error(`Error actualizando canchas favoritas: ${error.message}`, { error });
      throw Boom.boomify(error);
    }
  }
}

module.exports = UserProfileService;
