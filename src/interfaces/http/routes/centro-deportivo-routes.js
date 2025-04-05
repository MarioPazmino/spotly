import { Router } from 'express';
import CentroDeportivoController from '../controllers/centro-deportivo-controller';
import CentroDeportivoService from '../../../domain/services/centro-deportivo-service';
import CentroDeportivoRepository from '../../../infrastructure/repositories/centro-deportivo-repository';
import roleMiddleware from '../middlewares/role-middleware';

const router = Router();

// Inicialización de dependencias
const centroDeportivoRepository = new CentroDeportivoRepository();
const centroDeportivoService = new CentroDeportivoService(centroDeportivoRepository);
const centroDeportivoController = new CentroDeportivoController(centroDeportivoService);

// Rutas de Centro Deportivo
router.get('/', (req, res, next) => centroDeportivoController.getAll(req, res, next));
router.get('/:id', (req, res, next) => centroDeportivoController.getById(req, res, next));

// Rutas protegidas por rol
router.post('/',
  roleMiddleware(['super_admin']),
  (req, res, next) => centroDeportivoController.create(req, res, next)
);
router.put('/:id',
  roleMiddleware(['super_admin']),
  (req, res, next) => centroDeportivoController.update(req, res, next)
);
router.delete('/:id',
  roleMiddleware(['super_admin']),
  (req, res, next) => centroDeportivoController.delete(req, res, next)
);

export default router;