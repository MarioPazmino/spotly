// src/cognito/postConfirmation.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  console.log('PostConfirmation triggered', JSON.stringify(event, null, 2));
  
  try {
    const { triggerSource, request, response } = event;
    
    // Valores de entorno
    const USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
    const SUPER_ADMIN_GROUP_NAME = process.env.SUPER_ADMIN_GROUP_NAME;
    const ADMIN_CENTRO_GROUP_NAME = process.env.ADMIN_CENTRO_GROUP_NAME;
    const CLIENTE_GROUP_NAME = process.env.CLIENTE_GROUP_NAME;
    
    // Atributos del usuario (sin prefijo 'custom:')
    const { userAttributes } = request;
    const userId = event.userName;
    const email = userAttributes.email;
    const name = userAttributes.name || email.split('@')[0];
    const role = userAttributes.role || 'cliente'; // Sin 'custom:role'
    const pendienteAprobacion = userAttributes.pendiente_aprobacion || 'true'; // Sin 'custom:pendiente_aprobacion'
    const registrationSource = userAttributes.registration_source || 'unknown'; // Sin 'custom:registration_source'
    const picture = userAttributes.picture || '';
    
    // Verificar si el usuario ya existe en DynamoDB
    const existingUser = await dynamoDB.get({
      TableName: USUARIOS_TABLE,
      Key: { userId }
    }).promise();
    
    if (existingUser.Item) {
      console.log(`Usuario ${userId} ya existe en DynamoDB, saltando creación`);
    } else {
      // Crear registro en la tabla de usuarios con campos alineados a la entidad
      const usuarioItem = {
        userId,
        email,
        name,
        role,
        pendienteAprobacion,
        registrationSource,
        picture,
        createdAt: new Date().toISOString(), // Campo correcto
        updatedAt: new Date().toISOString() // Campo correcto
      };
      
      await dynamoDB.put({
        TableName: USUARIOS_TABLE,
        Item: usuarioItem
      }).promise();
      
      console.log(`Usuario ${userId} creado en DynamoDB con rol ${role}`);
    }
    
    // Determinar grupo de Cognito según el rol
    let groupName = null;
    
    if (role === 'cliente') {
      groupName = CLIENTE_GROUP_NAME;
    } else if (role === 'admin_centro' && pendienteAprobacion === 'false') {
      groupName = ADMIN_CENTRO_GROUP_NAME;
    } else if (role === 'super_admin') {
      groupName = SUPER_ADMIN_GROUP_NAME;
    }
    
    // Asignar grupo si corresponde
    if (groupName) {
      try {
        const groups = await cognito.adminListGroupsForUser({
          UserPoolId: COGNITO_USER_POOL_ID,
          Username: userId
        }).promise();
        
        const alreadyInGroup = groups.Groups.some(g => g.GroupName === groupName);
        
        if (!alreadyInGroup) {
          await cognito.adminAddUserToGroup({
            UserPoolId: COGNITO_USER_POOL_ID,
            Username: userId,
            GroupName: groupName
          }).promise();
          
          console.log(`Usuario ${userId} añadido al grupo ${groupName}`);
        } else {
          console.log(`Usuario ${userId} ya pertenece al grupo ${groupName}`);
        }
      } catch (error) {
        console.error(`Error verificando grupos de usuario ${userId}:`, error);
        // Intento de recuperación
        try {
          await cognito.adminAddUserToGroup({
            UserPoolId: COGNITO_USER_POOL_ID,
            Username: userId,
            GroupName: groupName
          }).promise();
          
          console.log(`Usuario ${userId} añadido al grupo ${groupName} (recuperación)`);
        } catch (groupError) {
          console.error(`Error añadiendo usuario ${userId} al grupo ${groupName}:`, groupError);
        }
      }
    } else if (role === 'admin_centro') {
      console.log(`Usuario ${userId} registrado como admin_centro, pendiente de aprobación`);
    }
    
    console.log('PostConfirmation completed', JSON.stringify(event, null, 2));
    return event;
  } catch (error) {
    console.error('Error en PostConfirmation:', error);
    return event; // Continuar flujo incluso si hay errores
  }
};