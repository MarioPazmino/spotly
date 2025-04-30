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
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw Boom.conflict('Ya existe un usuario con este email');
    }
    const usuario = new Usuario({
      userId: userData.userId || UserService.generateId(),
      email: userData.email,
      cognitoId: userData.cognitoId,
      role: userData.role || 'cliente',
      name: userData.name,
      picture: userData.picture,
      registrationSource: userData.registrationSource || 'cognito'
    });
    return await this.userRepository.save(usuario);
  }

  async getUsersByRole(role, options = {}) {
    return await this.userRepository.findByRole(role, options);
  }
  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw Boom.notFound('Usuario no encontrado');
    }
    return user;
  }
  async getUserByEmail(email) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw Boom.notFound('Usuario no encontrado');
    }
    return user;
  }

  async getUserByCognitoId(cognitoId) {
    const user = await this.userRepository.findByCognitoId(cognitoId);
    if (!user) {
      throw Boom.notFound('Usuario no encontrado');
    }
    return user;
  }
  async updateUser(userId, updateData) {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw Boom.notFound('Usuario no encontrado');
    }
    if (updateData.email && updateData.email !== existingUser.email) {
      const userWithEmail = await this.userRepository.findByEmail(updateData.email);
      if (userWithEmail && userWithEmail.userId !== userId) {
        throw Boom.conflict('Ya existe un usuario con este email');
      }
    }
    const protectedFields = ['userId', 'cognitoId', 'createdAt', 'registrationSource'];
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => !protectedFields.includes(key))
    );
    return await this.userRepository.update(userId, filteredUpdateData);
  }
  async updateLastLogin(userId) {
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw Boom.notFound('Usuario no encontrado');
    }
    
    return await this.userRepository.updateLastLogin(userId);
  }
  async deleteUser(userId) {
    const user = await this.userRepository.delete(userId);
    if (!user) {
      throw Boom.notFound('Usuario no encontrado');
    }
    return user;
  }
  async getAllUsers(options = {}) {
    return await this.userRepository.findAll(options);
  }

}

module.exports = UserService;