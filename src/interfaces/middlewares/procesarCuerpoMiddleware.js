/**
 * Middleware para procesar el cuerpo de las solicitudes
 * Responsabilidad única: convertir buffers y otros formatos a JSON
 */

/**
 * Procesa el cuerpo de la solicitud y lo convierte a JSON si es necesario
 * Omite el procesamiento para solicitudes DELETE
 */
function procesarCuerpo(req, res, next) {
  // Omitir para solicitudes DELETE que no necesitan un cuerpo
  if (req.method === 'DELETE') {
    return next();
  }
  
  // Solo procesar si existe un cuerpo y es un buffer
  if (req.body && (Buffer.isBuffer(req.body) || (req.body.type === 'Buffer' && Array.isArray(req.body.data)))) {
    try {
      // Verificar que el buffer no esté vacío
      const bodyString = Buffer.isBuffer(req.body) 
        ? req.body.toString('utf8') 
        : Buffer.from(req.body.data).toString('utf8');
      
      if (!bodyString || bodyString.trim() === '') {
        return next(); // No procesar buffers vacíos
      }
      
      console.log("Body convertido de Buffer a string:", bodyString);
      req.body = JSON.parse(bodyString);
      console.log("Body parseado a JSON:", JSON.stringify(req.body));
    } catch (parseError) {
      console.error("Error al parsear el buffer a JSON:", parseError);
      return res.status(400).json({
        error: 'Error en formato JSON',
        mensaje: 'No se pudo procesar el cuerpo de la solicitud como JSON válido',
        detalles: parseError.message,
        code: 'INVALID_JSON'
      });
    }
  }
  next();
}

module.exports = procesarCuerpo; 