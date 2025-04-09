// src/functions/Users/addUser.js
const AWS = require('aws-sdk');
const Usuario = require('../../domain/entities/usuario');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USUARIOS_TABLE = process.env.USUARIOS_TABLE;

// Generador alternativo de ID único si no quieres usar 'uuid'
const generarId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

// Lambda handler real
const addUserLambda = async (event) => {
  try {
    const body = JSON.parse(event.body);

    // Validar campos requeridos
    if (!body.email || !body.passwordHash || !body.role) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Faltan campos requeridos: email, passwordHash y role son obligatorios',
        }),
      };
    }

    // Validar rol de usuario
    const rolesValidos = ['super_admin', 'admin_centro', 'cliente'];
    if (!rolesValidos.includes(body.role)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Rol no válido. Debe ser: super_admin, admin_centro o cliente',
        }),
      };
    }

    // Verificar si el email ya existe
    const emailCheckParams = {
      TableName: USUARIOS_TABLE,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': body.email,
      },
    };

    const emailExists = await dynamoDb.query(emailCheckParams).promise();
    if (emailExists.Items && emailExists.Items.length > 0) {
      return {
        statusCode: 409,
        body: JSON.stringify({
          message: 'Ya existe un usuario con este email',
        }),
      };
    }

    // Crear objeto Usuario
    const usuario = new Usuario({
      userId: generarId(),
      email: body.email,
      passwordHash: body.passwordHash,
      role: body.role,
    });

    // Guardar en DynamoDB
    const params = {
      TableName: USUARIOS_TABLE,
      Item: usuario,
    };

    await dynamoDb.put(params).promise();

    return {
      statusCode: 201,
      body: JSON.stringify(usuario),
    };
  } catch (error) {
    console.error('Error en Lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error interno al crear el usuario',
        error: error.message,
      }),
    };
  }
};

module.exports = {
  addUserLambda,
};
