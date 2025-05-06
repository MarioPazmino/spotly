// src/cognito/postConfirmation.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event, context) => {
  try {
    console.log('PostConfirmation event:', JSON.stringify(event, null, 2));
    
    // Extraer datos relevantes
    const { userPoolId } = event;
    const { sub: userId, email, name, 'custom:role': role, 'custom:pendiente_aprobacion': pendienteAprobacion, 'custom:registration_source': registrationSource } = event.request.userAttributes;
    
    // Crear objeto de usuario para guardar en DynamoDB
    const user = {
      userId,
      email,
      name: name || email.split('@')[0],
      role: role || 'cliente',
      pendienteAprobacion: pendienteAprobacion || 'true',
      registrationSource: registrationSource || 'unknown',
      picture: event.request.userAttributes.picture || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Verificar si el usuario ya existe
    const existingUser = await getUserById(userId);
    
    // Si no existe, guardar en DynamoDB
    if (!existingUser) {
      await saveUser(user);
      console.log(`Usuario guardado en DynamoDB: ${userId}`);
    }

    // Determinar el grupo al que debe pertenecer
    let groupName = null;

    // Lógica mejorada para asignación de grupos
    if (user.role === 'cliente') {
      // Clientes siempre van al grupo cliente
      groupName = process.env.CLIENTE_GROUP_NAME;
    } else if (user.role === 'super_admin') {
      // Super admin siempre va al grupo super_admin
      groupName = process.env.SUPER_ADMIN_GROUP_NAME;
    } else if (user.role === 'admin_centro') {
      // Admin centro solo va al grupo si está aprobado
      if (user.pendienteAprobacion === 'false') {
        groupName = process.env.ADMIN_CENTRO_GROUP_NAME;
        console.log(`Admin centro aprobado, asignando al grupo: ${userId}`);
      } else {
        console.log(`Admin centro pendiente de aprobación, no se asigna grupo: ${userId}`);
      }
    }

    // Añadir al grupo correspondiente solo si se determinó un grupo
    if (groupName) {
      await addUserToGroup(userId, userPoolId, groupName);
      console.log(`Usuario añadido al grupo ${groupName}: ${userId}`);
    }

    return event;
  } catch (error) {
    console.error('PostConfirmation Error:', error);
    throw error;
  }
};

// Función para obtener un usuario por ID
async function getUserById(userId) {
  try {
    const params = {
      TableName: process.env.USUARIOS_TABLE,
      Key: {
        userId
      }
    };

    const result = await dynamoDB.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return null;
  }
}

// Función para guardar un usuario en DynamoDB
async function saveUser(user) {
  try {
    const params = {
      TableName: process.env.USUARIOS_TABLE,
      Item: user
    };

    await dynamoDB.put(params).promise();
    return user;
  } catch (error) {
    console.error('Error guardando usuario:', error);
    throw error;
  }
}

// Función para añadir un usuario a un grupo
async function addUserToGroup(username, userPoolId, groupName) {
  try {
    const params = {
      GroupName: groupName,
      UserPoolId: userPoolId,
      Username: username
    };

    await cognito.adminAddUserToGroup(params).promise();
    return true;
  } catch (error) {
    console.error('Error añadiendo usuario al grupo:', error);
    throw error;
  }
}
