// app.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const errorHandler = require('./src/interfaces/middlewares/errorHandler');
const UserRepository = require('./src/infrastructure/repositories/userRepository');
const routes = require('./src/interfaces/http/routes');

const app = express();

// Configuración de middlewares
app.set('userRepository', new UserRepository());

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

// Exportar la aplicación para Serverless
module.exports.handler = serverless(app);
module.exports.app = app;