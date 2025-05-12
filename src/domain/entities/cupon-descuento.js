// src/domain/entities/cupon-descuento.js
class CuponesDescuento {
    constructor({
      cuponId, // ID único del cupón
      centroId, // ID del centro que creó el cupón
      codigo, // Código del cupón (ej.: "DESCUENTO10")
      tipoDescuento, // "porcentaje" o "monto_fijo"
      valor, // Valor del descuento (ej.: 10% o $5)
      fechaInicio, // Fecha de inicio de validez (formato ISO: '2025-04-01T09:00Z')
      fechaFin,    // Fecha de fin de validez (formato ISO: '2025-04-07T23:59Z')
      maximoUsos, // Número máximo de veces que puede usar CADA USUARIO
      usuariosUsos = {}, // Mapa de userId -> número de usos
      createdAt, // Fecha de creación
      updatedAt // Fecha de última actualización
    }) {
      this.cuponId = cuponId;
      this.centroId = centroId;
      this.codigo = codigo;
      this.tipoDescuento = tipoDescuento; // "porcentaje" o "monto_fijo"
      this.valor = valor; // Ej.: 10 (10%) o 5 (5 USD)
      this.fechaInicio = fechaInicio; // Formato ISO: '2025-04-01T09:00Z'
      this.fechaFin = fechaFin;     // Formato ISO: '2025-04-07T23:59Z'
      if (!Number.isInteger(maximoUsos) || maximoUsos < 1) {
        throw new Error('maximoUsos debe ser un entero mayor o igual a 1');
      }
      this.maximoUsos = maximoUsos;
      this.usuariosUsos = usuariosUsos;
      this.createdAt = createdAt || new Date().toISOString();
      this.updatedAt = updatedAt || new Date().toISOString();
    }

    calcularDescuento(total) {
      if (this.tipoDescuento === 'porcentaje') {
        return Math.round((total * this.valor) / 100);
      } else if (this.tipoDescuento === 'monto_fijo') {
        return this.valor;
      }
      return 0;
    }

    // Método para verificar si un usuario puede usar el cupón
    puedeUsarCupon(userId) {
      const usosUsuario = this.usuariosUsos[userId] || 0;
      return usosUsuario < this.maximoUsos;
    }

    // Método para obtener el número de usos de un usuario
    getUsosUsuario(userId) {
      return this.usuariosUsos[userId] || 0;
    }
  }
  module.exports = CuponesDescuento;