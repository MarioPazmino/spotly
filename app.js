// app.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const errorHandler = require('./src/interfaces/middlewares/errorHandler');
const routes = require('./src/interfaces/http/routes');

// Validación de variables de entorno críticas al iniciar la app
function validateEnvVars() {
  const requiredVars = [
    'AWS_REGION',
    'IMAGENES_CENTROS_BUCKET',
    // Agrega aquí cualquier otra variable crítica
  ];
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`FALTAN variables de entorno requeridas: ${missing.join(', ')}`);
    process.exit(1);
  }
}
validateEnvVars();

const app = express();

// Importar repositorios
const UserRepository = require('./src/infrastructure/repositories/userRepository');
const centroDeportivoRepository = require('./src/infrastructure/repositories/centroDeportivoRepository');
const CanchasRepository = require('./src/infrastructure/repositories/canchasRepository');
const horariosRepository = require('./src/infrastructure/repositories/horariosRepository');
const CuponDescuentoRepository = require('./src/infrastructure/repositories/cuponDescuentoRepository');
const reservaRepository = require('./src/infrastructure/repositories/reservaRepository');
const PagosRepository = require('./src/infrastructure/repositories/pagosRepository');
const ResenaRepository = require('./src/infrastructure/repositories/resenaRepository');

// Instanciar los repositorios que son clases
const userRepository = new UserRepository();
const canchasRepository = new CanchasRepository();
const cuponDescuentoRepository = new CuponDescuentoRepository();
const pagosRepository = new PagosRepository();
const resenaRepository = new ResenaRepository();
// Configuración de middlewares
app.set('userRepository', userRepository);
app.set('centroDeportivoRepository', centroDeportivoRepository);
app.set('canchasRepository', canchasRepository);
app.set('horariosRepository', horariosRepository);
app.set('cuponDescuentoRepository', cuponDescuentoRepository);
app.set('reservaRepository', reservaRepository); 
app.set('pagosRepository', pagosRepository); 
app.set('resenaRepository', resenaRepository); 
app.use(cors({
  exposedHeaders: ['X-Access-Token'] // Permitir encabezados personalizados
}));
app.use(express.json()); // Parsear JSON en las solicitudes

// Rutas principales
// Verificar si la URL ya tiene el prefijo /api para evitar duplicación
app.use('/api', routes);

// Ruta de salud (health check)
app.get('/health', (req, res) => {
  console.log('Health check solicitado');
  res.status(200).json({ 
    status: 'UP', 
    message: 'API está funcionando correctamente' 
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    statusCode: 404,
    error: 'Not Found', 
    message: 'Ruta no encontrada' 
  });
});

// Middleware de manejo de errores
app.use(errorHandler);
module.exports.handler = serverless(app);
module.exports.app = app;