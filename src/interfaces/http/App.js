import express from 'express';
import serverless from 'serverless-http';
import Boom from '@hapi/boom';
import setupRoutes from './interfaces/http/routes';
import errorHandler from './interfaces/middlewares/error-handler';

const app = express();

// Middlewares
app.use(express.json());

// Configurar rutas
setupRoutes(app);

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
  next(Boom.notFound('Ruta no encontrada'));
});

// Middleware para manejar errores
app.use(errorHandler);

// Handler para Serverless
export const handler = serverless(app);

export default app;
