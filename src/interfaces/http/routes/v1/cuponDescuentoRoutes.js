// src/interfaces/http/routes/v1/cuponDescuentoRoutes.js
const express = require('express');
const router = express.Router();

// Intentar importar el controlador con manejo de errores para evitar fallos en Lambda
let cuponDescuentoController;
try {
  // Intenta importar el controlador desde la ruta correcta
  cuponDescuentoController = require('../../controllers/v1/cuponDescuentoController');
} catch (error) {
  // Si falla la importación, crea un controlador básico que no cause errores
  console.log('Error al importar cuponDescuentoController, usando implementación de respaldo');
  const cuponDescuentoService = require('../../../../infrastructure/services/cuponDescuentoService');
  
  cuponDescuentoController = {
    async create(req, res, next) {
      try {
        const userId = req.user && req.user.userId;
        const cupon = await cuponDescuentoService.create(req.body, userId);
        res.status(201).json(cupon);
      } catch (err) { next(err); }
    },
    async getById(req, res, next) {
      try {
        const cupon = await cuponDescuentoService.getById(req.params.cuponId);
        if (!cupon) return res.status(404).json({ error: 'Cupón no encontrado' });
        res.json(cupon);
      } catch (err) { next(err); }
    },
    async findByCodigo(req, res, next) {
      try {
        const { codigo } = req.params;
        const cupon = await cuponDescuentoService.findByCodigo(codigo);
        if (!cupon) return res.status(404).json({ error: 'Cupón no encontrado' });
        res.json(cupon);
      } catch (err) { next(err); }
    },
    async applyCoupon(req, res, next) {
      try {
        const { codigo, canchaId, fecha, horaInicio, horaFin } = req.body;
        if (!codigo || !canchaId || !fecha || !horaInicio || !horaFin) {
          return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        const result = await cuponDescuentoService.applyCoupon(codigo, canchaId, fecha, horaInicio, horaFin);
        res.json(result);
      } catch (err) { next(err); }
    },
    async findAllByCentroId(req, res, next) {
      try {
        const { centroId } = req.params;
        const cupones = await cuponDescuentoService.listByCentroDeportivo(centroId);
        res.json(cupones);
      } catch (err) { next(err); }
    },
    async update(req, res, next) {
      try {
        const { cuponId } = req.params;
        const userId = req.user && req.user.userId;
        const cupon = await cuponDescuentoService.update(cuponId, req.body, userId);
        res.json(cupon);
      } catch (err) { next(err); }
    },
    async delete(req, res, next) {
      try {
        const { cuponId } = req.params;
        await cuponDescuentoService.delete(cuponId);
        res.status(204).end();
      } catch (err) { next(err); }
    }
  };
}
// Middleware de autenticación simplificado para desarrollo
const auth = (req, res, next) => {
  // En desarrollo, simulamos un usuario autenticado
  req.user = {
    userId: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'cliente',
    picture: null,
    registrationSource: 'cognito',
    pendienteAprobacion: null,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    groups: ['cliente']
  };
  next();
};
// Implementación directa del middleware de autorización para evitar problemas de importación en Lambda
const authorization = (allowedGroups) => {
  return (req, res, next) => {
    try {
      const userGroups = req.user && req.user.groups ? req.user.groups : [];
      
      // Verificar si el usuario pertenece a alguno de los grupos permitidos
      const hasPermission = userGroups.some(group => allowedGroups.includes(group));
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
      }
      
      next();
    } catch (error) {
      console.error('Error en autorización:', error);
      next(error);
    }
  };
};

// Middleware para validar UUID
const { validate: isUuid } = require('uuid');
function validateUUID(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!isUuid(value)) {
      return res.status(400).json({
        message: `El parámetro ${paramName} debe ser un UUID válido.`
      });
    }
    next();
  };
}

// Crear cupón (solo admin del centro)
router.post('/', auth, authorization(['admin_centro']), (req, res, next) => {
  // Validación básica integrada en la ruta
  try {
    const { codigo, centroDeportivoId } = req.body;
    
    if (!codigo) {
      return res.status(400).json({ error: 'El código del cupón es requerido' });
    }
    
    if (!centroDeportivoId) {
      return res.status(400).json({ error: 'El ID del centro deportivo es requerido' });
    }
    
    // Continuar con la creación del cupón
    cuponDescuentoController.create(req, res, next);
  } catch (error) {
    console.error('Error en validación de cupón:', error);
    next(error);
  }
});
// Aplicar cupón por código (no requiere auth, puede ser público)
router.post('/aplicar', (req, res, next) => cuponDescuentoController.applyCoupon(req, res, next));
// Obtener cupón por ID (requiere UUID válido)
router.get('/:cuponId', validateUUID('cuponId'), (req, res, next) => cuponDescuentoController.getById(req, res, next));
// Buscar cupón por código (puede ser público)
router.get('/codigo/:codigo', (req, res, next) => cuponDescuentoController.findByCodigo(req, res, next));
// Obtener todos los cupones de un centro (requiere UUID válido y autenticación)
router.get('/centro/:centroId', auth, validateUUID('centroId'), (req, res, next) => cuponDescuentoController.findAllByCentroId(req, res, next));
// Actualizar cupón (solo admin del centro)
router.put('/:cuponId', auth, validateUUID('cuponId'), authorization(['admin_centro']), (req, res, next) => {
  // Validación básica integrada en la ruta
  try {
    const { codigo, centroDeportivoId } = req.body;
    
    if (!codigo) {
      return res.status(400).json({ error: 'El código del cupón es requerido' });
    }
    
    if (!centroDeportivoId) {
      return res.status(400).json({ error: 'El ID del centro deportivo es requerido' });
    }
    
    // Continuar con la actualización del cupón
    cuponDescuentoController.update(req, res, next);
  } catch (error) {
    console.error('Error en validación de cupón:', error);
    next(error);
  }
});
// Eliminar cupón (solo admin del centro)
router.delete('/:cuponId', auth, validateUUID('cuponId'), authorization(['admin_centro']), (req, res, next) => cuponDescuentoController.delete(req, res, next));

module.exports = router;