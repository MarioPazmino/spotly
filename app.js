// app.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const errorHandler = require('./src/interfaces/middlewares/errorHandler');
const UserRepository = require('./src/infrastructure/repositories/userRepository');

const routes = require('./src/interfaces/http/routes');

const app = express();

// Middleware
app.set('userRepository', new UserRepository());

app.use(cors({
  exposedHeaders: ['X-Access-Token'] 
}));
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', message: 'API está funcionando correctamente' });
});

app.use((req, res) => {
  res.status(404).json({ 
    statusCode: 404,
    error: 'Not Found', 
    message: 'Ruta no encontrada' 
  });
});
app.use(errorHandler);

module.exports.handler = serverless(app);
module.exports.app = app;