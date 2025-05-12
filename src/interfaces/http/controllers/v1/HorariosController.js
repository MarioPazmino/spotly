// src/interfaces/http/controllers/v1/horariosController.js
// Implementación simplificada del servicio de horarios directamente en el controlador
// para evitar problemas de importación en Lambda
const horariosRepository = require('../../../../infrastructure/repositories/horariosRepository');
const { normalizarFechaHoraGuayaquil, formatearHoraGuayaquil } = require('../../../../utils/fechas');
const { convertirHoraAMinutos } = require('../../../../utils/dateValidators');

// Servicio simplificado de horarios
class HorariosServiceSimple {
  constructor(repo = horariosRepository) {
    this.repo = repo;
  }

  async getById(horarioId) {
    const horario = await this.repo.getById(horarioId);
    if (!horario) return null;
    // Normaliza las horas a zona Guayaquil
    if (horario.horaInicio) {
      horario.horaInicio = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaInicio));
    }
    if (horario.horaFin) {
      horario.horaFin = formatearHoraGuayaquil(normalizarFechaHoraGuayaquil(horario.fecha, horario.horaFin));
    }
    return horario;
  }

  async listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, limit = 20, exclusiveStartKey = null, estado = null) {
    return this.repo.listByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin, limit, exclusiveStartKey, estado);
  }

  async listByCanchaAndFecha(canchaId, fecha, limit = 20, exclusiveStartKey = null, estado = null) {
    // Implementación simplificada - usar el mismo método que para rango de fechas
    return this.repo.listByCanchaAndRangoFechas(canchaId, fecha, fecha, limit, exclusiveStartKey, estado);
  }

  async create(data) {
    // Verificar campos requeridos sin incluir canchaId
    const { canchaId, fecha, horaInicio, horaFin } = data;
    
    if (!fecha || !horaInicio || !horaFin) {
      throw new Error('Se requieren los campos fecha, horaInicio y horaFin');
    }
    
    // Si falta canchaId, se debió asignar en el controlador
    if (!canchaId) {
      throw new Error('No se proporcionó el ID de la cancha (canchaId). Si tienes varias canchas, debes especificar para cuál quieres crear el horario.');
    }
    
    // Validar solapamiento con otros horarios
    // Convertir horas a minutos para comparar
    const inicioNuevo = convertirHoraAMinutos(horaInicio);
    const finNuevo = convertirHoraAMinutos(horaFin);
    
    // Validar que horaInicio < horaFin
    if (inicioNuevo >= finNuevo) {
      throw new Error('La hora de inicio debe ser anterior a la hora de fin');
    }
    
    // Obtener horarios existentes para esta fecha y cancha
    const horariosExistentes = await this.listByCanchaAndFecha(canchaId, fecha);
    
    // Verificar solapamiento con horarios existentes
    if (horariosExistentes && horariosExistentes.items && horariosExistentes.items.length > 0) {
      for (const existente of horariosExistentes.items) {
        const inicioExistente = convertirHoraAMinutos(existente.horaInicio);
        const finExistente = convertirHoraAMinutos(existente.horaFin);
        
        // Comprobar solapamiento usando las 4 condiciones
        if (
          (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) || // Caso 1: inicio nuevo dentro de horario existente
          (finNuevo > inicioExistente && finNuevo <= finExistente) || // Caso 2: fin nuevo dentro de horario existente
          (inicioNuevo <= inicioExistente && finNuevo >= finExistente) || // Caso 3: horario nuevo engloba al existente
          (inicioNuevo >= inicioExistente && finNuevo <= finExistente) // Caso 4: horario nuevo contenido en existente
        ) {
          throw new Error(`Ya existe un horario para la cancha ${canchaId} en la fecha ${fecha} que se solapa con el horario ${horaInicio}-${horaFin} (${existente.horaInicio}-${existente.horaFin})`);
        }
      }
    }
    
    // Crear el horario
    return this.repo.create(data);
  }

  async bulkCreate(horarios) {
    // Implementación con validación de solapamientos
    const creados = [];
    const duplicados = [];
    const errores = [];
    
    // Agrupar horarios por cancha y fecha para validar solapamientos
    const horariosPorCanchaYFecha = {};
    
    // Primera pasada: agrupar horarios
    for (const horario of horarios) {
      const { canchaId, fecha } = horario;
      
      // El canchaId debió ser asignado en el controlador si no venía
      if (!canchaId) {
        errores.push({
          horario,
          error: 'No se proporcionó el ID de la cancha (canchaId). Si tienes varias canchas, debes especificar para cuál quieres crear el horario.'
        });
        continue;
      }
      
      if (!fecha) {
        errores.push({
          horario,
          error: 'Se requiere el campo fecha'
        });
        continue;
      }
      
      const key = `${canchaId}_${fecha}`;
      if (!horariosPorCanchaYFecha[key]) {
        // Obtener horarios existentes para esta cancha y fecha
        const horariosExistentes = await this.listByCanchaAndFecha(canchaId, fecha);
        horariosPorCanchaYFecha[key] = {
          existentes: horariosExistentes.items,
          nuevos: []
        };
      }
      
      horariosPorCanchaYFecha[key].nuevos.push(horario);
    }
    
    // Segunda pasada: validar y crear horarios
    for (const key in horariosPorCanchaYFecha) {
      const { existentes, nuevos } = horariosPorCanchaYFecha[key];
      
      // Validar cada nuevo horario contra los existentes y los nuevos ya validados
      const validados = [];
      
      for (const horario of nuevos) {
        const { horaInicio, horaFin, canchaId, fecha } = horario;
        
        if (!horaInicio || !horaFin) {
          errores.push({
            horario,
            error: 'Se requieren los campos horaInicio y horaFin'
          });
          continue;
        }
        
        // Convertir horas a minutos
        const inicioNuevo = convertirHoraAMinutos(horaInicio);
        const finNuevo = convertirHoraAMinutos(horaFin);
        
        // Validar que hora inicio < hora fin
        if (inicioNuevo >= finNuevo) {
          errores.push({
            horario,
            error: `La hora de inicio (${horaInicio}) debe ser menor que la hora de fin (${horaFin})`
          });
          continue;
        }
        
        let solapado = false;
        
        // Verificar contra horarios existentes
        for (const existente of existentes) {
          const inicioExistente = convertirHoraAMinutos(existente.horaInicio);
          const finExistente = convertirHoraAMinutos(existente.horaFin);
          
          if (
            (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) ||
            (finNuevo > inicioExistente && finNuevo <= finExistente) ||
            (inicioNuevo <= inicioExistente && finNuevo >= finExistente) ||
            (inicioNuevo >= inicioExistente && finNuevo <= finExistente)
          ) {
            duplicados.push({
              horario,
              error: `Ya existe un horario para la cancha ${canchaId} en la fecha ${fecha} que se solapa con el horario ${horaInicio}-${horaFin}`
            });
            solapado = true;
            break;
          }
        }
        
        if (solapado) continue;
        
        // Verificar contra nuevos horarios ya validados
        for (const validado of validados) {
          const inicioValidado = convertirHoraAMinutos(validado.horaInicio);
          const finValidado = convertirHoraAMinutos(validado.horaFin);
          
          if (
            (inicioNuevo >= inicioValidado && inicioNuevo < finValidado) ||
            (finNuevo > inicioValidado && finNuevo <= finValidado) ||
            (inicioNuevo <= inicioValidado && finNuevo >= finValidado) ||
            (inicioNuevo >= inicioValidado && finNuevo <= finValidado)
          ) {
            duplicados.push({
              horario,
              error: `El horario ${horaInicio}-${horaFin} se solapa con otro horario nuevo para la misma cancha y fecha`
            });
            solapado = true;
            break;
          }
        }
        
        if (!solapado) {
          validados.push(horario);
        }
      }
      
      // Crear los horarios validados
      for (const horario of validados) {
        try {
          const created = await this.repo.create(horario);
          creados.push(created);
        } catch (error) {
          errores.push({
            horario,
            error: error.message
          });
        }
      }
    }
    
    return { creados, duplicados, errores };
  }

  // Método bulkUpdate eliminado porque no se usa en las rutas actuales

  async update(horarioId, data) {
    // Obtener el horario actual para validaciones
    const horarioActual = await this.repo.getById(horarioId);
    if (!horarioActual) {
      throw new Error(`Horario con ID ${horarioId} no encontrado`);
    }
    
    // Eliminar campos que no deben actualizarse
    const datosLimpios = { ...data };
    delete datosLimpios.horarioId;
    delete datosLimpios.canchaId;
    
    // Si no hay datos para actualizar, retornar el horario sin cambios
    if (Object.keys(datosLimpios).length === 0) {
      return horarioActual;
    }
    
    // Validar solapamiento si se están cambiando fechas u horas
    if (datosLimpios.fecha || datosLimpios.horaInicio || datosLimpios.horaFin) {
      const fecha = datosLimpios.fecha || horarioActual.fecha;
      const horaInicio = datosLimpios.horaInicio || horarioActual.horaInicio;
      const horaFin = datosLimpios.horaFin || horarioActual.horaFin;
      const canchaId = horarioActual.canchaId;
      
      // Validar que horaInicio < horaFin
      if (horaInicio >= horaFin) {
        throw new Error('La hora de inicio debe ser anterior a la hora de fin');
      }
      
      // Convertir horas a minutos para comparar
      const inicioNuevo = convertirHoraAMinutos(horaInicio);
      const finNuevo = convertirHoraAMinutos(horaFin);
      
      // Obtener otros horarios existentes para la misma cancha y fecha
      const horariosExistentes = await this.listByCanchaAndFecha(canchaId, fecha);
      
      // Verificar solapamiento con cada horario existente, excluyendo el actual
      if (horariosExistentes && horariosExistentes.items) {
        for (const existente of horariosExistentes.items) {
          // Omitir el horario que estamos actualizando
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
            throw new Error(`El horario se solapa con un horario existente (${existente.horaInicio}-${existente.horaFin})`);
          }
        }
      }
    }
    
    // Actualizar el horario con los datos limpios
    return this.repo.update(horarioId, datosLimpios);
  }

  async delete(horarioId) {
    return this.repo.delete(horarioId);
  }

  // Método deleteByCanchaAndRangoFechas eliminado porque no se usa en las rutas actuales

  // Método getByFechaAndCancha eliminado porque no se usa en las rutas actuales
}

// Crear una instancia del servicio simplificado
const horariosService = new HorariosServiceSimple();

// Controlador de horarios
class HorariosController {
  constructor() {
    // Usar el servicio definido internamente en este archivo
    this.horariosService = horariosService;
  }

  // GET /api/v1/horarios/rango-fechas?canchaId=...&fechaInicio=...&fechaFin=...&limit=...&exclusiveStartKey=...&estado=...
  async listByCanchaAndRangoFechas(req, res, next) {
    try {
      const { canchaId, fechaInicio, fechaFin, limit, exclusiveStartKey, estado } = req.query;
      if (!canchaId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'canchaId, fechaInicio y fechaFin son requeridos' });
      }
      const result = await this.horariosService.listByCanchaAndRangoFechas(
        canchaId,
        fechaInicio,
        fechaFin,
        limit ? parseInt(limit) : 20,
        exclusiveStartKey ? JSON.parse(exclusiveStartKey) : null,
        estado || null
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/v1/horarios/bulk
  async bulkCreate(req, res, next) {
    try {
      const horarios = req.body.horarios;
      
      if (!Array.isArray(horarios) || horarios.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un array de horarios' });
      }
      
      // Validar formato y consistencia de cada horario
      const errores = [];
      for (let i = 0; i < horarios.length; i++) {
        const h = horarios[i];
        
        // Verificar que cada horario tiene canchaId (el middleware debería haberlo asignado)
        if (!h.canchaId) {
          errores.push({ idx: i, error: 'Falta canchaId para este horario' });
          continue;
        }
        
        if (!h.horaInicio || !h.horaFin) {
          errores.push({ idx: i, error: 'Faltan horaInicio u horaFin' });
          continue;
        }
        
        // Validar formato de hora: aceptar tanto HH:mm como HH:mm:ss
        const regexHoraConSegundos = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
        const regexHoraSinSegundos = /^([01]\d|2[0-3]):([0-5]\d)$/;
        
        const horaInicioValida = regexHoraConSegundos.test(h.horaInicio) || regexHoraSinSegundos.test(h.horaInicio);
        const horaFinValida = regexHoraConSegundos.test(h.horaFin) || regexHoraSinSegundos.test(h.horaFin);
        
        if (!horaInicioValida || !horaFinValida) {
          errores.push({ idx: i, error: 'Formato de hora inválido (debe ser HH:mm o HH:mm:ss)' });
          continue;
        }
        
        if (h.horaInicio >= h.horaFin) {
          errores.push({ idx: i, error: 'horaInicio debe ser menor que horaFin' });
        }
      }
      
      if (errores.length > 0) {
        return res.status(400).json({ error: 'Errores de validación en horarios', detalles: errores });
      }
      
      // El service ahora retorna {creados, duplicados, errores}
      const { creados, duplicados, errores: erroresServicio } = await this.horariosService.bulkCreate(horarios);
      
      // Verificar si hay horarios solapados o errores
      if (duplicados.length > 0 || erroresServicio?.length > 0) {
        // Si solo hay solapamientos, devolver un mensaje claro de error
        if (duplicados.length > 0 && creados.length === 0) {
          return res.status(409).json({
            error: 'Error de solapamiento de horarios',
            mensaje: 'No se pudieron crear los horarios debido a solapamientos',
            solapados: duplicados.map(d => ({
              horario: `${d.horario.fecha} ${d.horario.horaInicio}-${d.horario.horaFin}`,
              error: d.error
            }))
          });
        }
        
        // Si se crearon algunos pero otros tienen errores, devolver estado parcial
        return res.status(207).json({
          mensaje: 'Creación parcial de horarios',
          creados,
          errores: erroresServicio || [],
          solapados: duplicados.map(d => ({
            horario: `${d.horario.fecha} ${d.horario.horaInicio}-${d.horario.horaFin}`,
            error: d.error
          }))
        });
      }
      
      res.status(201).json({ creados });
    } catch (err) {
      next(err);
    }
  }

  // Método bulkUpdate eliminado porque no se usa en las rutas actuales

  // Método deleteByCanchaAndRangoFechas eliminado porque no se usa en las rutas actuales

  // GET /api/v1/horarios/:id
  async getById(req, res, next) {
    try {
      const horario = await this.horariosService.getById(req.params.id);
      if (!horario) return res.status(404).json({ message: 'Horario no encontrado' });
      res.json(horario);
    } catch (err) { 
      next(err); 
    }
  }

  // GET /api/v1/horarios?canchaId=...&fecha=...
  async listByCanchaAndFecha(req, res, next) {
    try {
      const { canchaId, fecha, limit, exclusiveStartKey, estado } = req.query;
      if (!canchaId || !fecha) return res.status(400).json({ message: 'canchaId y fecha son requeridos' });
      const result = await this.horariosService.listByCanchaAndFecha(
        canchaId,
        fecha,
        limit ? parseInt(limit) : 20,
        exclusiveStartKey ? JSON.parse(exclusiveStartKey) : null,
        estado || null
      );
      res.json(result);
    } catch (err) { 
      next(err); 
    }
  }

  // POST /api/v1/horarios
  async create(req, res, next) {
    try {
      const data = req.body;
      
      // El middleware validarHorario ya debería haber verificado y asignado un canchaId válido
      if (!data.canchaId) {
        // Este caso solo debería ocurrir si hay algún problema con el middleware
        // Intentar proporcionar información útil al usuario
        
        const userId = req.user.sub || req.user.userId;
        const CanchasRepository = require('../../../../infrastructure/repositories/canchasRepository');
        const canchasRepository = new CanchasRepository();
        const centroDeportivoRepository = require('../../../../infrastructure/repositories/centroDeportivoRepository');
        
        try {
          // Buscar los centros del usuario
          const centros = await centroDeportivoRepository.findByAdminId(userId);
          
          if (!centros || centros.length === 0) {
            return res.status(400).json({
              error: 'Bad Request',
              mensaje: 'No se pudo determinar el canchaId. No tienes centros deportivos asociados.'
            });
          }
          
          // Buscar canchas para todos los centros
          let todasLasCanchas = [];
          for (const centro of centros) {
            const resultadoCanchas = await canchasRepository.findAllByCentro(centro.centroId);
            if (resultadoCanchas && resultadoCanchas.items && resultadoCanchas.items.length > 0) {
              todasLasCanchas = [...todasLasCanchas, ...resultadoCanchas.items];
            }
          }
          
          if (todasLasCanchas.length === 0) {
            return res.status(400).json({
              error: 'Bad Request',
              mensaje: 'No se pudo determinar el canchaId. No tienes canchas asociadas a tus centros deportivos.'
            });
          }
          
          // Si hay una sola cancha, usarla automáticamente
          if (todasLasCanchas.length === 1) {
            data.canchaId = todasLasCanchas[0].canchaId;
          } else {
            // Mostrar las canchas disponibles
            return res.status(400).json({
              error: 'Bad Request',
              mensaje: 'No se pudo determinar el canchaId. Tienes múltiples canchas disponibles, debes especificar cuál quieres usar.',
              canchasDisponibles: todasLasCanchas.map(c => ({
                canchaId: c.canchaId,
                nombre: c.nombre || c.tipo,
                tipo: c.tipo,
                centroId: c.centroId
              }))
            });
          }
        } catch (error) {
          console.error('Error al buscar canchas del usuario:', error);
          return res.status(400).json({
            error: 'Bad Request',
            mensaje: 'No se pudo determinar el canchaId. Contacte al administrador.'
          });
        }
      }
      
      try {
        // Crear el horario utilizando el servicio
        const horario = await this.horariosService.create(data);
        res.status(201).json(horario);
      } catch (serviceError) {
        // Capturar específicamente errores de solapamiento
        if (serviceError.message && serviceError.message.includes('solapa')) {
          return res.status(409).json({
            error: 'Conflicto de horarios',
            mensaje: serviceError.message,
            code: 'HORARIO_OVERLAP'
          });
        }
        // Otros errores del servicio
        return res.status(400).json({
          error: 'Error al crear horario',
          mensaje: serviceError.message
        });
      }
    } catch (error) {
      console.error('Error al crear horario:', error);
      next(error);
    }
  }

  // PATCH /api/v1/horarios/:id
  async update(req, res, next) {
    try {
      console.log('PATCH /api/v1/horarios/:id - Cuerpo de la solicitud:', JSON.stringify(req.body));
      
      // Procesar el cuerpo de la solicitud si es un Buffer
      let datosActualizacion = req.body;
      
      if (Buffer.isBuffer(req.body)) {
        try {
          // Convertir el Buffer a string y luego a objeto JSON
          const bodyString = req.body.toString('utf8');
          console.log('Cuerpo como string:', bodyString);
          datosActualizacion = JSON.parse(bodyString);
          console.log('Cuerpo parseado:', JSON.stringify(datosActualizacion));
        } catch (parseError) {
          console.error('Error al parsear el cuerpo de la solicitud:', parseError.message);
          return res.status(400).json({ 
            error: 'Formato de solicitud inválido', 
            mensaje: 'El cuerpo de la solicitud no es un JSON válido' 
          });
        }
      } else if (req.body && req.body.type === 'Buffer' && Array.isArray(req.body.data)) {
        try {
          // Convertir el objeto Buffer a string y luego a objeto JSON
          const bodyString = Buffer.from(req.body.data).toString('utf8');
          console.log('Cuerpo como string desde objeto Buffer:', bodyString);
          datosActualizacion = JSON.parse(bodyString);
          console.log('Cuerpo parseado desde objeto Buffer:', JSON.stringify(datosActualizacion));
        } catch (parseError) {
          console.error('Error al parsear el objeto Buffer:', parseError.message);
          return res.status(400).json({ 
            error: 'Formato de solicitud inválido', 
            mensaje: 'El objeto Buffer no contiene un JSON válido' 
          });
        }
      }
      
      // Verificar que tenemos datos para actualizar
      if (!datosActualizacion || Object.keys(datosActualizacion).length === 0) {
        return res.status(400).json({ 
          error: 'Datos insuficientes', 
          mensaje: 'No se proporcionaron datos para actualizar' 
        });
      }
      
      // Eliminar campos que no deben actualizarse
      delete datosActualizacion.horarioId;
      delete datosActualizacion.canchaId;
      
      console.log('Datos finales para actualizar:', JSON.stringify(datosActualizacion));
      
      try {
        const horario = await this.horariosService.update(req.params.id, datosActualizacion);
        console.log('Horario actualizado:', JSON.stringify(horario));
        res.json(horario);
      } catch (serviceError) {
        // Capturar específicamente errores de solapamiento
        if (serviceError.message && serviceError.message.includes('solapa')) {
          return res.status(409).json({
            error: 'Conflicto de horarios',
            mensaje: serviceError.message,
            code: 'HORARIO_OVERLAP'
          });
        }
        // Otros errores del servicio
        return res.status(400).json({
          error: 'Error al actualizar horario',
          mensaje: serviceError.message
        });
      }
    } catch (err) {
      console.error('Error al actualizar horario:', err.message); 
      next(err);
    }
  }

  // DELETE /api/v1/horarios/:id
  async delete(req, res, next) {
    try {
      // Verificar primero si el horario existe
      const horario = await this.horariosService.getById(req.params.id);
      if (!horario) {
        return res.status(404).json({
          error: 'Horario no encontrado',
          mensaje: `No se encontró ningún horario con ID ${req.params.id}`,
          code: 'HORARIO_NOT_FOUND'
        });
      }
      
      // Si existe, proceder a eliminarlo
      await this.horariosService.delete(req.params.id);
      
      // Devolver respuesta de éxito con detalles
      return res.status(200).json({
        mensaje: 'Horario eliminado con éxito',
        detalles: {
          horarioId: req.params.id,
          fecha: horario.fecha,
          horaInicio: horario.horaInicio,
          horaFin: horario.horaFin
        },
        code: 'HORARIO_DELETED'
      });
    } catch (err) { 
      console.error('Error al eliminar horario:', err.message);
      return res.status(500).json({
        error: 'Error al eliminar horario',
        mensaje: 'Ocurrió un error al intentar eliminar el horario',
        detalles: {
          horarioId: req.params.id,
          error: err.message
        },
        code: 'ERROR_DELETE_HORARIO'
      }); 
    }
  }
}

module.exports = HorariosController;