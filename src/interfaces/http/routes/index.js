import centroDeportivoRoutes from './centro-deportivo-routes';
import canchaRoutes from './cancha-routes';
import reservaRoutes from './reserva-routes';
import usuarioRoutes from './usuario-routes';
import productoRoutes from './producto-routes';
import ventaRoutes from './venta-routes';
import authMiddleware from '../middlewares/auth-middleware';

export default function setupRoutes(app) {
  // Rutas públicas
  app.use('/api/v1/auth', require('./auth-routes').default);

  // Middleware de autenticación para rutas protegidas
  app.use('/api/v1', authMiddleware);

  // Rutas protegidas
  app.use('/api/v1/centros-deportivos', centroDeportivoRoutes);
  app.use('/api/v1/canchas', canchaRoutes);
  app.use('/api/v1/reservas', reservaRoutes);
  app.use('/api/v1/usuarios', usuarioRoutes);
  app.use('/api/v1/productos', productoRoutes);
  app.use('/api/v1/ventas', ventaRoutes);
}
