//src/interfaces/middlewares/validarHorario.js
// Middleware para validar horarios en solicitudes HTTP
// Valida que hora < horaFin y que el formato sea HH:mm

function esHoraValida(hora) {
  // Formato HH:mm (24h)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(hora);
}

module.exports = function validarHorario(req, res, next) {
  const { horaInicio, horaFin, canchaId, fecha } = req.body;
  const metodo = req.method;
  
  // Para POST (crear nuevo), exigir todos los campos
  if (metodo === 'POST') {
    if (!canchaId || !fecha || !horaInicio || !horaFin) {
      return res.status(400).json({ error: 'Se requieren canchaId, fecha, horaInicio y horaFin.' });
    }
  }
  
  // Para PATCH (actualización parcial), validar solo los campos presentes
  if (metodo === 'PATCH') {
    // No validamos campos requeridos, solo los que están presentes
  }
  
  // Validar formato de horas si están presentes
  if (horaInicio && !esHoraValida(horaInicio)) {
    return res.status(400).json({ error: 'El formato de hora de inicio debe ser HH:mm.' });
  }
  
  if (horaFin && !esHoraValida(horaFin)) {
    return res.status(400).json({ error: 'El formato de hora de fin debe ser HH:mm.' });
  }
  
  // Validar que horaInicio < horaFin solo si ambos están presentes
  if (horaInicio && horaFin && horaInicio >= horaFin) {
    return res.status(400).json({ error: 'La hora de inicio debe ser menor que la de fin.' });
  }
  
  next();
};
