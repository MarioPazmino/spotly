// src/interfaces/http/controllers/v1/HorariosController.js
// Implementación simplificada del servicio de horarios directamente en el controlador
// para evitar problemas de importación en Lambda
const horariosRepository = require('../../../../infrastructure/repositories/horariosRepository');
const { normalizarFechaHoraGuayaquil, formatearHoraGuayaquil } = require('../../../../utils/fechas');

// Función auxiliar para convertir una hora en formato HH:MM o HH:MM:SS a minutos desde medianoche
function convertirHoraAMinutos(hora) {
  if (!hora || typeof hora !== 'string') return 0;
  
  // Dividir la hora en partes (horas, minutos, segundos)
  const partes = hora.split(':').map(Number);
  
  // Si tiene formato HH:MM:SS, ignoramos los segundos
  // Si tiene formato HH:MM, solo usamos horas y minutos
  const horas = partes[0] || 0;
  const minutos = partes[1] || 0;
  
  return horas * 60 + minutos;
}

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
    // Verificar si ya existe un horario que se solape con este nuevo horario
    const { canchaId, fecha, horaInicio, horaFin } = data;
    
    if (!canchaId || !fecha || !horaInicio || !horaFin) {
      throw new Error('Se requieren los campos canchaId, fecha, horaInicio y horaFin');
    }
    
    // Obtener todos los horarios de la cancha para la fecha específica
    const horariosExistentes = await this.listByCanchaAndFecha(canchaId, fecha);
    
    // Convertir las horas a minutos para facilitar la comparación
    const inicioNuevo = convertirHoraAMinutos(horaInicio);
    const finNuevo = convertirHoraAMinutos(horaFin);
    
    // Verificar solapamientos
    for (const horario of horariosExistentes.items) {
      const inicioExistente = convertirHoraAMinutos(horario.horaInicio);
      const finExistente = convertirHoraAMinutos(horario.horaFin);
      
      // Verificar si hay solapamiento
      // Caso 1: El nuevo horario comienza durante un horario existente
      // Caso 2: El nuevo horario termina durante un horario existente
      // Caso 3: El nuevo horario contiene completamente un horario existente
      // Caso 4: El nuevo horario está completamente contenido en un horario existente
      if (
        (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) || // Caso 1
        (finNuevo > inicioExistente && finNuevo <= finExistente) || // Caso 2
        (inicioNuevo <= inicioExistente && finNuevo >= finExistente) || // Caso 3
        (inicioNuevo >= inicioExistente && finNuevo <= finExistente) // Caso 4
      ) {
        throw new Error(`Ya existe un horario para la cancha ${canchaId} en la fecha ${fecha} que se solapa con el horario ${horaInicio}-${horaFin}`);
      }
    }
    
    // Si no hay solapamientos, crear el horario
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
      if (!canchaId || !fecha) {
        errores.push({
          horario,
          error: 'Se requieren los campos canchaId y fecha'
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

  async bulkUpdate(updates) {
    // Implementación simplificada
    const actualizados = [];
    for (const update of updates) {
      const { id, ...data } = update;
      const updated = await this.repo.update(id, data);
      actualizados.push(updated);
    }
    return actualizados;
  }

  async update(horarioId, data) {
    // Obtener el horario actual para validaciones
    const horarioActual = await this.repo.getById(horarioId);
    if (!horarioActual) {
      throw new Error(`Horario con ID ${horarioId} no encontrado`);
    }
    
    // Ya no validamos reservas asociadas porque vamos a eliminar esa relación
    
    // Si se están actualizando las horas, validar solapamientos
    if (data.horaInicio || data.horaFin) {
      
      // Combinar los datos actuales con los nuevos
      const horarioActualizado = {
        ...horarioActual,
        ...data
      };
      
      // Verificar solapamientos con otros horarios
      const { canchaId, fecha, horaInicio, horaFin } = horarioActualizado;
      
      // Obtener todos los horarios de la cancha para la fecha específica
      const horariosExistentes = await this.listByCanchaAndFecha(canchaId, fecha);
      
      // Convertir las horas a minutos para facilitar la comparación
      const inicioNuevo = convertirHoraAMinutos(horaInicio);
      const finNuevo = convertirHoraAMinutos(horaFin);
      
      // Verificar solapamientos con otros horarios (excepto el que estamos actualizando)
      for (const horario of horariosExistentes.items) {
        // Saltar el horario que estamos actualizando
        if (horario.horarioId === horarioId) continue;
        
        const inicioExistente = convertirHoraAMinutos(horario.horaInicio);
        const finExistente = convertirHoraAMinutos(horario.horaFin);
        
        // Verificar si hay solapamiento
        if (
          (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) || // Caso 1
          (finNuevo > inicioExistente && finNuevo <= finExistente) || // Caso 2
          (inicioNuevo <= inicioExistente && finNuevo >= finExistente) || // Caso 3
          (inicioNuevo >= inicioExistente && finNuevo <= finExistente) // Caso 4
        ) {
          throw new Error(`Ya existe un horario para la cancha ${canchaId} en la fecha ${fecha} que se solapa con el horario ${horaInicio}-${horaFin}`);
        }
      }
    }
    
    // Si no hay solapamientos o no se están actualizando las horas, actualizar el horario
    return this.repo.update(horarioId, data);
  }

  async delete(horarioId) {
    return this.repo.delete(horarioId);
  }

  async deleteByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin) {
    // Implementación simplificada
    return 0;
  }

  async getByFechaAndCancha(fecha, canchaId) {
    return this.repo.getByFechaAndCancha(fecha, canchaId);
  }
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

  // PATCH /api/v1/horarios/bulk
  async bulkUpdate(req, res, next) {
    try {
      const updates = req.body.updates;
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Debe enviar un array de actualizaciones' });
      }
      const actualizados = await this.horariosService.bulkUpdate(updates);
      res.status(200).json({ actualizados });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/v1/horarios/rango-fechas?canchaId=...&fechaInicio=...&fechaFin=...
  async deleteByCanchaAndRangoFechas(req, res, next) {
    try {
      const { canchaId, fechaInicio, fechaFin } = req.query;
      if (!canchaId || !fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'canchaId, fechaInicio y fechaFin son requeridos' });
      }
      const eliminados = await this.horariosService.deleteByCanchaAndRangoFechas(canchaId, fechaInicio, fechaFin);
      res.status(200).json({ eliminados });
    } catch (err) {
      next(err);
    }
  }

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
      const horario = await this.horariosService.create(req.body);
      res.status(201).json(horario);
    } catch (err) { 
      // Verificar si es un error de solapamiento
      if (err.message && err.message.includes('solapa')) {
        return res.status(409).json({
          error: 'Error de solapamiento de horarios',
          mensaje: 'No se pudo crear el horario debido a un solapamiento con otro horario existente',
          detalles: {
            horario: `${req.body.fecha} ${req.body.horaInicio}-${req.body.horaFin}`,
            error: err.message
          },
          code: 'HORARIO_SOLAPADO'
        });
      }
      next(err); 
    }
  }

  // PATCH /api/v1/horarios/:id
  async update(req, res, next) {
    try {
      console.log('PATCH /api/v1/horarios/:id - Cuerpo de la solicitud:', JSON.stringify(req.body));
      console.log('PATCH /api/v1/horarios/:id - Método HTTP:', req.method);
      console.log('PATCH /api/v1/horarios/:id - Headers:', JSON.stringify(req.headers));
      
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
      
      // Si se están actualizando las horas, validar que horaInicio < horaFin
      if (datosActualizacion.horaInicio || datosActualizacion.horaFin) {
        // Obtener el horario actual para completar los datos que faltan
        const horarioActual = await this.horariosService.getById(req.params.id);
        if (!horarioActual) {
          return res.status(404).json({
            error: 'Horario no encontrado',
            mensaje: `No se encontró el horario con ID ${req.params.id}`
          });
        }
        
        // Determinar las horas a comparar (las nuevas o las existentes)
        const horaInicio = datosActualizacion.horaInicio || horarioActual.horaInicio;
        const horaFin = datosActualizacion.horaFin || horarioActual.horaFin;
        
        // Convertir a minutos para comparar
        const inicioMinutos = convertirHoraAMinutos(horaInicio);
        const finMinutos = convertirHoraAMinutos(horaFin);
        
        if (inicioMinutos >= finMinutos) {
          return res.status(400).json({
            error: 'Validación de horario fallida',
            mensaje: 'La hora de inicio debe ser menor que la hora de fin',
            detalles: {
              horaInicio,
              horaFin
            }
          });
        }
      }
      
      console.log('Datos finales para actualizar:', JSON.stringify(datosActualizacion));
      const horario = await this.horariosService.update(req.params.id, datosActualizacion);
      console.log('Horario actualizado:', JSON.stringify(horario));
      res.json(horario);
    } catch (err) {
      console.error('Error al actualizar horario:', err.message); 
      // Verificar si es un error de solapamiento
      if (err.message && err.message.includes('solapa')) {
        return res.status(409).json({
          error: 'Error de solapamiento de horarios',
          mensaje: 'No se pudo actualizar el horario debido a un solapamiento con otro horario existente',
          detalles: {
            horarioId: req.params.id,
            error: err.message
          },
          code: 'HORARIO_SOLAPADO'
        });
      }
      
      // Ya no manejamos errores relacionados con reservas
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