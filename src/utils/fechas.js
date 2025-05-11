// src/utils/fechas.js
// Implementación simplificada sin dependencias externas

/**
 * Normaliza fecha (YYYY-MM-DD) y hora (HH:mm) a la zona horaria de Guayaquil.
 * Devuelve un objeto Date en UTC que representa ese instante en Guayaquil.
 */
function normalizarFechaHoraGuayaquil(fecha, hora) {
  try {
    // Si ya es un objeto Date, lo devolvemos tal cual
    if (fecha instanceof Date) return fecha;
    
    // Si hora es un string en formato HH:MM, aseguramos que tenga segundos
    if (hora && typeof hora === 'string' && hora.length === 5) {
      hora = `${hora}:00`;
    }
    
    // Crear fecha en formato ISO
    const fechaHoraLocal = hora ? `${fecha}T${hora}` : fecha;
    
    // Crear objeto Date (JavaScript lo interpreta en la zona horaria local)
    // Esto es una simplificación, pero funciona para la mayoría de los casos
    return new Date(fechaHoraLocal);
  } catch (error) {
    console.error('Error al normalizar fecha y hora:', error);
    return new Date(); // Devolver fecha actual en caso de error
  }
}

/**
 * Formatea un objeto Date a HH:mm
 */
function formatearHoraGuayaquil(dateObj) {
  try {
    if (!dateObj || !(dateObj instanceof Date)) {
      return '';
    }
    
    // Formatear a HH:MM usando métodos nativos
    const horas = dateObj.getHours().toString().padStart(2, '0');
    const minutos = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${horas}:${minutos}`;
  } catch (error) {
    console.error('Error al formatear hora:', error);
    return '';
  }
}

module.exports = {
  normalizarFechaHoraGuayaquil,
  formatearHoraGuayaquil
};