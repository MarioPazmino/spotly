// app.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const errorHandler = require('./src/interfaces/middlewares/errorHandler');
const UserRepository = require('./src/infrastructure/repositories/userRepository');

// Importar las rutas principales (que ya incluyen las versiones)
const routes = require('./src/interfaces/http/routes');

const app = express();

// Middleware
app.set('userRepository', new UserRepository());

// Middleware
app.use(cors({
  exposedHeaders: ['X-Access-Token'] // Importante para el refresh de tokens
}));
app.use(express.json());

// Configuración de rutas versionadas
app.use('/api', routes);

// Ruta de salud para verificar que la API esté funcionando
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'API está funcionando correctamente' });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    statusCode: 404,
    error: 'Not Found', 
    message: 'Ruta no encontrada' 
  });
});

// Middleware para manejo de errores (DEBE estar después de las rutas)
app.use(errorHandler);

// Exporta el handler para Serverless Framework
module.exports.handler = serverless(app);

// También exportamos la app de Express para pruebas o uso directo
module.exports.app = app;