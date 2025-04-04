const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');

// ✅ Rutas corregidas (function con 'c')
const { addReservation } = require('./src/function/addReservation');
const { listReservation } = require('./src/function/listReservation');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rutas de la API
app.post('/crearreserva', addReservation); // Directo como middleware
app.get('/reservas', listReservation);     // Directo como middleware

// Exporta el handler para Serverless Framework
module.exports.handler = serverless(app);