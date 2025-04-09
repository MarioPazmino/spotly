//src/function/Canchas/deleteCanchas.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.deleteCanchas = async (event) => {
  try {
    // 1. Obtener ID de los parámetros de la ruta
    const canchaId = event.pathParameters?.id;
    
    // 2. Validar ID
    if (!canchaId) {
      return { 
        statusCode: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'ID de cancha no proporcionado' }) 
      };
    }

    // 3. Verificar que la tabla esté configurada
    if (!process.env.CANCHAS_TABLE) {
      return { 
        statusCode: 500, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: 'Tabla de canchas no configurada' }) 
      };
    }

    // 4. Ejecutar comando de eliminación
    await docClient.send(new DeleteCommand({
      TableName: process.env.CANCHAS_TABLE,
      Key: { id: canchaId }
    }));

    // 5. Respuesta exitosa (cambiado a 200 para permitir mensaje)
    return {
      statusCode: 200, // ✅ Código de éxito con cuerpo
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ 
        message: 'Cancha eliminada exitosamente',
        deletedId: canchaId // 🆕 Incluye el ID eliminado
      }),
    };

  } catch (error) {
    // 6. Manejo de errores
    console.error('❌ Error al eliminar cancha:', error);
    return { 
      statusCode: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ 
        message: 'Error interno del servidor',
        error: error.message 
      }) 
    };
  }
};