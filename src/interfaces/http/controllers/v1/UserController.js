// src/interfaces/http/controllers/v1/UserController.js
const Joi = require('joi');
const Boom = require('@hapi/boom');
const UserService = require('../../../../infrastructure/services/userService');

// Validaciones
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().required(),
  picture: Joi.string().uri().optional()
});

const updateSchema = Joi.object({
  name: Joi.string().optional(),
  picture: Joi.string().uri().optional()
}).min(1);

exports.createUser = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) throw Boom.badRequest(error.message);

    const clientId = req.headers['x-client-id'] || process.env.COGNITO_MOBILE_CLIENT_ID;

    const user = await UserService.registerUser(value, clientId);
    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await UserService.getUserById(userId);
    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

exports.updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const { error, value } = updateSchema.validate(req.body);
    if (error) throw Boom.badRequest(error.message);

    const requesterId = req.user.sub; // Suponiendo que el middleware de autenticación inyecta esto
    const updated = await UserService.updateUserProfile(userId, value, requesterId);
    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.sub;
    await UserService.deleteUser(userId, requesterId);
    return res.status(200).json({ message: 'Usuario eliminado' });
  } catch (error) {
    next(error);
  }
};

exports.listPendingAdmins = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const lastEvaluatedKey = req.query.nextToken || null;
    const result = await UserService.getPendingAdmins(limit, lastEvaluatedKey);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.approveAdminCenter = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.sub;
    const result = await UserService.approveAdminCenter(userId, requesterId);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};