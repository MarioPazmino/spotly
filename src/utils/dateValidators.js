/**
 * Valida si una fecha está en formato YYYY-MM-DD
 * @param {string} fecha - La fecha a validar
 * @returns {boolean} - true si la fecha es válida, false en caso contrario
 */
function validateDates(fecha) {
  if (!fecha || typeof fecha !== 'string') {
    return false;
  }
  
  // Validar formato YYYY-MM-DD
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) {
    return false;
  }
  
  // Validar que sea una fecha válida
  const parts = fecha.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Meses en JS son 0-11
  const day = parseInt(parts[2], 10);
  
  const dateObj = new Date(year, month, day);
  
  // Verificar que la fecha es válida comprobando que al reconstruirla da el mismo resultado
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month &&
    dateObj.getDate() === day
  );
}

/**
 * Valida si una hora está en formato HH:MM
 * @param {string} hora - La hora a validar
 * @returns {boolean} - true si la hora es válida, false en caso contrario
 */
function validateTime(hora) {
  if (!hora || typeof hora !== 'string') {
    return false;
  }
  
  // Validar formato HH:MM
  const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(hora);
}

/**
 * Valida si una hora de inicio es anterior a una hora de fin
 * @param {string} horaInicio - Hora de inicio en formato HH:MM
 * @param {string} horaFin - Hora de fin en formato HH:MM
 * @returns {boolean} - true si horaInicio < horaFin, false en caso contrario
 */
function validateTimeRange(horaInicio, horaFin) {
  if (!validateTime(horaInicio) || !validateTime(horaFin)) {
    return false;
  }
  
  return horaInicio < horaFin;
}

/**
 * Convierte una hora en formato HH:MM a minutos desde medianoche
 * @param {string} hora - Hora en formato HH:MM
 * @returns {number} - Minutos desde medianoche
 */
function convertirHoraAMinutos(hora) {
  if (!validateTime(hora)) {
    return 0;
  }
  
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

module.exports = {
  validateDates,
  validateTime,
  validateTimeRange,
  convertirHoraAMinutos
}; 