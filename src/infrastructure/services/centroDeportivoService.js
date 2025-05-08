//src/infrastructure/services/centroDeportivoService.js
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const CentroDeportivo = require('../../domain/entities/centro-deportivo');
const geoLocationService = require('./geoLocationService');
const Boom = require('@hapi/boom');
const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/userRepository');
const { sanitizeObject } = require('../../utils/sanitizeInput');
const AWS = require('aws-sdk');
const imagenCentroService = require('./imagenCentroService');

class CentroDeportivoService {
  constructor() {
    // Ambos repositorios ya son instancias, no necesitamos usar 'new'
    this.repo = CentroDeportivoRepository;
    this.userRepo = UserRepository;
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
    
    // Convertir solo keys S3 válidas a presigned URLs
    filteredItems = filteredItems.map(centro => {
      centro.imagenes = (centro.imagenes || [])
        .filter(img => typeof img === 'string' && img.startsWith('centros/'))
        .map(key => getPresignedUrl(key));
      return centro;
    });
    
    // Actualizar los resultados con los ítems filtrados
    return {
      ...result,
      items: filteredItems,
      count: filteredItems.length
    };
  }


  async createCentro(centroData) {
    // Validar datos básicos
    if (!centroData.nombre || !centroData.direccion) {
      throw new Error('Nombre y dirección son requeridos');
    }

    // Crear centro sin imágenes inicialmente
    const { imagenes, ...datosCentro } = centroData;
    const centro = await this.repo.save(new CentroDeportivo(datosCentro));

    // Si hay imágenes, procesarlas
    if (imagenes && imagenes.length > 0) {
      await imagenCentroService.agregarImagenes(centro.centroId, imagenes);
    }

    return centro;
  }

  async getCentroById(centroId) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    const centro = await this.repo.findById(centroId);
    if (!centro) throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    // Solo retornar presigned URLs para keys de S3 válidas
    centro.imagenes = (centro.imagenes || [])
      .filter(img => typeof img === 'string' && img.startsWith('centros/'))
      .map(key => getPresignedUrl(key));
    return centro;
  }

  async updateCentro(centroId, updateData) {
    // Validar que el centro existe
    const centro = await this.getCentroById(centroId);
    if (!centro) {
      throw new Error('Centro deportivo no encontrado');
    }

    // Separar imágenes del resto de datos
    const { imagenes, ...datosActualizacion } = updateData;

    // Actualizar datos básicos
    const centroActualizado = await this.repo.update(centroId, datosActualizacion);

    // Si hay imágenes, procesarlas
    if (imagenes && imagenes.length > 0) {
      await imagenCentroService.agregarImagenes(centroId, imagenes);
    }

    return centroActualizado;
  }


  async deleteCentro(centroId) {
    // Validar formato del ID
    this.validateCentroId(centroId);
    // Verificar que el centro existe
    const existingCentro = await this.repo.findById(centroId);
    if (!existingCentro) {
      throw Boom.notFound(`Centro deportivo con ID ${centroId} no encontrado`);
    }
    // Eliminar imágenes en S3 si existen
    if (existingCentro.imagenes && Array.isArray(existingCentro.imagenes)) {
      const s3Keys = existingCentro.imagenes.filter(img => typeof img === 'string' && img.startsWith('centros/'));
      if (s3Keys.length > 0) {
        const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
        const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
        const deleteParams = {
          Bucket: BUCKET,
          Delete: {
            Objects: s3Keys.map(Key => ({ Key })),
            Quiet: true
          }
        };
        await s3.deleteObjects(deleteParams).promise();
      }
    }
    // Eliminar el centro de la base de datos
    return await this.repo.delete(centroId);
  }

  // NUEVO MÉTODO: Buscar centros cercanos por ubicación GPS
  async findCentrosByLocation(coordinates, radius = 5, filters = {}, options = {}) {
    // Validar coordenadas
    const { error } = geoLocationService.validateCoordinates(coordinates);
    if (error) {
      throw Boom.badRequest(`Error en coordenadas GPS: ${error.message}`);
    }
    if (isNaN(radius) || radius <= 0 || radius > 100) {
      throw Boom.badRequest('El radio debe ser un número positivo entre 1 y 100 kilómetros');
    }

    // 1. Calcular bounding box
    const bbox = geoLocationService.calculateBoundingBox(coordinates, radius);

    // 2. Agregar filtro de bounding box a los filtros existentes
    const processedFilters = { ...filters };
    processedFilters._boundingBox = bbox;

    // Manejar filtros de rango de horario
    if (filters.abiertoDespuesDe || filters.abiertoAntesDe) {
      if (processedFilters.abiertoDespuesDe) delete processedFilters.abiertoDespuesDe;
      if (processedFilters.abiertoAntesDe) delete processedFilters.abiertoAntesDe;
    }

    // 3. Obtener todos los centros con filtros básicos
    const result = await this.repo.findAll(processedFilters, options);

    // 4. Filtrar por horario de apertura/cierre (rangos)
    let filteredItems = result.items;
    
    // Filtrar por horario de apertura/cierre (rangos)
    if (filters.abiertoDespuesDe || filters.abiertoAntesDe) {
      filteredItems = this._filterByHorario(
        filteredItems, 
        filters.abiertoDespuesDe, 
        filters.abiertoAntesDe
      );
    }
    
    // 5. Filtrar por bounding box en memoria (si no se puede en DynamoDB)
    filteredItems = filteredItems.filter(item => {
      if (!item.ubicacionGPS) return false;
      const lat = item.ubicacionGPS.lat;
      const lng = item.ubicacionGPS.lng;
      return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
    });

    // 6. Filtrar por distancia precisa y añadir la distancia a cada centro
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
      
      const centroAperturaMinutos = convertToMinutes(centro.horaAperturaMinima);
      const centroCierreMinutos = convertToMinutes(centro.horaCierreMaxima);
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
}

// Función auxiliar para calcular los campos auxiliares de horario
function calcularHorasMinMax(horario) {
  if (!Array.isArray(horario) || horario.length === 0) return { horaAperturaMinima: null, horaCierreMaxima: null };
  // Asume formato 'HH:mm' y ordena correctamente
  const horasApertura = horario.map(h => h.abre).sort();
  const horasCierre = horario.map(h => h.cierra).sort();
  return {
    horaAperturaMinima: horasApertura[0],
    horaCierreMaxima: horasCierre[horasCierre.length - 1]
  };
}

// Función auxiliar para obtener presigned URLs de S3
function getPresignedUrl(key) {
  const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
  const BUCKET = process.env.IMAGENES_CENTROS_BUCKET || `spotly-centros-imagenes-dev`;
  const params = {
    Bucket: BUCKET,
    Key: key,
    Expires: 3600 // 1 hora
  };
  return s3.getSignedUrl('getObject', params);
}

module.exports = new CentroDeportivoService();