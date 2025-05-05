// src/utils/fechas.js
const { zonedTimeToUtc, utcToZonedTime, format } = require('date-fns-tz');

const ZONA_GUAYAQUIL = 'America/Guayaquil';

/**
 * Normaliza fecha (YYYY-MM-DD) y hora (HH:mm) a la zona horaria de Guayaquil.
 * Devuelve un objeto Date en UTC que representa ese instante en Guayaquil.
 */
function normalizarFechaHoraGuayaquil(fecha, hora) {
  const fechaHoraLocal = `${fecha}T${hora}:00`;
  const zonedDate = zonedTimeToUtc(fechaHoraLocal, ZONA_GUAYAQUIL);
  return zonedDate;
}

/**
 * Formatea un objeto Date a HH:mm en zona Guayaquil
 */
function formatearHoraGuayaquil(dateObj) {
  return format(utcToZonedTime(dateObj, ZONA_GUAYAQUIL), 'HH:mm', { timeZone: ZONA_GUAYAQUIL });
}

module.exports = {
  normalizarFechaHoraGuayaquil,
  formatearHoraGuayaquil,
  ZONA_GUAYAQUIL
};