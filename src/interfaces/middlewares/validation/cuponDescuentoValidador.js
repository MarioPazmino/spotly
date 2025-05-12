/**
 * Módulo de validación para cupones de descuento
 * Responsabilidad única: validar datos de entrada para las operaciones CRUD de cupones
 */

/**
 * Valida los datos para crear un cupón
 * @param {Object} body - Datos del cupón a crear
 * @returns {Object} - Resultado de validación { valido: boolean, error: Object|null }
 */
function validarCrearCupon(body) {
  try {
    const { codigo, centroId, maximoUsos, valor, tipoDescuento, fechaInicio, fechaFin } = body;
    
    // Verificar campos requeridos
    if (!codigo) {
      return crearError(400, 'MISSING_CODE', 'El código del cupón es requerido');
    }
    
    if (!centroId) {
      return crearError(400, 'MISSING_CENTRO_ID', 
        'El ID del centro deportivo es requerido',
        {
          ejemplo: {
            "centroId": "uuid-del-centro",
            "codigo": "VERANO2025",
            "tipoDescuento": "porcentaje",
            "valor": 10,
            "fechaInicio": "2025-06-01T00:00:00Z",
            "fechaFin": "2025-08-31T23:59:59Z",
            "maximoUsos": 5
          }
        }
      );
    }
    
    // Validar tipo de descuento
    if (tipoDescuento && !['porcentaje', 'monto'].includes(tipoDescuento)) {
      return crearError(400, 'INVALID_DISCOUNT_TYPE', 
        'Tipo de descuento inválido', 
        { 
          valorRecibido: tipoDescuento,
          valoresPermitidos: ['porcentaje', 'monto']
        }
      );
    }
    
    // Validar fechas
    const errorFechas = validarFechas(fechaInicio, fechaFin);
    if (errorFechas) return errorFechas;
    
    // Validar máximo de usos
    const errorMaxUsos = validarMaximoUsos(maximoUsos);
    if (errorMaxUsos) return errorMaxUsos;
    
    // Validar valor del descuento
    const errorValor = validarValorDescuento(valor, tipoDescuento);
    if (errorValor) return errorValor;
    
    // Si todo es válido
    return { valido: true, error: null };
  } catch (error) {
    return crearError(400, 'VALIDATION_ERROR', 
      'Error al validar los datos del cupón', 
      { error: error.message }
    );
  }
}

/**
 * Valida los datos para actualizar un cupón
 * @param {Object} body - Datos del cupón a actualizar
 * @returns {Object} - Resultado de validación { valido: boolean, error: Object|null }
 */
function validarActualizarCupon(body) {
  try {
    const { codigo, maximoUsos, valor, tipoDescuento, fechaInicio, fechaFin } = body;
    
    // Verificar si el body está vacío o no es un objeto
    if (!body || Object.keys(body).length === 0) {
      return crearError(400, 'EMPTY_REQUEST', 
        'Es necesario proporcionar al menos un campo para actualizar'
      );
    }
    
    if (!codigo) {
      return crearError(400, 'MISSING_CODE', 
        'El campo codigo no se encontró en el cuerpo de la solicitud',
        { bodyRecibido: body }
      );
    }
    
    // Validar fechas
    if (fechaInicio || fechaFin) {
      const errorFechas = validarFechas(fechaInicio, fechaFin);
      if (errorFechas) return errorFechas;
    }
    
    // Validar máximo de usos
    if (maximoUsos !== undefined) {
      const errorMaxUsos = validarMaximoUsos(maximoUsos);
      if (errorMaxUsos) return errorMaxUsos;
    }
    
    // Validar valor y tipo de descuento
    if (valor !== undefined || tipoDescuento) {
      const errorValor = validarValorDescuento(valor, tipoDescuento);
      if (errorValor) return errorValor;
    }
    
    // Si todo es válido
    return { valido: true, error: null };
  } catch (error) {
    return crearError(400, 'VALIDATION_ERROR', 
      'Error al validar los datos del cupón', 
      { error: error.message }
    );
  }
}

/**
 * Valida fechas de inicio y fin del cupón
 * @param {string} fechaInicio - Fecha de inicio 
 * @param {string} fechaFin - Fecha de fin
 * @returns {Object|null} - Error o null si es válido
 */
function validarFechas(fechaInicio, fechaFin) {
  if (fechaInicio && fechaFin) {
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    
    if (isNaN(fechaInicioObj.getTime()) || isNaN(fechaFinObj.getTime())) {
      return crearError(400, 'INVALID_DATE_FORMAT', 
        'Las fechas deben estar en formato ISO (YYYY-MM-DDTHH:MM:SSZ)'
      );
    }
    
    if (fechaInicioObj >= fechaFinObj) {
      return crearError(400, 'INVALID_DATE_RANGE', 
        'La fecha de inicio debe ser anterior a la fecha de fin'
      );
    }
    
    // Validar que la fecha de inicio no sea muy antigua
    const fechaMinima = new Date();
    fechaMinima.setFullYear(fechaMinima.getFullYear() - 5); // 5 años atrás
    
    if (fechaInicioObj < fechaMinima) {
      return crearError(400, 'DATE_TOO_OLD', 
        'La fecha de inicio no puede ser más antigua que 5 años atrás',
        { fechaMinima: fechaMinima.toISOString() }
      );
    }
    
    // Validar que la fecha de fin no sea muy futura
    const fechaMaxima = new Date();
    fechaMaxima.setFullYear(fechaMaxima.getFullYear() + 10); // 10 años adelante
    
    if (fechaFinObj > fechaMaxima) {
      return crearError(400, 'DATE_TOO_FAR_FUTURE', 
        'La fecha de fin no puede ser más de 10 años en el futuro',
        { fechaMaxima: fechaMaxima.toISOString() }
      );
    }
  }
  
  return null;
}

/**
 * Valida el máximo de usos del cupón
 * @param {number} maximoUsos - Número máximo de usos 
 * @returns {Object|null} - Error o null si es válido
 */
function validarMaximoUsos(maximoUsos) {
  if (maximoUsos !== undefined) {
    const maxUsosNum = Number(maximoUsos);
    if (isNaN(maxUsosNum) || maxUsosNum < 1) {
      return crearError(400, 'INVALID_MAX_USES', 
        'El número máximo de usos debe ser un número positivo'
      );
    }
    
    if (maxUsosNum > 10) {
      return crearError(400, 'MAX_USES_EXCEEDED', 
        'El número máximo de usos no puede ser mayor a 10'
      );
    }
  }
  
  return null;
}

/**
 * Valida el valor y tipo de descuento
 * @param {number} valor - Valor del descuento
 * @param {string} tipoDescuento - Tipo de descuento (porcentaje/monto)
 * @returns {Object|null} - Error o null si es válido
 */
function validarValorDescuento(valor, tipoDescuento) {
  if (valor !== undefined) {
    const valorNum = Number(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return crearError(400, 'INVALID_VALUE', 
        'El valor del descuento debe ser un número positivo'
      );
    }
    
    // Validación adicional para porcentaje
    if (tipoDescuento === 'porcentaje' && valorNum > 100) {
      return crearError(400, 'INVALID_PERCENTAGE', 
        'El porcentaje de descuento no puede ser mayor a 100%'
      );
    }
  }
  
  return null;
}

/**
 * Crea un objeto de error estandarizado
 * @param {number} status - Código HTTP
 * @param {string} code - Código de error
 * @param {string} message - Mensaje de error
 * @param {Object} detalles - Detalles adicionales
 * @returns {Object} - Objeto de error
 */
function crearError(status, code, message, detalles = {}) {
  return {
    valido: false,
    error: {
      status,
      code,
      message,
      detalles
    }
  };
}

module.exports = {
  validarCrearCupon,
  validarActualizarCupon,
  validarFechas,
  validarMaximoUsos,
  validarValorDescuento
}; 