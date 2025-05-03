//src/infrastructure/services/centroDeportivoService.js
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const CentroDeportivo = require('../../domain/entities/centro-deportivo');
const geoLocationService = require('./geoLocationService');
const Boom = require('@hapi/boom');
const { v4: uuidv4 } = require('uuid'); // Necesitarás añadir esta dependencia

class CentroDeportivoService {
  constructor() {
    this.repo = new CentroDeportivoRepository();
  }

  async listCentros(filters = {}, options = {}) {
    // Procesar filtros especiales antes de pasarlos al repositorio
    const processedFilters = { ...filters };
    // Manejar filtros de rango de horario
    if (filters.abiertoDespuesDe || filters.abiertoAntesDe) {
      if (processedFilters.abiertoDespuesDe) delete processedFilters.abiertoDespuesDe;
      if (processedFilters.abiertoAntesDe) delete processedFilters.abiertoAntesDe;
    }
    // Obtener resultados del repositorio con filtros básicos
    const result = await this.repo.findAll(processedFilters, options);
    
    // Aplicar filtros especiales post-consulta si existen
    let filteredItems = result.items;
    
    // Filtrar por horario de apertura/cierre (rangos)
    if (filters.abiertoDespuesDe || filters.abiertoAntesDe) {
      filteredItems = this._filterByHorario(
        filteredItems, 
        filters.abiertoDespuesDe, 
        filters.abiertoAntesDe
      );
    }
    
    // Actualizar los resultados con los ítems filtrados
    return {
      ...result,
      items: filteredItems,
      count: filteredItems.length
    };
  }


  async createCentro(centroData) {
    // Validar datos necesarios
    if (!centroData.nombre || !centroData.direccion || !centroData.telefonoPrincipal || !centroData.userId) {
      throw Boom.badRequest('Faltan campos obligatorios para crear el centro deportivo');
    }

    // Validar coordenadas GPS si están presentes
    if (centroData.ubicacionGPS) {
      const { error } = geoLocationService.validateCoordinates(centroData.ubicacionGPS);
      if (error) {
        throw Boom.badRequest(`Error en coordenadas GPS: ${error.message}`);
      }
    }

    // Crear un centro deportivo con ID único
    const centro = new CentroDeportivo({
      ...centroData,
      centroId: centroData.centroId || uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return await this.repo.save(centro);
  }

  async getCentroById(centroId) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    
    const centro = await this.repo.findById(centroId);
    if (!centro) throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    return centro;
  }

  async updateCentro(centroId, updateData) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    
    // Verificar que el centro existe
    const existingCentro = await this.repo.findById(centroId);
    if (!existingCentro) {
      throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    }

    // Validar que haya al menos un campo para actualizar
    if (Object.keys(updateData).length === 0) {
      throw Boom.badRequest('Debe proporcionar al menos un campo para actualizar');
    }
    
    // Validar coordenadas GPS si están presentes
    if (updateData.ubicacionGPS) {
      const { error } = geoLocationService.validateCoordinates(updateData.ubicacionGPS);
      if (error) {
        throw Boom.badRequest(`Error en coordenadas GPS: ${error.message}`);
      }
    }
    
    // Añadir marca de tiempo de actualización
    const dataToUpdate = {
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    return await this.repo.update(centroId, dataToUpdate);
  }


  async deleteCentro(centroId) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    
    // Verificar que el centro existe
    const existingCentro = await this.repo.findById(centroId);
    if (!existingCentro) {
      throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    }
    
    return await this.repo.delete(centroId);
  }

  // Método auxiliar para validar el formato del centroId
  validateCentroId(centroId) {
    // Verificar que el ID no sea null o undefined
    if (!centroId) {
      throw Boom.badRequest('El ID del centro deportivo es obligatorio');
    }
    
    // Verificar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(centroId)) {
      throw Boom.badRequest('El formato del ID de centro deportivo es inválido');
    }
  }

  // Validar propiedad del centro deportivo
  async validateOwnership(centroId, userId) {
    const centro = await this.getCentroById(centroId);
    if (centro.userId !== userId) {
      throw Boom.forbidden('No tienes permisos para modificar este centro deportivo');
    }
    return centro;
  }

  // NUEVO MÉTODO: Buscar centros cercanos por ubicación GPS
async findCentrosByLocation(coordinates, radius = 5, filters = {}, options = {}) {
  // Validar coordenadas
  const { error } = geoLocationService.validateCoordinates(coordinates);
  if (error) {
    throw Boom.badRequest(`Error en coordenadas GPS: ${error.message}`);
  }
  
  // Validar radio
  if (isNaN(radius) || radius <= 0 || radius > 100) {
    throw Boom.badRequest('El radio debe ser un número positivo entre 1 y 100 kilómetros');
  }
  
  // Procesar filtros especiales antes de pasarlos al repositorio
  const processedFilters = { ...filters };
  
  // Manejar filtros de rango de horario
  if (filters.abiertoDespuesDe || filters.abiertoAntesDe) {
    // Eliminar estos filtros del objeto ya que se manejarán de manera especial
    if (processedFilters.abiertoDespuesDe) delete processedFilters.abiertoDespuesDe;
    if (processedFilters.abiertoAntesDe) delete processedFilters.abiertoAntesDe;
  }
  
  // Obtener todos los centros con filtros básicos
  const result = await this.repo.findAll(processedFilters, options);
  
  // Aplicar filtros especiales post-consulta si existen
  let filteredItems = result.items;
  
  // Filtrar por horario de apertura/cierre (rangos)
  if (filters.abiertoDespuesDe || filters.abiertoAntesDe) {
    filteredItems = this._filterByHorario(
      filteredItems, 
      filters.abiertoDespuesDe, 
      filters.abiertoAntesDe
    );
  }
  
  // Filtrar por distancia y añadir la distancia a cada centro
  const centrosCercanos = geoLocationService.filterByDistance(
    filteredItems, 
    coordinates, 
    radius
  );
  
  // Actualizar la respuesta paginada
  return {
    ...result,
    items: centrosCercanos,
    count: centrosCercanos.length
  };
}

   // Método auxiliar para filtrar por rangos de horario
   _filterByHorario(centros, abiertoDespuesDe, abiertoAntesDe) {
    return centros.filter(centro => {
      // Convertir horarios a minutos desde medianoche para comparar
      const convertToMinutes = (timeStr) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const centroAperturaMinutos = convertToMinutes(centro.horarioApertura);
      const centroCierreMinutos = convertToMinutes(centro.horarioCierre);
      const despuesDeMinutos = convertToMinutes(abiertoDespuesDe);
      const antesDeMinutos = convertToMinutes(abiertoAntesDe);
      
      // Aplicar filtros según lo que se ha proporcionado
      let cumpleHorario = true;
      
      if (despuesDeMinutos !== null && centroAperturaMinutos !== null) {
        cumpleHorario = cumpleHorario && (centroAperturaMinutos <= despuesDeMinutos);
      }
      
      if (antesDeMinutos !== null && centroCierreMinutos !== null) {
        cumpleHorario = cumpleHorario && (centroCierreMinutos >= antesDeMinutos);
      }
      
      return cumpleHorario;
    });
  }
}

module.exports = new CentroDeportivoService();