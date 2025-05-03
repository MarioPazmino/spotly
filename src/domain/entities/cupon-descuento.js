// src/domain/entities/cupon-descuento.js
class CuponDescuento {
    constructor({
      cuponId, // ID único del cupón
      centroDeportivoId, // ID del centro que creó el cupón
      codigo, // Código del cupón (ej.: "DESCUENTO10")
      tipoDescuento, // "porcentaje" o "monto_fijo"
      valor, // Valor del descuento (ej.: 10% o $5)
      fechaInicio, // Fecha de inicio de validez
      fechaFin, // Fecha de fin de validez
      maximoUsos, // Número máximo de veces que se puede usar
      usosRestantes, // Número de usos restantes
      createdAt, // Fecha de creación
      updatedAt // Fecha de última actualización
    }) {
      this.cuponId = cuponId;
      this.centroDeportivoId = centroDeportivoId;
      this.codigo = codigo;
      this.tipoDescuento = tipoDescuento; // "porcentaje" o "monto_fijo"
      this.valor = valor; // Ej.: 10 (10%) o 5 (5 USD)
      this.fechaInicio = fechaInicio; // Formato ISO: "2025-04-01T00:00:00Z"
      this.fechaFin = fechaFin; // Formato ISO: "2025-04-30T23:59:59Z"
      this.maximoUsos = maximoUsos || 1; // Por defecto es 1 uso
      this.usosRestantes = usosRestantes || this.maximoUsos; // Inicializa con el máximo de usos
      this.createdAt = createdAt || new Date().toISOString();
      this.updatedAt = updatedAt || new Date().toISOString();
    }
  }
  module.exports = CuponDescuento;