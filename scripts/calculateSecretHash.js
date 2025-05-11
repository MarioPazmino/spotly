// scripts/calculateSecretHash.js
const crypto = require('crypto');

// Configuración
const username = process.argv[2];
const clientId = process.argv[3];
const clientSecret = process.argv[4];

/**
 * Calcula el SECRET_HASH para autenticación en Cognito
 * 
 * @param {string} username - Nombre de usuario (email)
 * @param {string} clientId - ID del cliente de Cognito
 * @param {string} clientSecret - Secreto del cliente de Cognito
 * @returns {string} - Hash codificado en base64
 */
function calculateSecretHash(username, clientId, clientSecret) {
  if (!username || !clientId || !clientSecret) {
    throw new Error('Se requieren username, clientId y clientSecret');
  }
  
  // El mensaje es la concatenación del username y el clientId
  const message = username + clientId;
  
  // Crear un HMAC SHA-256 usando el clientSecret como clave
  const hmac = crypto.createHmac('sha256', clientSecret);
  
  // Actualizar el HMAC con el mensaje y obtener el resultado en base64
  const hash = hmac.update(message).digest('base64');
  
  return hash;
}

/**
 * Función principal para ejecutar desde línea de comandos
 */
function main() {
  if (process.argv.length < 5) {
    console.error('Uso: node calculateSecretHash.js <username> <clientId> <clientSecret>');
    console.error('Ejemplo: node calculateSecretHash.js usuario@example.com abcdef123456 tu-secreto-aqui');
    process.exit(1);
  }
  
  try {
    const hash = calculateSecretHash(username, clientId, clientSecret);
    
    console.log('\nSECRET_HASH calculado con éxito:');
    console.log('-------------------------------');
    console.log(hash);
    console.log('-------------------------------');
    
    console.log('\nPara usar en tu solicitud de autenticación:');
    console.log(`
{
  "AuthParameters": {
    "USERNAME": "${username}",
    "PASSWORD": "TuContraseña",
    "SECRET_HASH": "${hash}"
  },
  "AuthFlow": "USER_PASSWORD_AUTH",
  "ClientId": "${clientId}"
}
`);
    
    console.log('✅ Operación completada con éxito');
  } catch (error) {
    console.error('❌ Error al calcular el SECRET_HASH:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente desde línea de comandos
if (require.main === module) {
  main();
} else {
  // Exportar para uso como módulo
  module.exports = {
    calculateSecretHash
  };
}
