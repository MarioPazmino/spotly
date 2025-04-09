// src/function/Users/addUsers.js
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import Usuario from '../../domain/entities/usuario';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USUARIOS_TABLE = process.env.USUARIOS_TABLE;

export const addUser = async (req, res) => {
  try {
    // Obtener datos del cuerpo de la solicitud
    const body = req.body;
    
    // Validar campos requeridos
    if (!body.email || !body.nombre || !body.apellido || !body.tipo) {
      return res.status(400).json({
        message: 'Faltan campos requeridos: email, nombre, apellido, tipo son obligatorios',
      });
    }
    
    // Validar tipo de usuario
    const tiposValidos = ['super_admin', 'admin_centro', 'cliente'];
    if (!tiposValidos.includes(body.tipo)) {
      return res.status(400).json({
        message: 'Tipo de usuario no válido. Debe ser: super_admin, admin_centro o cliente',
      });
    }
    
    // Validar que centroDeportivoId esté presente para admin_centro
    if (body.tipo === 'admin_centro' && !body.centroDeportivoId) {
      return res.status(400).json({
        message: 'El campo centroDeportivoId es obligatorio para usuarios de tipo admin_centro',
      });
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
      return res.status(409).json({
        message: 'Ya existe un usuario con este email',
      });
    }
    
    // Crear un nuevo usuario con ID generado
    const usuario = new Usuario({
      id: uuidv4(),
      email: body.email,
      nombre: body.nombre,
      apellido: body.apellido,
      telefono: body.telefono || null,
      tipo: body.tipo,
      centroDeportivoId: body.centroDeportivoId || null,
    });
    
    // Parámetros para guardar en DynamoDB
    const params = {
      TableName: USUARIOS_TABLE,
      Item: usuario,
    };
    
    // Guardar el usuario en DynamoDB
    await dynamoDb.put(params).promise();
    
    // Respuesta exitosa
    return res.status(201).json(usuario);
  } catch (error) {
    console.error('Error al crear usuario:', error);
    
    // Respuesta de error
    return res.status(500).json({
      message: 'Error al crear el usuario',
      error: error.message,
    });
  }
};

// Para mantener compatibilidad con Lambda directa si es necesario
export const addUserLambda = async (event) => {
  try {
    const body = JSON.parse(event.body);
    
    // Simulamos el objeto request y response de Express
    const req = { body };
    const res = {
      status: (code) => ({
        json: (data) => ({
          statusCode: code,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
          },
          body: JSON.stringify(data),
        }),
      }),
    };
    
    // Llamamos a la función de Express
    return await addUser(req, res);
  } catch (error) {
    console.error('Error en Lambda:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        message: 'Error interno del servidor',
        error: error.message,
      }),
    };
  }
};