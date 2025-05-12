//src/interfaces/middlewares/validarHorario.js
// Middleware para validar horarios en solicitudes HTTP
// Valida que hora < horaFin y que el formato sea HH:mm

const Boom = require('@hapi/boom');
const { isUuid } = require('../../utils/validators');
const { validateDates } = require('../../utils/dateValidators');
const centroDeportivoRepository = require('../../infrastructure/repositories/centroDeportivoRepository');
const CanchasRepository = require('../../infrastructure/repositories/canchasRepository');

/**
 * Middleware para validar la creación o actualización de horarios
 */
async function validarHorario(req, res, next) {
  try {
    const { horaInicio, horaFin, canchaId, fecha } = req.body;
    const userId = req.user.sub || req.user.userId;
    const userGroups = req.user.groups || req.user['cognito:groups'] || [];
    const isUpdate = req.method === 'PATCH' || req.originalUrl.includes('/update') || !!req.params.id || !!req.params.horarioId;
    
    // Crear instancia del repositorio de canchas (este sí necesita new)
    const canchasRepository = new CanchasRepository();
    // No instanciar centroDeportivoRepository porque ya es una instancia
    
    // Validar que se proporcionaron campos obligatorios - solo para creación (POST)
    if (!isUpdate && (!fecha || !horaInicio || !horaFin)) {
      return res.status(400).json({ error: 'Se requieren fecha, horaInicio y horaFin para crear un horario.' });
    }
    
    // Para actualizaciones, validamos solo los campos proporcionados
    if (isUpdate) {
      // Si se proporcionaron campos de hora, validar formato y relación
      if (horaInicio && horaFin) {
        // Validar formatos de hora (HH:MM)
        const horaInicioRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        const horaFinRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        
        if (!horaInicioRegex.test(horaInicio)) {
          return res.status(400).json({ error: 'El formato de horaInicio es inválido. Debe ser HH:MM.' });
        }
        
        if (!horaFinRegex.test(horaFin)) {
          return res.status(400).json({ error: 'El formato de horaFin es inválido. Debe ser HH:MM.' });
        }
        
        // Validar que horaInicio sea menor que horaFin
        if (horaInicio >= horaFin) {
          return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin.' });
        }
      } else if (horaInicio && !horaFin) {
        // Si solo proporciona horaInicio, verificar formato
        const horaInicioRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!horaInicioRegex.test(horaInicio)) {
          return res.status(400).json({ error: 'El formato de horaInicio es inválido. Debe ser HH:MM.' });
        }
        
        // Para actualizaciones con solo horaInicio, necesitamos obtener horaFin del horario existente
        if (req.params.id || req.params.horarioId) {
          const horariosRepository = require('../../infrastructure/repositories/horariosRepository');
          const horarioId = req.params.id || req.params.horarioId;
          const horarioExistente = await horariosRepository.getById(horarioId);
          
          if (!horarioExistente) {
            return res.status(404).json({ error: 'No se encontró el horario a actualizar.' });
          }
          
          if (horaInicio >= horarioExistente.horaFin) {
            return res.status(400).json({ 
              error: 'La hora de inicio debe ser anterior a la hora de fin.',
              mensaje: `La nueva hora de inicio (${horaInicio}) debe ser anterior a la hora de fin existente (${horarioExistente.horaFin}).`
            });
          }
        }
      } else if (!horaInicio && horaFin) {
        // Si solo proporciona horaFin, verificar formato
        const horaFinRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!horaFinRegex.test(horaFin)) {
          return res.status(400).json({ error: 'El formato de horaFin es inválido. Debe ser HH:MM.' });
        }
        
        // Para actualizaciones con solo horaFin, necesitamos obtener horaInicio del horario existente
        if (req.params.id || req.params.horarioId) {
          const horariosRepository = require('../../infrastructure/repositories/horariosRepository');
          const horarioId = req.params.id || req.params.horarioId;
          const horarioExistente = await horariosRepository.getById(horarioId);
          
          if (!horarioExistente) {
            return res.status(404).json({ error: 'No se encontró el horario a actualizar.' });
          }
          
          if (horarioExistente.horaInicio >= horaFin) {
            return res.status(400).json({ 
              error: 'La hora de fin debe ser posterior a la hora de inicio.',
              mensaje: `La nueva hora de fin (${horaFin}) debe ser posterior a la hora de inicio existente (${horarioExistente.horaInicio}).`
            });
          }
        }
      }
      
      if (fecha) {
        // Validar fecha en formato YYYY-MM-DD
        if (!validateDates(fecha)) {
          return res.status(400).json({ error: 'El formato de fecha es inválido. Debe ser YYYY-MM-DD.' });
        }
      }
    } else {
      // Validaciones completas para creación de horarios
      // Buscar las canchas asociadas al usuario para mostrarlas en caso de error
      const getCanchasDelUsuario = async () => {
        // Buscar centros deportivos del usuario
        const centros = await centroDeportivoRepository.findByAdminId(userId);
        
        if (!centros || centros.length === 0) {
          return [];
        }
        
        // Buscar todas las canchas de todos los centros del usuario
        let todasLasCanchasDelUsuario = [];
        for (const centro of centros) {
          try {
            const resultadoCanchas = await canchasRepository.findAllByCentro(centro.centroId);
            if (resultadoCanchas && resultadoCanchas.items && resultadoCanchas.items.length > 0) {
              todasLasCanchasDelUsuario = [...todasLasCanchasDelUsuario, ...resultadoCanchas.items];
            }
          } catch (error) {
            console.error(`Error al obtener canchas del centro ${centro.centroId}:`, error);
          }
        }
        
        return todasLasCanchasDelUsuario;
      };
      
      // Verificar canchaId
      if (canchaId) {
        // Verificar formato UUID
        if (!isUuid(canchaId)) {
          // Obtener canchas del usuario para incluirlas en el mensaje de error
          const canchasUsuario = await getCanchasDelUsuario();
          
          return res.status(400).json({ 
            error: 'El formato del canchaId es inválido. Debe ser un UUID.',
            canchasDisponibles: canchasUsuario.map(c => ({
              canchaId: c.canchaId,
              nombre: c.nombre || c.tipo,
              tipo: c.tipo,
              centroId: c.centroId
            }))
          });
        }
        
        // Verificar que la cancha existe
        const cancha = await canchasRepository.findById(canchaId);
        if (!cancha) {
          // Obtener canchas del usuario para incluirlas en el mensaje de error
          const canchasUsuario = await getCanchasDelUsuario();
          
          return res.status(404).json({ 
            error: 'La cancha con el ID proporcionado no existe.',
            canchasDisponibles: canchasUsuario.map(c => ({
              canchaId: c.canchaId,
              nombre: c.nombre || c.tipo,
              tipo: c.tipo,
              centroId: c.centroId
            }))
          });
        }
        
        // Si no es superadmin ni admin_centro, verificar que la cancha pertenece al usuario
        if (!userGroups.includes('super_admin') && !userGroups.includes('admin_centro')) {
          // Obtener centro de la cancha y verificar propiedad
          const centro = await centroDeportivoRepository.findById(cancha.centroId);
          if (!centro || centro.userId !== userId) {
            // Obtener canchas del usuario para incluirlas en el mensaje de error
            const canchasUsuario = await getCanchasDelUsuario();
            
            return res.status(403).json({ 
              error: 'No tienes permisos para crear horarios en esta cancha.',
              mensaje: 'La cancha no pertenece a ninguno de tus centros deportivos.',
              canchasDisponibles: canchasUsuario.map(c => ({
                canchaId: c.canchaId,
                nombre: c.nombre || c.tipo,
                tipo: c.tipo,
                centroId: c.centroId
              }))
            });
          }
        }
      } else {
        // Si no se proporcionó canchaId, intentamos obtenerlo del usuario
        // Los superadmins y admin_centro necesitan especificar la cancha explícitamente
        if (userGroups.includes('super_admin') || userGroups.includes('admin_centro')) {
          return res.status(400).json({
            error: 'Datos insuficientes',
            mensaje: 'Como administrador, debes especificar explícitamente el canchaId'
          });
        }
        
        // Para usuarios regulares, buscar sus centros deportivos y canchas
        try {
          // Buscar centros deportivos del usuario
          const centros = await centroDeportivoRepository.findByAdminId(userId);
          
          if (!centros || centros.length === 0) {
            return res.status(403).json({
              error: 'Forbidden',
              mensaje: 'No tienes ningún centro deportivo asociado'
            });
          }
          
          // Si tiene un solo centro, buscar sus canchas
          const centroId = centros[0].centroId;
          const resultadoCanchas = await canchasRepository.findAllByCentro(centroId);
          const canchas = resultadoCanchas.items || [];
          
          if (!canchas || canchas.length === 0) {
            return res.status(404).json({
              error: 'Not Found',
              mensaje: 'No se encontraron canchas asociadas a tu centro deportivo'
            });
          }
          
          // Si tiene una sola cancha, usar esa automáticamente
          if (canchas.length === 1) {
            req.body.canchaId = canchas[0].canchaId;
          } else {
            // Si tiene múltiples canchas, necesita especificar cuál
            return res.status(400).json({
              error: 'Datos insuficientes',
              mensaje: 'Tienes múltiples canchas. Debes especificar para cuál quieres crear el horario (canchaId)',
              canchasDisponibles: canchas.map(c => ({
                canchaId: c.canchaId,
                nombre: c.nombre || c.tipo,
                tipo: c.tipo,
                centroId: c.centroId
              }))
            });
          }
        } catch (error) {
          console.error('Error al buscar centros o canchas del usuario:', error);
          return res.status(500).json({
            error: 'Internal Server Error',
            mensaje: 'Error al buscar información del usuario'
          });
        }
      }
      
      // Validar fecha en formato YYYY-MM-DD
      if (!validateDates(fecha)) {
        return res.status(400).json({ error: 'El formato de fecha es inválido. Debe ser YYYY-MM-DD.' });
      }
      
      // Validar formatos de hora (HH:MM)
      const horaInicioRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      const horaFinRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      
      if (!horaInicioRegex.test(horaInicio)) {
        return res.status(400).json({ error: 'El formato de horaInicio es inválido. Debe ser HH:MM.' });
      }
      
      if (!horaFinRegex.test(horaFin)) {
        return res.status(400).json({ error: 'El formato de horaFin es inválido. Debe ser HH:MM.' });
      }
      
      // Validar que horaInicio sea menor que horaFin
      if (horaInicio >= horaFin) {
        return res.status(400).json({ error: 'La hora de inicio debe ser anterior a la hora de fin.' });
      }
      
      // Validar solapamiento con otros horarios existentes
      try {
        // Importar el repositorio de horarios y el helper de conversión
        const horariosRepository = require('../../infrastructure/repositories/horariosRepository');
        const { convertirHoraAMinutos } = require('../../utils/dateValidators');
        
        // Convertir horas a minutos para comparar
        const inicioNuevo = convertirHoraAMinutos(horaInicio);
        const finNuevo = convertirHoraAMinutos(horaFin);
        
        // Obtener horarios existentes para la misma cancha y fecha
        const horariosExistentes = await horariosRepository.listByCanchaAndRangoFechas(
          canchaId, 
          fecha, 
          fecha
        );
        
        // Verificar solapamiento con cada horario existente
        if (horariosExistentes && horariosExistentes.items && horariosExistentes.items.length > 0) {
          const horarioId = req.params.id || req.params.horarioId; // Si es una actualización
          
          for (const existente of horariosExistentes.items) {
            // Si estamos actualizando, ignorar el horario actual en la validación
            if (horarioId && existente.horarioId === horarioId) {
              continue;
            }
            
            const inicioExistente = convertirHoraAMinutos(existente.horaInicio);
            const finExistente = convertirHoraAMinutos(existente.horaFin);
            
            // Comprobar solapamiento
            if (
              (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) || // Caso 1: inicio nuevo dentro de un horario existente
              (finNuevo > inicioExistente && finNuevo <= finExistente) || // Caso 2: fin nuevo dentro de un horario existente
              (inicioNuevo <= inicioExistente && finNuevo >= finExistente) || // Caso 3: el nuevo horario engloba al existente
              (inicioNuevo >= inicioExistente && finNuevo <= finExistente) // Caso 4: el nuevo horario está contenido en el existente
            ) {
              return res.status(409).json({
                error: 'Conflicto de horarios',
                mensaje: `El horario solicitado (${horaInicio}-${horaFin}) se solapa con un horario existente (${existente.horaInicio}-${existente.horaFin})`,
                horarioExistente: existente
              });
            }
          }
        }
      } catch (errorSolapamiento) {
        console.error('Error al validar solapamientos:', errorSolapamiento);
        // Continuamos si hay error en la validación de solapamientos para no bloquear la operación
      }
    }
    
    // También necesitamos validar solapamiento en actualizaciones cuando solo se actualiza algunos campos
    if (isUpdate && (horaInicio || horaFin || fecha)) {
      try {
        // Importar el repositorio de horarios y el helper de conversión
        const horariosRepository = require('../../infrastructure/repositories/horariosRepository');
        const { convertirHoraAMinutos } = require('../../utils/dateValidators');
        
        // Obtener el horario actual para combinar con los nuevos valores
        const horarioId = req.params.id || req.params.horarioId;
        if (horarioId) {
          const horarioExistente = await horariosRepository.getById(horarioId);
          
          if (horarioExistente) {
            // Combinar valores existentes con nuevos valores
            const fechaFinal = fecha || horarioExistente.fecha;
            const horaInicioFinal = horaInicio || horarioExistente.horaInicio;
            const horaFinFinal = horaFin || horarioExistente.horaFin;
            const canchaIdFinal = canchaId || horarioExistente.canchaId;
            
            // Convertir horas a minutos para comparar
            const inicioNuevo = convertirHoraAMinutos(horaInicioFinal);
            const finNuevo = convertirHoraAMinutos(horaFinFinal);
            
            // Obtener otros horarios existentes para la misma cancha y fecha
            const horariosExistentes = await horariosRepository.listByCanchaAndRangoFechas(
              canchaIdFinal, 
              fechaFinal, 
              fechaFinal
            );
            
            // Verificar solapamiento con cada horario existente
            if (horariosExistentes && horariosExistentes.items && horariosExistentes.items.length > 0) {
              for (const existente of horariosExistentes.items) {
                // Ignorar el horario actual en la validación
                if (existente.horarioId === horarioId) {
                  continue;
                }
                
                const inicioExistente = convertirHoraAMinutos(existente.horaInicio);
                const finExistente = convertirHoraAMinutos(existente.horaFin);
                
                // Comprobar solapamiento
                if (
                  (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) ||
                  (finNuevo > inicioExistente && finNuevo <= finExistente) ||
                  (inicioNuevo <= inicioExistente && finNuevo >= finExistente) ||
                  (inicioNuevo >= inicioExistente && finNuevo <= finExistente)
                ) {
                  return res.status(409).json({
                    error: 'Conflicto de horarios',
                    mensaje: `El horario actualizado (${horaInicioFinal}-${horaFinFinal}) se solaparía con un horario existente (${existente.horaInicio}-${existente.horaFin})`,
                    horarioExistente: existente
                  });
                }
              }
            }
          }
        }
      } catch (errorSolapamiento) {
        console.error('Error al validar solapamientos en actualización:', errorSolapamiento);
        // Continuamos si hay error en la validación para no bloquear la operación
      }
    }
    
    next();
  } catch (error) {
    console.error('Error en validación de horario:', error);
    next(Boom.badImplementation('Error interno en la validación del horario'));
  }
}

module.exports = validarHorario;
