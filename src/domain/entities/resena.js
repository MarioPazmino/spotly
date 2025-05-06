//src/domain/entities/resena.js
const { v4: uuidv4 } = require('uuid');

class Resena {
    constructor({
      resenaId = uuidv4(), // Identificador único de la reseña
      userId, // ID del usuario que hace la reseña (FK)
      canchaId, // ID de la cancha evaluada (FK, opcional)
      centroId, // ID del centro deportivo evaluado (FK, opcional)
      calificacion, // Puntuación de 1 a 5 estrellas (opcional)
      comentario, // Texto de la reseña (opcional)
      fecha = new Date().toISOString(), // Fecha en que se realizó la reseña
      createdAt = new Date().toISOString(), // Fecha de creación del registro
      updatedAt = new Date().toISOString() // Fecha de última actualización
    }) {
      // Validar que se proporcione exactamente uno de los campos
      if (!canchaId && !centroId) {
        throw new Error('Se requiere un ID de cancha o centro deportivo');
      }

      if (canchaId && centroId) {
        throw new Error('Solo se puede especificar un ID de cancha o centro deportivo, no ambos');
      }

      this.resenaId = resenaId;
      this.userId = userId;
      this.canchaId = canchaId || null;
      this.centroId = centroId || null;
      this.calificacion = calificacion || null;
      this.comentario = comentario || '';
      this.fecha = fecha;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
    }

    // Método para crear un registro de estadísticas
    static crearEstadisticasCancha(canchaId, calificacion) {
      const calificacionNum = parseFloat(calificacion);
      const calificacionRedondeada = Math.round(calificacionNum);
      
      return new Resena({
        resenaId: `STATS#CANCHA#${canchaId}`,
        canchaId,
        calificacion: calificacionNum,
        promedio: calificacionNum,
        totalResenas: 1,
        distribucion: {
          [calificacionRedondeada]: 1
        }
      });
    }

    static crearEstadisticasCentro(centroId, calificacion) {
      const calificacionNum = parseFloat(calificacion);
      const calificacionRedondeada = Math.round(calificacionNum);
      
      return new Resena({
        resenaId: `STATS#CENTRO#${centroId}`,
        centroId,
        calificacion: calificacionNum,
        promedio: calificacionNum,
        totalResenas: 1,
        distribucion: {
          [calificacionRedondeada]: 1
        }
      });
    }

    // Método para verificar si es un registro de estadísticas
    esEstadistica() {
      return this.resenaId.startsWith('STATS#');
    }

    // Método para verificar si es estadística de cancha
    esEstadisticaCancha() {
      return this.resenaId.startsWith('STATS#CANCHA#');
    }

    // Método para verificar si es estadística de centro
    esEstadisticaCentro() {
      return this.resenaId.startsWith('STATS#CENTRO#');
    }

    // Método para obtener el ID de la cancha o centro de las estadísticas
    obtenerIdEstadistica() {
      if (this.esEstadisticaCancha()) {
        return this.resenaId.replace('STATS#CANCHA#', '');
      }
      if (this.esEstadisticaCentro()) {
        return this.resenaId.replace('STATS#CENTRO#', '');
      }
      return null;
    }

    // Método para validar la calificación
    validarCalificacion() {
      if (this.calificacion < 1 || this.calificacion > 5) {
        throw new Error('La calificación debe estar entre 1 y 5');
      }
    }

    // Método para validar la reseña
    validar() {
      if (!this.userId) {
        throw new Error('El ID del usuario es requerido');
      }

      // Validar que se proporcione exactamente uno de los campos
      if (!this.canchaId && !this.centroId) {
        throw new Error('Se requiere un ID de cancha o centro deportivo');
      }

      if (this.canchaId && this.centroId) {
        throw new Error('Solo se puede especificar un ID de cancha o centro deportivo, no ambos');
      }

      this.validarCalificacion();

      if (!this.comentario) {
        throw new Error('El comentario es requerido');
      }
    }

    // Método para actualizar las estadísticas
    actualizarEstadisticas(calificacionAnterior = null) {
      if (!this.esEstadistica()) {
        throw new Error('Solo se pueden actualizar registros de estadísticas');
      }

      const calificacionNum = parseFloat(this.calificacion);
      const calificacionRedondeada = Math.round(calificacionNum);

      if (calificacionAnterior) {
        // Actualización de calificación
        const calificacionAnteriorNum = parseFloat(calificacionAnterior);
        const calificacionAnteriorRedondeada = Math.round(calificacionAnteriorNum);
        
        this.promedio = ((this.promedio * this.totalResenas) - calificacionAnteriorNum + calificacionNum) / this.totalResenas;
        this.distribucion[calificacionAnteriorRedondeada]--;
        this.distribucion[calificacionRedondeada]++;
      } else {
        // Nueva calificación
        this.promedio = (this.promedio * this.totalResenas + calificacionNum) / (this.totalResenas + 1);
        this.totalResenas++;
        this.distribucion[calificacionRedondeada] = (this.distribucion[calificacionRedondeada] || 0) + 1;
      }

      this.updatedAt = new Date().toISOString();
    }

    // Método para eliminar una calificación de las estadísticas
    eliminarCalificacion() {
      if (!this.esEstadistica()) {
        throw new Error('Solo se pueden actualizar registros de estadísticas');
      }

      const calificacionNum = parseFloat(this.calificacion);
      const calificacionRedondeada = Math.round(calificacionNum);

      if (this.totalResenas === 1) {
        this.promedio = 0;
        this.totalResenas = 0;
        this.distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      } else {
        this.promedio = (this.promedio * this.totalResenas - calificacionNum) / (this.totalResenas - 1);
        this.totalResenas--;
        this.distribucion[calificacionRedondeada]--;
      }

      this.updatedAt = new Date().toISOString();
    }

    toJSON() {
      return {
        resenaId: this.resenaId,
        userId: this.userId,
        canchaId: this.canchaId,
        centroId: this.centroId,
        calificacion: this.calificacion,
        comentario: this.comentario,
        fecha: this.fecha,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        ...(this.esEstadistica() && {
          promedio: this.promedio,
          totalResenas: this.totalResenas,
          distribucion: this.distribucion
        })
      };
    }
}

module.exports = Resena;