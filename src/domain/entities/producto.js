class Producto {
    constructor({
      id,
      centroDeportivoId,
      nombre,
      descripcion,
      precio,
      stock,
      categoria, // 'bebida', 'snack', etc.
      imagen,
      disponible,
      createdAt,
      updatedAt
    }) {
      this.id = id;
      this.centroDeportivoId = centroDeportivoId;
      this.nombre = nombre;
      this.descripcion = descripcion;
      this.precio = precio;
      this.stock = stock;
      this.categoria = categoria;
      this.imagen = imagen;
      this.disponible = disponible !== false;
      this.createdAt = createdAt || new Date().toISOString();
      this.updatedAt = updatedAt || new Date().toISOString();
    }
  }
  
  export default Producto;
  