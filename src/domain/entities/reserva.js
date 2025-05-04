// src/domain/entities/reserva.js
class Reserva {
  constructor({
    reservaId, // Identificador único de la reserva
    userId, // ID del usuario que reserva (FK)
    canchaId, // ID de la cancha reservada (FK)
    horarioIds, // Array de IDs de horarios asociados (FK) ✅ UNO-A-MUCHOS
    estado, // Estado: "Pendiente", "Pagado", "Cancelado"
    total, // Monto total a pagar
    notas, // Instrucciones especiales o comentarios
    codigoPromoAplicado, // Código del cupón (ej.: "DESCUENTO10")
    descuentoAplicado, // Monto del descuento aplicado (ej.: $5)
    cancelacionMotivo, // Razón de cancelación, si aplica
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    // Validación de campos obligatorios
    if (!reservaId || !userId || !canchaId) {
      throw new Error('Campos obligatorios faltantes: reservaId, userId, canchaId');
    }

    // Validación específica para horarioIds
    if (!Array.isArray(horarioIds) || horarioIds.length === 0) {
      throw new Error('La reserva debe incluir al menos un horario');
    }

    this.reservaId = reservaId;
    this.userId = userId;
    this.canchaId = canchaId;
    this.horarioIds = horarioIds; // Ya validado que es un array no vacío
    this.estado = estado || 'Pendiente'; // Valor por defecto
    this.total = total || 0; // Valor por defecto
    this.notas = notas || ''; // Cadena vacía por defecto
    this.codigoPromoAplicado = codigoPromoAplicado || null; // Nulo si no hay promoción
    this.descuentoAplicado = descuentoAplicado || 0; // Monto del descuento aplicado
    this.cancelacionMotivo = cancelacionMotivo || null; // Nulo si no fue cancelada
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = Reserva;