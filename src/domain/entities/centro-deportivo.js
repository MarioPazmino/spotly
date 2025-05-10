// src/domain/entities/centro-deportivo.js
class CentroDeportivo {
  /**
   * Calcula la hora de apertura mínima entre todos los días de la semana
   * @param {Array} horario - Array de objetos con horarios por día
   * @returns {string} - Hora de apertura mínima en formato HH:MM
   * @private
   */
  _calcularHoraAperturaMinima(horario) {
    if (!Array.isArray(horario) || horario.length === 0) {
      return '08:00'; // Valor por defecto
    }

    // Encontrar la hora de apertura mínima
    let horaMinima = '23:59';
    
    for (const dia of horario) {
      if (dia.abre && typeof dia.abre === 'string' && dia.abre.length === 5) {
        if (dia.abre < horaMinima) {
          horaMinima = dia.abre;
        }
      }
    }
    
    return horaMinima === '23:59' ? '08:00' : horaMinima;
  }

  /**
   * Calcula la hora de cierre máxima entre todos los días de la semana
   * @param {Array} horario - Array de objetos con horarios por día
   * @returns {string} - Hora de cierre máxima en formato HH:MM
   * @private
   */
  _calcularHoraCierreMaxima(horario) {
    if (!Array.isArray(horario) || horario.length === 0) {
      return '22:00'; // Valor por defecto
    }

    // Encontrar la hora de cierre máxima
    let horaMaxima = '00:00';
    
    for (const dia of horario) {
      if (dia.cierra && typeof dia.cierra === 'string' && dia.cierra.length === 5) {
        if (dia.cierra > horaMaxima) {
          horaMaxima = dia.cierra;
        }
      }
    }
    
    return horaMaxima === '00:00' ? '22:00' : horaMaxima;
  }

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
    createdAt, // Fecha de creación del registro
    updatedAt // Fecha de última actualización
  }) {
    this.centroId = centroId;
    this.nombre = nombre;
    this.direccion = direccion;
    this.telefonoPrincipal = telefonoPrincipal;
    this.telefonoSecundario = telefonoSecundario || null; // Opcional, null por defecto
    // --- HORARIO FLEXIBLE POR DÍA ---
    this.horario = horario || [
      { dia: 'lunes', abre: '08:00', cierra: '22:00' },
      { dia: 'martes', abre: '08:00', cierra: '22:00' },
      { dia: 'miercoles', abre: '08:00', cierra: '22:00' },
      { dia: 'jueves', abre: '08:00', cierra: '22:00' },
      { dia: 'viernes', abre: '08:00', cierra: '22:00' },
      { dia: 'sabado', abre: '08:00', cierra: '22:00' },
      { dia: 'domingo', abre: '08:00', cierra: '22:00' }
    ];
    this.userId = userId;
    this.ubicacionGPS = ubicacionGPS || { lat: 0, lng: 0 }; // Coordenadas por defecto
    this.imagenes = imagenes || []; // Array vacío por defecto
    this.estado = estado || 'abierto'; // Por defecto está abierto
    
    // Calcular automáticamente horaAperturaMinima y horaCierreMaxima a partir del array horario
    // Estos campos son necesarios para los índices de DynamoDB
    this.horaAperturaMinima = this._calcularHoraAperturaMinima(this.horario);
    this.horaCierreMaxima = this._calcularHoraCierreMaxima(this.horario);
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