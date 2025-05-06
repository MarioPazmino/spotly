// src/domain/entities/centro-deportivo.js
class CentroDeportivo {
  constructor({
    centroId, // Identificador único del centro deportivo
    nombre, // Nombre comercial del centro
    direccion, // Dirección física completa
    telefonoPrincipal, // Número de contacto principal
    telefonoSecundario, // Número de contacto secundario (opcional)
    userId, // ID del usuario administrador (FK)
    horario, // Horario flexible por día (array de objetos)
    ubicacionGPS, // Coordenadas para mapas {lat, lng}
    imagenes, // Array de URLs de imágenes
    servicios, // Lista de servicios adicionales
    estado, // Estado operativo: 'abierto', 'cerrado', etc.
    // Cuentas bancarias (array de objetos)
    bancos, // Array de cuentas bancarias
    cedulaJuridica, // RUC del centro deportivo (no es obligatorio)
    // Braintree
    braintreeMerchantId, // ID de la cuenta de Braintree del centro deportivo
    braintreeStatus, // Estado de la cuenta: 'activa', 'pendiente', 'rechazada'
    // Redes sociales
    redesSociales, // Objeto con enlaces a redes sociales (opcional)
    horaAperturaMinima, // Hora de apertura mínima (formato HH:MM)
    horaCierreMaxima, // Hora de cierre máxima (formato HH:MM)
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.centroId = centroId;
    this.nombre = nombre;
    this.direccion = direccion;
    this.telefonoPrincipal = telefonoPrincipal;
    this.telefonoSecundario = telefonoSecundario || null; // Opcional, null por defecto
    // --- NUEVOS CAMPOS AUXILIARES PARA FILTRO DE HORARIO ---
    // Forzar formato HH:mm (sin segundos)
    this.horaAperturaMinima = (typeof horaAperturaMinima === 'string' && horaAperturaMinima.length === 5) ? horaAperturaMinima : null;
    this.horaCierreMaxima = (typeof horaCierreMaxima === 'string' && horaCierreMaxima.length === 5) ? horaCierreMaxima : null;
    this.userId = userId;
    // --- HORARIO FLEXIBLE POR DÍA ---
    this.horario = horario || [];
    this.ubicacionGPS = ubicacionGPS || { lat: 0, lng: 0 }; // Coordenadas por defecto
    this.imagenes = imagenes || []; // Array vacío por defecto
    this.estado = estado || 'abierto'; // Por defecto está abierto
    // Cuentas bancarias
    this.bancos = bancos || []; // Array vacío por defecto
    this.cedulaJuridica = cedulaJuridica || null; // RUC del centro

    // Braintree
    this.braintreeMerchantId = braintreeMerchantId || null; // Nulo si no está vinculada
    this.braintreeStatus = braintreeStatus || 'pendiente'; // Estado inicial

    // Validar y limpiar servicios (sin duplicados, solo strings, sin espacios extra)
    if (Array.isArray(servicios)) {
      this.servicios = [...new Set(servicios.map(s => typeof s === 'string' ? s.trim().toLowerCase() : ''))].filter(Boolean);
    } else {
      this.servicios = [];
    }

    // Redes sociales
    this.redesSociales = redesSociales || {}; // Objeto vacío por defecto
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }
}

module.exports = CentroDeportivo;