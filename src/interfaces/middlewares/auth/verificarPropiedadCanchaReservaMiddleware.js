const canchasRepository = require('../../../infrastructure/repositories/canchasRepository');
const centroDeportivoRepository = require('../../../infrastructure/repositories/centroDeportivoRepository');

/**
 * Middleware para verificar que el usuario tenga permisos sobre la cancha
 * para operaciones de creación y actualización de horarios
 */
function verificarPropiedadCancha(req, res, next) {
  try {
    const userId = req.user.sub || req.user.userId;
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    const canchaId = req.body.canchaId;

    // Verificar si el usuario es superadmin o admin_centro (tienen acceso a todas las canchas)
    if (userGroups.includes('super_admin') || userGroups.includes('admin_centro')) {
      // Para estos roles, verificamos solo que la cancha exista si se proporciona un ID
      if (canchaId) {
        // Usar la instancia ya creada del repositorio (patrón Singleton)
        // Ya tenemos la instancia importada al inicio del archivo
        
        canchasRepository.findById(canchaId)
          .then(cancha => {
            if (!cancha) {
              return res.status(404).json({
                statusCode: 404,
                error: 'Not Found',
                message: `No se encontró la cancha con ID ${canchaId}`
              });
            }
            // Si la cancha existe, permitir la operación
            next();
          })
          .catch(error => {
            console.error('Error al verificar cancha:', error);
            return res.status(500).json({
              statusCode: 500,
              error: 'Internal Server Error',
              message: 'Error al verificar existencia de la cancha'
            });
          });
        return;
      }
      
      // Si no se proporciona canchaId, debemos buscar las canchas asociadas al usuario
      // Usar la instancia ya creada del repositorio (patrón Singleton)
      const canchasRepository = CanchasRepository;
      
      // Para los administradores, primero buscamos sus centros deportivos
      centroDeportivoRepository.findByAdminId(userId)
        .then(async centros => {
          if (!centros || centros.length === 0) {
            return res.status(403).json({
              statusCode: 403,
              error: 'Forbidden',
              message: 'No tienes ningún centro deportivo asociado. No puedes crear horarios.'
            });
          }
          
          // Obtener todas las canchas de los centros del usuario
          let todasLasCanchasDelUsuario = [];
          for (const centro of centros) {
            try {
              const canchasDelCentro = await canchasRepository.findAllByCentro(centro.centroId);
              if (canchasDelCentro && canchasDelCentro.items && canchasDelCentro.items.length > 0) {
                todasLasCanchasDelUsuario = [...todasLasCanchasDelUsuario, ...canchasDelCentro.items];
              }
            } catch (error) {
              console.error(`Error al obtener canchas del centro ${centro.centroId}:`, error);
            }
          }
          
          if (todasLasCanchasDelUsuario.length === 0) {
            return res.status(403).json({
              statusCode: 403,
              error: 'Forbidden',
              message: 'No tienes ninguna cancha asociada a tus centros deportivos.'
            });
          }
          
          // Si el usuario tiene una sola cancha, usarla automáticamente
          if (todasLasCanchasDelUsuario.length === 1) {
            req.body.canchaId = todasLasCanchasDelUsuario[0].canchaId;
            next();
          } else {
            // Si tiene múltiples canchas, pedirle que especifique cuál
            return res.status(400).json({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Tienes múltiples canchas. Por favor, especifica el ID de la cancha',
              canchasDisponibles: todasLasCanchasDelUsuario.map(c => ({ 
                canchaId: c.canchaId, 
                nombre: c.nombre || c.tipo,
                tipo: c.tipo
              }))
            });
          }
        })
        .catch(error => {
          console.error('Error al verificar centros deportivos:', error);
          return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Error al verificar permisos'
          });
        });
      return;
    }

    // Para usuarios normales, primero obtenemos todas sus canchas
    // Usar la instancia ya creada del repositorio (patrón Singleton)
    
    centroDeportivoRepository.findByAdminId(userId)
      .then(async centros => {
        if (!centros || centros.length === 0) {
          return res.status(403).json({
            statusCode: 403,
            error: 'Forbidden',
            message: 'No tienes ningún centro deportivo asociado. No puedes crear horarios.'
          });
        }
        
        // Obtener todas las canchas de los centros del usuario
        let todasLasCanchasDelUsuario = [];
        for (const centro of centros) {
          try {
            const canchasDelCentro = await canchasRepository.findAllByCentro(centro.centroId);
            if (canchasDelCentro && canchasDelCentro.items && canchasDelCentro.items.length > 0) {
              todasLasCanchasDelUsuario = [...todasLasCanchasDelUsuario, ...canchasDelCentro.items];
            }
          } catch (error) {
            console.error(`Error al obtener canchas del centro ${centro.centroId}:`, error);
          }
        }
        
        if (todasLasCanchasDelUsuario.length === 0) {
          return res.status(403).json({
            statusCode: 403,
            error: 'Forbidden',
            message: 'No tienes ninguna cancha asociada a tus centros deportivos.'
          });
        }
        
        // Si se proporcionó un canchaId, verificar que exista y pertenezca al usuario
        if (canchaId) {
          const canchaEncontrada = todasLasCanchasDelUsuario.find(c => c.canchaId === canchaId);
          
          if (!canchaEncontrada) {
            return res.status(403).json({
              statusCode: 403,
              error: 'Forbidden',
              message: `La cancha con ID ${canchaId} no existe o no te pertenece.`
            });
          }
          
          // Si la cancha existe y pertenece al usuario, permitir la operación
          next();
        } 
        // Si no se proporcionó canchaId pero el usuario tiene una sola cancha, permitir la operación
        else if (todasLasCanchasDelUsuario.length === 1) {
          req.body.canchaId = todasLasCanchasDelUsuario[0].canchaId;
          next();
        }
        // Si el usuario tiene múltiples canchas y no especificó cuál, el controlador se encargará
        else {
          return res.status(400).json({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Tienes múltiples canchas. Por favor, especifica el ID de la cancha',
            canchasDisponibles: todasLasCanchasDelUsuario.map(c => ({ 
              canchaId: c.canchaId, 
              nombre: c.nombre || c.tipo,
              tipo: c.tipo
            }))
          });
        }
      })
      .catch(error => {
        console.error('Error al verificar centros deportivos:', error);
        return res.status(500).json({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al verificar permisos'
        });
      });
  } catch (error) {
    console.error('Error en middleware de verificación:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Error al procesar la solicitud'
    });
  }
}

module.exports = { verificarPropiedadCancha }; 