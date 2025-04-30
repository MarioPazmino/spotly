// src/cognito/postAuthentication.js
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
  console.log('PostAuthentication triggered', JSON.stringify(event, null, 2));
  
  try {
    const { triggerSource, request } = event;
    const { userAttributes } = request;
    const userId = event.userName;
    const USUARIOS_TABLE = process.env.USUARIOS_TABLE;
    const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
    const ADMIN_CENTRO_GROUP_NAME = process.env.ADMIN_CENTRO_GROUP_NAME;
    
    // Verificar si el usuario existe en DynamoDB
    const usuarioResult = await dynamoDB.get({
      TableName: USUARIOS_TABLE,
      Key: { userId }
    }).promise();
    
    if (!usuarioResult.Item) {
      // El usuario no existe en DynamoDB, lo creamos
      console.log(`Usuario ${userId} no encontrado en DynamoDB, creando registro...`);
      
      // Extraer información del usuario de Cognito
      const cognitoUser = await cognito.adminGetUser({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: userId
      }).promise();
      
      // Convertir atributos de Cognito a un objeto
      const attrs = {};
      cognitoUser.UserAttributes.forEach(attr => {
        attrs[attr.Name] = attr.Value;
      });
      
      // Crear registro en la tabla de usuarios con campos alineados a la entidad
      const nuevoUsuario = {
        userId,
        email: attrs.email || userAttributes.email,
        name: attrs.name || attrs.email?.split('@')[0] || 'Usuario',
        role: attrs.role || 'cliente', // Sin 'custom:'
        pendienteAprobacion: attrs.pendiente_aprobacion || 'false', // Sin 'custom:'
        registrationSource: attrs.registration_source || 'unknown', // Sin 'custom:'
        picture: attrs.picture || '',
        createdAt: new Date().toISOString(), // Campo correcto
        lastLogin: new Date().toISOString(), // Campo correcto
        updatedAt: new Date().toISOString() // Campo correcto
      };
      
      await dynamoDB.put({
        TableName: USUARIOS_TABLE,
        Item: nuevoUsuario
      }).promise();
      
      console.log(`Usuario ${userId} creado en DynamoDB durante autenticación`);
    } else {
      // El usuario existe, actualizamos último login
      await dynamoDB.update({
        TableName: USUARIOS_TABLE,
        Key: { userId },
        UpdateExpression: 'set lastLogin = :now, updatedAt = :now', // Actualizar ambos campos
        ExpressionAttributeValues: {
          ':now': new Date().toISOString()
        }
      }).promise();
      
      // Verificar si es un admin_centro aprobado pero no está en el grupo
      const usuario = usuarioResult.Item;
      if (usuario.role === 'admin_centro' && usuario.pendienteAprobacion === 'false') {
        // Verificar si ya está en el grupo de admin_centro
        try {
          const groups = await cognito.adminListGroupsForUser({
            UserPoolId: COGNITO_USER_POOL_ID,
            Username: userId
          }).promise();
          
          const isAdminCentro = groups.Groups.some(g => g.GroupName === ADMIN_CENTRO_GROUP_NAME);
          
          if (!isAdminCentro) {
            // Si fue aprobado pero no está en el grupo, lo añadimos
            await cognito.adminAddUserToGroup({
              UserPoolId: COGNITO_USER_POOL_ID,
              Username: userId,
              GroupName: ADMIN_CENTRO_GROUP_NAME
            }).promise();
            
            console.log(`Usuario ${userId} añadido al grupo ${ADMIN_CENTRO_GROUP_NAME} durante autenticación`);
          }
        } catch (error) {
          console.error(`Error verificando grupos para usuario ${userId}:`, error);
        }
      }
    }
    
    console.log('PostAuthentication completed', JSON.stringify(event, null, 2));
    return event;
  } catch (error) {
    console.error('Error en PostAuthentication:', error);
    // No interrumpir el flujo de autenticación si hay un error
    return event;
  }
};