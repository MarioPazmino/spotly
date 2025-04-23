// handler.js (Archivo principal para Serverless Framework)
const { handler } = require('./app');

// Exportamos las funciones que se definen en serverless.yml
module.exports.api = handler;