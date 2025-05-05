// src/interfaces/middlewares/validarCuponDescuento.js
// Middleware para validar cupones de descuento en solicitudes HTTP

function esCodigoValido(codigo) {
  // Solo letras, números, guiones, 5-20 caracteres
  return /^[A-Z0-9\-]{5,20}$/i.test(codigo);
}

module.exports = function validarCuponDescuento(req, res, next) {
  const { centroId, codigo, tipoDescuento, valor, fechaInicio, fechaFin, maximoUsos } = req.body;

  if (!centroId || !codigo || !tipoDescuento || valor === undefined || !fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Se requieren centroId, codigo, tipoDescuento, valor, fechaInicio y fechaFin.' });
  }
  if (!esCodigoValido(codigo)) {
    return res.status(400).json({ error: 'El código del cupón no es válido.' });
  }
  if (!["porcentaje", "monto_fijo"].includes(tipoDescuento)) {
    return res.status(400).json({ error: 'tipoDescuento debe ser "porcentaje" o "monto_fijo".' });
  }
  if (typeof valor !== 'number' || valor <= 0) {
    return res.status(400).json({ error: 'El valor del descuento debe ser un número positivo.' });
  }
  // Validar fechas formato ISO simple
  if (!/^\d{4}-\d{2}-\d{2}/.test(fechaInicio) || !/^\d{4}-\d{2}-\d{2}/.test(fechaFin)) {
    return res.status(400).json({ error: 'Las fechas deben tener formato YYYY-MM-DD.' });
  }
  // Validar que fechaFin sea posterior a fechaInicio
  if (new Date(fechaFin) <= new Date(fechaInicio)) {
    return res.status(400).json({ error: 'fechaFin debe ser posterior a fechaInicio.' });
  }
  // Validar formato de fechaInicio y fechaFin (YYYY-MM-DDTHH:mmZ)
  // Permitir fechaInicio y fechaFin como YYYY-MM-DD o YYYY-MM-DDTHH:mmZ
  const isoFecha = /^\d{4}-\d{2}-\d{2}$/;
  const isoSinSegundos = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/;
  if (req.body.fechaInicio) {
    if (isoFecha.test(req.body.fechaInicio)) {
      req.body.fechaInicio = req.body.fechaInicio + 'T00:00Z';
    } else if (!isoSinSegundos.test(req.body.fechaInicio)) {
      return res.status(400).json({ error: 'fechaInicio debe tener formato YYYY-MM-DD o YYYY-MM-DDTHH:mmZ (sin segundos).' });
    }
  }
  if (req.body.fechaFin) {
    if (isoFecha.test(req.body.fechaFin)) {
      req.body.fechaFin = req.body.fechaFin + 'T23:59Z';
    } else if (!isoSinSegundos.test(req.body.fechaFin)) {
      return res.status(400).json({ error: 'fechaFin debe tener formato YYYY-MM-DD o YYYY-MM-DDTHH:mmZ (sin segundos).' });
    }
  }
  // Validar tipoDescuento y valor
  if (tipoDescuento === 'porcentaje') {
    if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
      return res.status(400).json({ error: 'Si tipoDescuento es "porcentaje", valor debe ser un entero entre 1 y 100.' });
    }
  } else if (tipoDescuento === 'monto_fijo') {
    if (typeof valor !== 'number' || valor <= 0) {
      return res.status(400).json({ error: 'Si tipoDescuento es "monto_fijo", valor debe ser un número mayor a 0.' });
    }
  }

  // Validar que maximoUsos sea entero y >= 1 si está presente
  if (maximoUsos !== undefined && (!Number.isInteger(maximoUsos) || maximoUsos < 1)) {
    return res.status(400).json({ error: 'maximoUsos debe ser un entero mayor o igual a 1.' });
  }
  // Validar que usosRestantes no sea negativo ni mayor que maximoUsos
  if (req.body.usosRestantes !== undefined) {
    if (req.body.usosRestantes < 0) {
      return res.status(400).json({ error: 'usosRestantes no puede ser negativo.' });
    }
    if (maximoUsos !== undefined && req.body.usosRestantes > maximoUsos) {
      return res.status(400).json({ error: 'usosRestantes no puede ser mayor que maximoUsos.' });
    }
  }
  next();
};
