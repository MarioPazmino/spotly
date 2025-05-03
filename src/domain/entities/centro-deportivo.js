//src/domain/entities/centro-deportivo.js
class CentroDeportivo {
  constructor({
    centroId, // Identificador único del centro deportivo
    nombre, // Nombre comercial del centro
    direccion, // Dirección física completa
    telefonoPrincipal, // Número de contacto principal
    telefonoSecundario, // Número de contacto secundario (opcional)
    userId, // ID del usuario administrador (FK)
    horarioApertura, // Hora de inicio (formato HH:MM)
    horarioCierre, // Hora de cierre (formato HH:MM)
    ubicacionGPS, // Coordenadas para mapas {lat, lng}
    imagenes, // Array de URLs de imágenes
    servicios, // Lista de servicios adicionales
    estado, // Estado operativo: 'abierto', 'cerrado', etc.
    // Cuentas bancarias (array de objetos)
    bancos, // Array de cuentas bancarias
    cedulaJuridica, // RUC del centro deportivo (común a todas las cuentas)
    // Braintree
    braintreeMerchantId, // ID de la cuenta de Braintree del admin_centro
    braintreeAccountId, // ID de la cuenta bancaria en Braintree (opcional)
    braintreeStatus, // Estado de la cuenta: 'activa', 'pendiente', 'rechazada'
    // Redes sociales
    redesSociales, // Objeto con enlaces a redes sociales (opcional)
    // Cupones
    cupones, // Array de cuponId (referencias a CuponDescuento)
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.centroId = centroId;
    this.nombre = nombre;
    this.direccion = direccion;
    this.telefonoPrincipal = telefonoPrincipal;
    this.telefonoSecundario = telefonoSecundario || null; // Opcional, null por defecto
    this.userId = userId;
    this.horarioApertura = horarioApertura || '08:00'; // Horario predeterminado
    this.horarioCierre = horarioCierre || '22:00'; // Horario predeterminado
    this.ubicacionGPS = ubicacionGPS || { lat: 0, lng: 0 }; // Coordenadas por defecto
    this.imagenes = imagenes || []; // Array vacío por defecto
    this.servicios = servicios || []; // Array vacío por defecto
    this.estado = estado || 'abierto'; // Por defecto está abierto
    // Cuentas bancarias
    this.bancos = bancos || []; // Array vacío por defecto
    this.cedulaJuridica = cedulaJuridica || null; // RUC del centro
    // Braintree
    this.braintreeMerchantId = braintreeMerchantId || null; // Nulo si no está vinculada
    this.braintreeAccountId = braintreeAccountId || null; // Opcional
    this.braintreeStatus = braintreeStatus || 'pendiente'; // Estado inicial
    // Redes sociales
    this.redesSociales = redesSociales || {}; // Objeto vacío por defecto
    // Cupones
    this.cupones = cupones || []; // Array vacío por defecto
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = CentroDeportivo;