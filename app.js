// app.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const UserRepository = require('./src/infrastructure/repositories/userRepository');
const CentroDeportivoRepository = require('./src/infrastructure/repositories/centroDeportivoRepository');
const CanchasRepository = require('./src/infrastructure/repositories/canchasRepository');
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

// Crear una única instancia del repositorio
const userRepository = new UserRepository();
const centroDeportivoRepository = new CentroDeportivoRepository();
const canchasRepository = new CanchasRepository();

// Configuración de middlewares
app.set('userRepository', userRepository);
app.set('centroDeportivoRepository', centroDeportivoRepository);
app.set('canchasRepository', canchasRepository);
 

app.use(cors({
  exposedHeaders: ['X-Access-Token'] // Permitir encabezados personalizados
}));
app.use(express.json()); // Parsear JSON en las solicitudes

// Rutas principales
app.use('/api', routes);

// Ruta de salud (health check)
app.get('/health', (req, res) => {
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