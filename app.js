//app.js 
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

// Importar handlers
const { addSportsCenters } = require('./src/function/Sports-Centers/addSportsCenters');
const { listSportsCenters } = require('./src/function/Sports-Centers/listSportsCenters'); // Nuevo handler

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de la API
app.post('/centros-deportivos', addSportsCenters);
app.get('/centros-deportivos', listSportsCenters); // Nueva ruta GET

// Exporta el handler para Serverless Framework
module.exports.handler = serverless(app);