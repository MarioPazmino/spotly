// scripts/createSuperAdmin.js
const AWS = require('aws-sdk');

// Configurar la región de AWS
AWS.config.update({ region: 'us-east-1' });

const { v4: uuidv4 } = require('uuid');
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Configuración - estas variables deben ser proporcionadas como variables de entorno
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const USUARIOS_TABLE = process.env.USUARIOS_TABLE;
const SUPER_ADMIN_GROUP_NAME = process.env.SUPER_ADMIN_GROUP_NAME || 'super_admin';

/**
 * Crea un usuario super_admin en Cognito y lo registra en DynamoDB
 */
async function createSuperAdmin(email, name, temporaryPassword) {
  try {
    console.log(`Iniciando creación de super_admin: ${email}`);
    
    // 1. Crear usuario en Cognito
    const userId = await createUserInCognito(email, name, temporaryPassword);
    console.log(`Usuario creado en Cognito con ID: ${userId}`);
    
    // 2. Añadir usuario al grupo super_admin
    await addUserToGroup(email, SUPER_ADMIN_GROUP_NAME);
    console.log(`Usuario añadido al grupo ${SUPER_ADMIN_GROUP_NAME}`);
    
    // 3. Registrar usuario en DynamoDB
    const user = await registerUserInDynamoDB(userId, email, name);
    console.log(`Usuario registrado en DynamoDB: ${userId}`);
    
    return {
      success: true,
      message: 'Usuario super_admin creado correctamente',
      user
    };
  } catch (error) {
    console.error('Error al crear super_admin:', error);
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
}

/**
 * Crea un usuario en Cognito
 */
async function createUserInCognito(email, name, temporaryPassword) {
  try {
    // Verificar si el usuario ya existe
    try {
      const userExists = await cognito.adminGetUser({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: email
      }).promise();
      
      console.log(`El usuario ${email} ya existe en Cognito`);
      return userExists.Username;
    } catch (err) {
      // Si el error es UserNotFoundException, continuamos con la creación
      if (err.code !== 'UserNotFoundException') {
        throw err;
      }
    }
    
    // Crear usuario en Cognito
    const params = {
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: email,
      TemporaryPassword: temporaryPassword,
      MessageAction: 'SUPPRESS', // No enviar email
      UserAttributes: [
        {
          Name: 'email',
          Value: email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        },
        {
          Name: 'name',
          Value: name || email.split('@')[0]
        },
        {
          Name: 'custom:role',
          Value: 'super_admin'
        },
        {
          Name: 'custom:pendiente_aprobacion',
          Value: 'false'
        },
        {
          Name: 'custom:registration_source',
          Value: 'console'
        }
      ]
    };
    
    const result = await cognito.adminCreateUser(params).promise();
    return result.User.Username;
  } catch (error) {
    console.error('Error al crear usuario en Cognito:', error);
    throw error;
  }
}

/**
 * Añade un usuario a un grupo en Cognito
 */
async function addUserToGroup(username, groupName) {
  try {
    // Verificar si el usuario ya está en el grupo
    const listGroupsParams = {
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: username
    };
    
    const userGroups = await cognito.adminListGroupsForUser(listGroupsParams).promise();
    const isInGroup = userGroups.Groups.some(group => group.GroupName === groupName);
    
    if (isInGroup) {
      console.log(`El usuario ya pertenece al grupo ${groupName}`);
      return true;
    }
    
    // Añadir al grupo
    const addToGroupParams = {
      GroupName: groupName,
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: username
    };
    
    await cognito.adminAddUserToGroup(addToGroupParams).promise();
    console.log(`Usuario añadido al grupo ${groupName}: ${username}`);
    return true;
  } catch (error) {
    console.error(`Error al añadir usuario al grupo ${groupName}:`, error);
    throw error;
  }
}

/**
 * Registra un usuario en DynamoDB
 */
async function registerUserInDynamoDB(userId, email, name) {
  try {
    // Verificar si el usuario ya existe en DynamoDB
    const existingUser = await getUserById(userId);
    
    if (existingUser) {
      console.log(`El usuario ya existe en DynamoDB: ${userId}`);
      return existingUser;
    }
    
    // Crear objeto de usuario para guardar en DynamoDB
    const user = {
      userId,
      email,
      name: name || email.split('@')[0],
      role: 'super_admin',
      pendienteAprobacion: 'false',
      registrationSource: 'console',
      picture: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Guardar usuario en DynamoDB
    await saveUser(user);
    console.log(`Usuario guardado en DynamoDB: ${userId}`);
    
    return user;
  } catch (error) {
    console.error('Error al registrar usuario en DynamoDB:', error);
    throw error;
  }
}

/**
 * Obtiene un usuario por ID desde DynamoDB
 */
async function getUserById(userId) {
  try {
    const params = {
      TableName: USUARIOS_TABLE,
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

/**
 * Guarda un usuario en DynamoDB
 */
async function saveUser(user) {
  try {
    const params = {
      TableName: USUARIOS_TABLE,
      Item: user
    };

    await dynamoDB.put(params).promise();
    return user;
  } catch (error) {
    console.error('Error guardando usuario:', error);
    throw error;
  }
}

/**
 * Función principal para ejecutar desde línea de comandos
 */
async function main() {
  if (process.argv.length < 4) {
    console.error('Uso: node createSuperAdmin.js <email> <contraseña_temporal> [nombre]');
    console.error('Ejemplo: node createSuperAdmin.js admin@ejemplo.com Temporal123! "Admin Principal"');
    process.exit(1);
  }
  
  const email = process.argv[2];
  const temporaryPassword = process.argv[3];
  const name = process.argv.length > 4 ? process.argv[4] : email.split('@')[0];
  
  console.log(`Creando super_admin: ${email}`);
  
  // Verificar variables de entorno
  if (!COGNITO_USER_POOL_ID) {
    console.error('Error: La variable de entorno COGNITO_USER_POOL_ID es requerida');
    process.exit(1);
  }
  
  if (!USUARIOS_TABLE) {
    console.error('Error: La variable de entorno USUARIOS_TABLE es requerida');
    process.exit(1);
  }
  
  const result = await createSuperAdmin(email, name, temporaryPassword);
  console.log('Resultado:', JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('✅ Operación completada con éxito');
    console.log(`
INSTRUCCIONES PARA EL USUARIO:
1. El usuario ${email} ha sido creado como super_admin
2. La contraseña temporal es: ${temporaryPassword}
3. En el primer inicio de sesión, se solicitará cambiar la contraseña
`);
  } else {
    console.error('❌ Error en la operación');
    process.exit(1);
  }
}

// Ejecutar si se llama directamente desde línea de comandos
if (require.main === module) {
  main();
} else {
  // Exportar para uso como módulo
  module.exports = {
    createSuperAdmin,
    registerUserInDynamoDB
  };
}
