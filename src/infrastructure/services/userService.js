//src/infrastructure/services/userService.js

const Boom = require('@hapi/boom');
const Usuario = require('../../domain/entities/usuario');
const crypto = require('crypto');

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  static generateId() {
    return 'user_' + crypto.randomBytes(4).toString('hex');
  }

  async createUser(userData) {
    // Verificar si el email ya existe
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw Boom.conflict('Ya existe un usuario con este email');
    }

    // Crear objeto Usuario
    const usuario = new Usuario({
      userId: UserService.generateId(),
      email: userData.email,
      passwordHash: userData.passwordHash,
      role: userData.role
    });

    // Guardar en repositorio
    return await this.userRepository.save(usuario);
  }

  async getAllUsers() {
    return await this.userRepository.findAll();
  }

  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw Boom.notFound('Usuario no encontrado');
    }
    return user;
  }

  async updateUser(userId, updateData) {
    // Verificar si existe el usuario
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw Boom.notFound('Usuario no encontrado');
    }

    // Si se está actualizando el email, verificar que no exista otro con ese email
    if (updateData.email && updateData.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(updateData.email);
      if (userWithEmail && userWithEmail.userId !== userId) {
        throw Boom.conflict('Ya existe un usuario con este email');
      }
    }

    // Actualizar usuario
    return await this.userRepository.update(userId, updateData);
  }

  async deleteUser(userId) {
    const user = await this.userRepository.delete(userId);
    if (!user) {
      throw Boom.notFound('Usuario no encontrado');
    }
    return user;
  }
}

module.exports = UserService;