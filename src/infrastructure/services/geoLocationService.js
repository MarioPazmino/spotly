// src/infrastructure/services/geoLocationService.js
const Joi = require('joi');

class GeoLocationService {
  /**
   * Calcula la distancia en kilómetros entre dos puntos de coordenadas GPS
   * utilizando la fórmula de Haversine
   * 
   * @param {Object} point1 - Primer punto {lat, lng}
   * @param {Object} point2 - Segundo punto {lat, lng}
   * @returns {Number} Distancia en kilómetros
   */
  calculateDistance(point1, point2) {
    // Radio de la Tierra en kilómetros
    const earthRadius = 6371;
    
    // Convertir grados a radianes
    const lat1 = this.toRadians(point1.lat);
    const lng1 = this.toRadians(point1.lng);
    const lat2 = this.toRadians(point2.lat);
    const lng2 = this.toRadians(point2.lng);
    
    // Diferencias de coordenadas
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    
    // Fórmula de Haversine
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = earthRadius * c;
    
    return distance;
  }
  
  /**
   * Convierte grados a radianes
   * 
   * @param {Number} degrees - Grados
   * @returns {Number} Radianes
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Valida que unas coordenadas GPS estén en un rango válido
   * 
   * @param {Object} coordinates - Coordenadas {lat, lng}
   * @returns {Object} Resultado de validación
   */
  validateCoordinates(coordinates) {
    const schema = Joi.object({
      lat: Joi.number().min(-90).max(90).required()
        .messages({
          'number.min': 'La latitud debe estar entre -90 y 90 grados',
          'number.max': 'La latitud debe estar entre -90 y 90 grados',
          'any.required': 'La latitud es requerida'
        }),
      lng: Joi.number().min(-180).max(180).required()
        .messages({
          'number.min': 'La longitud debe estar entre -180 y 180 grados',
          'number.max': 'La longitud debe estar entre -180 y 180 grados',
          'any.required': 'La longitud es requerida'
        })
    });
    
    return schema.validate(coordinates);
  }
  
  /**
   * Filtra una lista de centros deportivos por distancia máxima desde un punto
   * 
   * @param {Array} centros - Lista de centros deportivos
   * @param {Object} origin - Punto de origen {lat, lng}
   * @param {Number} maxDistance - Distancia máxima en kilómetros
   * @returns {Array} Centros filtrados con campo de distancia añadido
   */
  filterByDistance(centros, origin, maxDistance) {
    return centros
      .filter(centro => centro.ubicacionGPS && centro.ubicacionGPS.lat && centro.ubicacionGPS.lng)
      .map(centro => {
        const distance = this.calculateDistance(origin, centro.ubicacionGPS);
        return { ...centro, distance };
      })
      .filter(centro => centro.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);
  }
}

module.exports = new GeoLocationService();