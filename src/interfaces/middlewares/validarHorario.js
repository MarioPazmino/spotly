//src/interfaces/middlewares/validarHorario.js
// Middleware para validar horarios en solicitudes HTTP
// Valida que horaApertura < horaCierre y que el formato sea HH:mm

function esHoraValida(hora) {
  // Formato HH:mm (24h)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(hora);
}

module.exports = function validarHorario(req, res, next) {
  const { horaApertura, horaCierre } = req.body;

  if (!horaApertura || !horaCierre) {
    return res.status(400).json({ error: 'Se requieren horaApertura y horaCierre.' });
  }

  if (!esHoraValida(horaApertura) || !esHoraValida(horaCierre)) {
    return res.status(400).json({ error: 'El formato de hora debe ser HH:mm.' });
  }

  if (horaApertura >= horaCierre) {
    return res.status(400).json({ error: 'La hora de apertura debe ser menor que la de cierre.' });
  }

  next();
};
