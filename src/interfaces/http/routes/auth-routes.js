// src/interfaces/http/routes/auth-routes.js
import { Router } from 'express';
import Joi from 'joi';
import Boom from '@hapi/boom';
import AWS from 'aws-sdk';
import UsuarioRepository from '../../../infrastructure/repositories/usuario-repository';
import roleMiddleware from '../middlewares/role-middleware';
import authMiddleware from '../middlewares/auth-middleware';

const router = Router();
const usuarioRepository = new UsuarioRepository();

// Configuración de Cognito
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Esquemas de validación
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  nombre: Joi.string().required(),
  apellido: Joi.string().required(),
  telefono: Joi.string().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const registerAdminSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  nombre: Joi.string().required(),
  apellido: Joi.string().required(),
  telefono: Joi.string().required(),
  centroDeportivoId: Joi.string().required()
});

// Registro de usuario cliente
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw Boom.badRequest(error.message);
    }

    const { email, password, nombre, apellido, telefono } = value;

    // Registrar en Cognito
    const params = {
      ClientId: process.env.COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'custom:nombre', Value: nombre },
        { Name: 'custom:apellido', Value: apellido },
        { Name: 'custom:telefono', Value: telefono },
        { Name: 'custom:tipo', Value: 'cliente' }
      ]
    };

    const cognitoResponse = await cognito.signUp(params).promise();

    // Guardar usuario en DynamoDB
    const usuario = await usuarioRepository.create({
      email,
      nombre,
      apellido,
      telefono,
      tipo: 'cliente',
      cognitoSub: cognitoResponse.UserSub
    });

    res.status(201).json({
      message: 'Usuario registrado correctamente. Por favor, verifica tu correo electrónico.',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre
      }
    });
  } catch (error) {
    if (error.code === 'UsernameExistsException') {
      next(Boom.conflict('El email ya está registrado'));
    } else {
      next(error);
    }
  }
});

// Login de usuario
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw Boom.badRequest(error.message);
    }

    const { email, password } = value;

    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    };

    const response = await cognito.initiateAuth(params).promise();

    res.json({
      message: 'Inicio de sesión exitoso',
      tokens: {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn
      }
    });
  } catch (error) {
    if (error.code === 'NotAuthorizedException') {
      next(Boom.unauthorized('Credenciales incorrectas'));
    } else if (error.code === 'UserNotConfirmedException') {
      next(Boom.forbidden('Usuario no confirmado. Por favor verifica tu correo electrónico'));
    } else {
      next(error);
    }
  }
});

// Creación de administrador de centro deportivo (sólo para super_admin)
router.post('/register-admin', authMiddleware, roleMiddleware(['super_admin']), async (req, res, next) => {
  try {
    const { error, value } = registerAdminSchema.validate(req.body);
    if (error) {
      throw Boom.badRequest(error.message);
    }

    const { email, password, nombre, apellido, telefono, centroDeportivoId } = value;

    // Verificar que el centro deportivo existe
    // Aquí debería ir una verificación con el repositorio de centrosDeportivos

    // Registrar en Cognito
    const params = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'custom:nombre', Value: nombre },
        { Name: 'custom:apellido', Value: apellido },
        { Name: 'custom:telefono', Value: telefono },
        { Name: 'custom:tipo', Value: 'admin_centro' },
        { Name: 'custom:centroDeportivoId', Value: centroDeportivoId }
      ]
    };

    const cognitoResponse = await cognito.adminCreateUser(params).promise();

    // Agregar al grupo de admin_centro
    await cognito.adminAddUserToGroup({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: email,
      GroupName: 'admin_centro'
    }).promise();

    // Guardar usuario en DynamoDB
    const usuario = await usuarioRepository.create({
      email,
      nombre,
      apellido,
      telefono,
      tipo: 'admin_centro',
      centroDeportivoId,
      cognitoSub: cognitoResponse.User.Username
    });

    res.status(201).json({
      message: 'Administrador registrado correctamente.',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        centroDeportivoId: usuario.centroDeportivoId
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
