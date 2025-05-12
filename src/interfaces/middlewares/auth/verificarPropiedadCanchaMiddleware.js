const CanchasRepository = require('../../../infrastructure/repositories/canchasRepository');
const centroDeportivoRepository = require('../../../infrastructure/repositories/centroDeportivoRepository');

/**
 * Middleware para verificar que el usuario tenga permisos sobre las canchas en creación masiva
 */
function verificarPropiedadCanchasBulk(req, res, next) {
  try {
    const userId = req.user.sub || req.user.userId;
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    
    // Verificar que se proporcionaron horarios
    if (!req.body.horarios || !Array.isArray(req.body.horarios) || req.body.horarios.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Se requiere un array de horarios para la creación masiva'
      });
    }
    
    // Obtener todos los canchaIds únicos
    const canchaIds = [...new Set(req.body.horarios.map(h => h.canchaId).filter(Boolean))];
    const horariosSinCancha = req.body.horarios.filter(h => !h.canchaId);
    
    // Para usuarios normales, obtener primero todas sus canchas para validación estricta
    if (!userGroups.includes('super_admin') && !userGroups.includes('admin_centro')) {
      const canchasRepository = new CanchasRepository();
      
      centroDeportivoRepository.findByAdminId(userId)
        .then(async centros => {
          if (!centros || centros.length === 0) {
            return res.status(403).json({
              statusCode: 403,
              error: 'Forbidden',
              message: 'No tienes ningún centro deportivo asociado'
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
          
          // Verificar que cada cancha en el array pertenezca al usuario
          if (canchaIds.length > 0) {
            for (const canchaId of canchaIds) {
              const canchaEncontrada = todasLasCanchasDelUsuario.find(c => c.canchaId === canchaId);
              if (!canchaEncontrada) {
                return res.status(403).json({
                  statusCode: 403,
                  error: 'Forbidden',
                  message: `La cancha con ID ${canchaId} no existe o no te pertenece.`
                });
              }
            }
          }
          
          // Si hay horarios sin cancha y el usuario tiene una sola cancha, asignarla automáticamente
          if (horariosSinCancha.length > 0) {
            if (todasLasCanchasDelUsuario.length === 1) {
              const unicaCancha = todasLasCanchasDelUsuario[0].canchaId;
              req.body.horarios = req.body.horarios.map(h => ({
                ...h,
                canchaId: h.canchaId || unicaCancha
              }));
            } else {
              return res.status(400).json({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Debes especificar el ID de la cancha para cada horario. Tienes múltiples canchas disponibles.',
                canchasDisponibles: todasLasCanchasDelUsuario.map(c => ({ 
                  canchaId: c.canchaId, 
                  nombre: c.nombre || c.tipo,
                  tipo: c.tipo
                }))
              });
            }
          }
          
          next();
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
    
    // Para superadmins y admin_centro, solo verificamos que las canchas existan
    if (canchaIds.length > 0) {
      const canchasRepository = new CanchasRepository();
      
      // Verificar cada cancha de manera asíncrona
      Promise.all(canchaIds.map(id => canchasRepository.findById(id)))
        .then(results => {
          // Verificar si alguna cancha no existe
          for (let i = 0; i < results.length; i++) {
            if (!results[i]) {
              return res.status(404).json({
                statusCode: 404,
                error: 'Not Found',
                message: `No se encontró la cancha con ID ${canchaIds[i]}`
              });
            }
          }
          
          // Verificar si hay horarios sin cancha
          if (horariosSinCancha.length > 0) {
            return res.status(400).json({
              statusCode: 400,
              error: 'Bad Request',
              message: 'Debes especificar el ID de la cancha para cada horario.'
            });
          }
          
          next();
        })
        .catch(error => {
          console.error('Error al verificar canchas:', error);
          return res.status(500).json({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'Error al verificar existencia de las canchas'
          });
        });
      
      return;
    }
    
    // Si no hay canchaIds pero hay horarios sin cancha, mostrar error
    if (horariosSinCancha.length > 0) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Debes especificar el ID de la cancha para cada horario.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en middleware de verificación bulk:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Error al procesar la solicitud'
    });
  }
}

/**
 * Middleware para verificar que el usuario tenga permisos sobre la cancha en operaciones de actualización
 */
function verificarPropiedadCanchaUpdate(req, res, next) {
  try {
    const userId = req.user.sub || req.user.userId;
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    const horarioId = req.params.id || req.params.horarioId;
    
    if (!horarioId) {
      return res.status(400).json({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Se requiere el ID del horario'
      });
    }
    
    // Primero obtenemos el horario existente para verificar a qué cancha pertenece
    const horariosRepository = require('../../../infrastructure/repositories/horariosRepository');
    
    horariosRepository.getById(horarioId)
      .then(async horario => {
        if (!horario) {
          return res.status(404).json({
            statusCode: 404,
            error: 'Not Found',
            message: `No se encontró el horario con ID ${horarioId}`
          });
        }
        
        // Para superadmin o admin_centro, permitir sin más comprobaciones
        if (userGroups.includes('super_admin') || userGroups.includes('admin_centro')) {
          if (req.body.canchaId && req.body.canchaId !== horario.canchaId) {
            // Si se está cambiando la cancha, verificar que la nueva exista
            const canchasRepository = new CanchasRepository();
            
            canchasRepository.findById(req.body.canchaId)
              .then(cancha => {
                if (!cancha) {
                  return res.status(404).json({
                    statusCode: 404,
                    error: 'Not Found',
                    message: `No se encontró la cancha con ID ${req.body.canchaId}`
                  });
                }
                
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
          
          next();
          return;
        }
        
        // Para usuarios normales, verificar que la cancha le pertenezca
        const canchasRepository = new CanchasRepository();
        
        centroDeportivoRepository.findByAdminId(userId)
          .then(async centros => {
            if (!centros || centros.length === 0) {
              return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'No tienes ningún centro deportivo asociado'
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
            
            // Verificar que la cancha del horario pertenezca al usuario
            const canchaHorario = todasLasCanchasDelUsuario.find(c => c.canchaId === horario.canchaId);
            
            if (!canchaHorario) {
              return res.status(403).json({
                statusCode: 403,
                error: 'Forbidden',
                message: 'No tienes permisos para modificar este horario'
              });
            }
            
            // Si se está intentando cambiar la cancha, verificar que la nueva también le pertenezca
            if (req.body.canchaId && req.body.canchaId !== horario.canchaId) {
              const nuevaCancha = todasLasCanchasDelUsuario.find(c => c.canchaId === req.body.canchaId);
              
              if (!nuevaCancha) {
                return res.status(403).json({
                  statusCode: 403,
                  error: 'Forbidden',
                  message: `La cancha con ID ${req.body.canchaId} no existe o no te pertenece`
                });
              }
            }
            
            next();
          })
          .catch(error => {
            console.error('Error al verificar centros deportivos:', error);
            return res.status(500).json({
              statusCode: 500,
              error: 'Internal Server Error',
              message: 'Error al verificar permisos'
            });
          });
      })
      .catch(error => {
        console.error('Error al obtener horario:', error);
        return res.status(500).json({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error al obtener información del horario'
        });
      });
  } catch (error) {
    console.error('Error en middleware de verificación de actualización:', error);
    return res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Error al procesar la solicitud'
    });
  }
}

module.exports = {
  verificarPropiedadCanchasBulk,
  verificarPropiedadCanchaUpdate
}; 