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
    const camposFaltantes = [];
    if (!userId) camposFaltantes.push('userId');
    if (!canchaId) camposFaltantes.push('canchaId');
    
    if (camposFaltantes.length > 0) {
      throw new Error(`Campos obligatorios faltantes: ${camposFaltantes.join(', ')}`);
    }

    // Validación específica para horarioIds
    if (!Array.isArray(horarioIds) || horarioIds.length === 0) {
      throw new Error('La reserva debe incluir al menos un horario');
    }
    if (horarioIds.length > 12) {
      throw new Error('No puedes reservar más de 12 horarios en una sola reserva');
    }

    this.reservaId = reservaId || `tmp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
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