//src/interfaces/middlewares/validarHorario.js
// Middleware para validar horarios en solicitudes HTTP
// Valida que hora < horaFin y que el formato sea HH:mm

function esHoraValida(hora) {
  // Formato HH:mm (24h)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(hora);
}

module.exports = function validarHorario(req, res, next) {
  const { horaInicio, horaFin, canchaId, fecha } = req.body;

  if (!canchaId || !fecha || !horaInicio || !horaFin) {
    return res.status(400).json({ error: 'Se requieren canchaId, fecha, horaInicio y horaFin.' });
  }

  if (!esHoraValida(horaInicio) || !esHoraValida(horaFin)) {
    return res.status(400).json({ error: 'El formato de hora debe ser HH:mm.' });
  }

  if (horaInicio >= horaFin) {
    return res.status(400).json({ error: 'La hora de inicio debe ser menor que la de fin.' });
  }

  next();
};
