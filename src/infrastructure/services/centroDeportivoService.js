//src/infrastructure/services/centroDeportivoService.js
const CentroDeportivoRepository = require('../repositories/centroDeportivoRepository');
const CentroDeportivo = require('../../domain/entities/centro-deportivo');
const geoLocationService = require('./geoLocationService');
const Boom = require('@hapi/boom');
const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../repositories/userRepository');
const { sanitizeObject } = require('../../utils/sanitizeInput');
const AWS = require('aws-sdk');
const CentroImagenService = require('./centroDeportivo/centroImagenService');
const centroImagenService = new CentroImagenService(CentroDeportivoRepository);

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
    // Usar el método create en lugar de save
    const centro = await this.repo.create(new CentroDeportivo(datosCentro));

    // Si hay imágenes, procesarlas
    if (imagenes && imagenes.length > 0) {
      // Procesar cada imagen individualmente con el nuevo servicio refactorizado
      for (const imagen of imagenes) {
        await centroImagenService.addCentroImage(centro.centroId, imagen.buffer, imagen.originalname, centro.userId, 'admin_centro');
      }
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
      // Procesar cada imagen individualmente con el nuevo servicio refactorizado
      for (const imagen of imagenes) {
        await centroImagenService.addCentroImage(centroId, imagen.buffer, imagen.originalname, updateData.userId || centro.userId, 'admin_centro');
      }
    }

    return centroActualizado;
  }


  async deleteCentro(centroId) {
    try {
      // Validar el ID
      this.validateCentroId(centroId);
      
      // Obtener el centro para verificar si existe y obtener sus imágenes
      const centro = await this.getCentroById(centroId);
      
      // Verificar si el centro existe
      if (!centro) {
        throw Boom.notFound(`No se encontró ningún centro deportivo con el ID: ${centroId}`);
      }
      
      // Eliminar imágenes de S3 si existen
      if (centro.imagenes && centro.imagenes.length > 0) {
        // Extraer las claves de las imágenes (quitar la parte del dominio y el bucket)
        const imageKeys = centro.imagenes.map(url => {
          const key = url.split('/').slice(3).join('/');
          return { Key: key };
        });
        
        if (imageKeys.length > 0) {
          const s3 = new AWS.S3();
          const deleteParams = {
            Bucket: process.env.IMAGES_BUCKET || 'alquiler-canchas-imagenes-dev',
            Delete: {
              Objects: imageKeys
            }
          };
          await s3.deleteObjects(deleteParams).promise();
        }
      }
      
      // Eliminar el centro de la base de datos
      const result = await this.repo.delete(centroId);
      return { ...result, message: 'Centro deportivo eliminado correctamente' };
    } catch (error) {
      // Manejar errores específicos
      if (error.isBoom) {
        throw error; // Reenviar errores Boom ya formateados
      }
      
      // Manejar errores de AWS o de la base de datos
      console.error('Error al eliminar centro deportivo:', error);
      
      // Proporcionar mensajes de error más amigables
      if (error.name === 'ResourceNotFoundException') {
        throw Boom.notFound(`No se encontró ningún centro deportivo con el ID: ${centroId}`);
      } else if (error.name === 'ConditionalCheckFailedException') {
        throw Boom.preconditionFailed('No se puede eliminar el centro deportivo porque ha cambiado desde la última vez que se consultó');
      } else {
        throw Boom.badImplementation('Error al eliminar el centro deportivo. Por favor, inténtelo de nuevo más tarde.');
      }
    }
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