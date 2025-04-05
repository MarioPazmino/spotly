class CentroDeportivo {
    constructor({
      id,
      nombre,
      direccion,
      coordenadas, // { lat, lng }
      telefono,
      horarioApertura,
      horarioCierre,
      diasOperacion, // ['lunes', 'martes', ...]
      imagenes,
      createdAt,
      updatedAt
    }) {
      this.id = id;
      this.nombre = nombre;
      this.direccion = direccion;
      this.coordenadas = coordenadas;
      this.telefono = telefono;
      this.horarioApertura = horarioApertura;
      this.horarioCierre = horarioCierre;
      this.diasOperacion = diasOperacion;
      this.imagenes = imagenes || [];
      this.createdAt = createdAt || new Date().toISOString();
      this.updatedAt = updatedAt || new Date().toISOString();
    }
  }
  
  export default CentroDeportivo;
  