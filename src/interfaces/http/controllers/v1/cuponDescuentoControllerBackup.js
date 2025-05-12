/**
 * Controlador de respaldo para operaciones con cupones de descuento
 * Responsabilidad: manejo de solicitudes HTTP y respuestas para cupones
 */

const cuponDescuentoService = require('../../../../infrastructure/services/cuponDescuentoService');

class CuponDescuentoControllerBackup {
  async create(req, res, next) {
    try {
      const userId = req.user && req.user.userId;
      const userGroups = req.user && req.user.groups;
      
      // Verificar si el usuario es super_admin
      const esSuperAdmin = userGroups && userGroups.includes('super_admin');
      
      // Modificar la validación si el usuario es super_admin
      let cupon;
      if (esSuperAdmin) {
        // Si es super_admin, omitir la validación de propiedad del centro
        cupon = await cuponDescuentoService.createAsSuperAdmin(req.body);
      } else {
        // Si no es super_admin, usar el flujo normal
        cupon = await cuponDescuentoService.create(req.body, userId);
      }
      
      return res.status(201).json(cupon);
    } catch (err) { 
      console.error('Error al crear cupón:', err);
      
      // Verificar si es un error estructurado
      if (err.status && err.code && err.message) {
        return res.status(err.status).json({
          error: err.message,
          mensaje: err.message,
          detalles: err.detalles || {},
          code: err.code
        });
      }
      
      // Manejar errores específicos con respuestas JSON informativas
      if (err.message && err.message.includes('centroId asociado no existe')) {
        return res.status(404).json({
          error: 'Centro deportivo no encontrado',
          mensaje: 'El ID del centro deportivo proporcionado no existe en el sistema',
          detalles: {
            centroId: req.body.centroId || req.body.centroDeportivoId,
            codigo: req.body.codigo
          },
          code: 'CENTRO_NOT_FOUND'
        });
      }
      
      if (err.message && err.message.includes('Solo el administrador del centro puede crear cupones')) {
        return res.status(403).json({
          error: 'Permiso denegado',
          mensaje: 'Solo el administrador del centro deportivo puede crear cupones para su centro',
          detalles: {
            centroId: req.body.centroId || req.body.centroDeportivoId,
            userId: req.user && req.user.userId
          },
          code: 'PERMISSION_DENIED'
        });
      }
      
      if (err.message && err.message.includes('Ya existe un cupón con ese código')) {
        return res.status(409).json({
          error: 'Código duplicado',
          mensaje: 'Ya existe un cupón con ese código para este centro deportivo',
          detalles: {
            centroId: req.body.centroId || req.body.centroDeportivoId,
            codigo: req.body.codigo
          },
          code: 'DUPLICATE_CODE'
        });
      }
      
      // Manejar otros errores con formato JSON
      return res.status(500).json({
        error: 'Error al crear cupón',
        mensaje: err.message || 'Ocurrió un error al procesar la solicitud',
        detalles: req.body,
        code: 'ERROR_CREATE_CUPON'
      });
    }
  }

  async getById(req, res, next) {
    try {
      const cupon = await cuponDescuentoService.getById(req.params.cuponId);
      if (!cupon) {
        return res.status(404).json({ 
          error: 'Cupón no encontrado',
          mensaje: 'No existe un cupón con el ID proporcionado',
          code: 'COUPON_NOT_FOUND'
        });
      }
      res.json(cupon);
    } catch (err) {
      console.error('Error al obtener cupón por ID:', err);
      return res.status(500).json({
        error: 'Error al obtener cupón',
        mensaje: err.message || 'Ocurrió un error al obtener el cupón',
        code: 'GET_COUPON_ERROR'
      });
    }
  }

  async findByCodigo(req, res, next) {
    try {
      const { codigo } = req.params;
      const cupon = await cuponDescuentoService.findByCodigo(codigo);
      if (!cupon) {
        return res.status(404).json({ 
          error: 'Cupón no encontrado',
          mensaje: 'No existe un cupón con el código proporcionado',
          code: 'COUPON_NOT_FOUND'
        });
      }
      res.json(cupon);
    } catch (err) {
      console.error('Error al buscar cupón por código:', err);
      return res.status(500).json({
        error: 'Error al buscar cupón',
        mensaje: err.message || 'Ocurrió un error al buscar el cupón',
        code: 'FIND_COUPON_ERROR'
      });
    }
  }

  async applyCoupon(req, res, next) {
    try {
      // El usuario solo necesita proporcionar el código
      const { codigo, centroId } = req.body;
      
      // Obtener userId del token
      let userId = null;
      if (req.user) {
        userId = req.user.userId || req.user.id || req.user.sub;
      }

      // Para pruebas, permitir userId en el body o en query params
      if (!userId) {
        if (req.query && req.query.userId) {
          userId = req.query.userId;
        } else if (req.body && req.body.userId) {
          userId = req.body.userId;
        }
      }

      // Verificar si tenemos un userId
      if (!userId) {
        return res.status(401).json({
          error: 'No autorizado',
          mensaje: 'Debes iniciar sesión para usar cupones. No se pudo determinar tu ID de usuario.',
          code: 'UNAUTHORIZED'
        });
      }
      
      if (!codigo) {
        return res.status(400).json({
          error: 'Falta el código del cupón',
          mensaje: 'Debes proporcionar el código del cupón',
          code: 'MISSING_CODE'
        });
      }
      
      // Aplicar el cupón
      const result = await cuponDescuentoService.applyCoupon(codigo, centroId, userId);
      res.json(result);
    } catch (err) {
      console.error('Error al aplicar cupón:', err);
      
      // Verificar si es un error estructurado
      if (err.status && err.code && err.message) {
        return res.status(err.status).json({
          error: err.message,
          mensaje: err.message,
          detalles: err.detalles || {},
          code: err.code
        });
      }
      
      return res.status(400).json({
        error: 'Error al aplicar cupón',
        mensaje: err.message || 'Ocurrió un error al aplicar el cupón',
        code: 'APPLY_COUPON_ERROR'
      });
    }
  }

  async findAllByCentroId(req, res, next) {
    try {
      const { centroId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      const lastKey = req.query.lastKey ? JSON.parse(req.query.lastKey) : undefined;
      
      const cupones = await cuponDescuentoService.findAllByCentroId(centroId, limit, lastKey);
      res.json(cupones);
    } catch (err) { 
      console.error('Error al obtener cupones por centro:', err);
      return res.status(500).json({
        error: 'Error al obtener cupones',
        mensaje: err.message || 'Ocurrió un error al obtener los cupones del centro',
        code: 'ERROR_GET_CUPONES'
      });
    }
  }

  async update(req, res, next) {
    try {
      console.log("Controlador: Iniciando actualización de cupón");
      console.log("Params:", JSON.stringify(req.params));
      console.log("Body:", JSON.stringify(req.body));
      console.log("Usuario:", JSON.stringify(req.user));
      
      // Obtener userId de la misma manera que en applyCoupon para ser consistentes
      let userId = null;
      if (req.user) {
        userId = req.user.userId || req.user.id || req.user.sub;
      }
      
      // Obtener los grupos del usuario
      const userGroups = req.user && req.user.groups ? req.user.groups : [];
      console.log("Grupos de usuario:", userGroups);
      
      console.log("userId extraído:", userId);
      
      if (!userId) {
        return res.status(401).json({
          error: 'No autorizado',
          mensaje: 'Debes iniciar sesión para actualizar cupones',
          code: 'UNAUTHORIZED'
        });
      }
      
      // Agregar el cuponId al body para asegurar que se pase correctamente
      const updateData = {
        ...req.body,
        cuponId: req.params.cuponId // Asegurar que el cuponId se incluya
      };
      
      console.log("Datos de actualización a enviar:", JSON.stringify(updateData));
      
      try {
        const cupon = await cuponDescuentoService.update(req.params.cuponId, updateData, userId, userGroups);
        console.log("Resultado de actualización:", JSON.stringify(cupon));
        res.json(cupon);
      } catch (error) {
        console.error("Error en actualización de cupón:", error);
        
        // Verificar si es un error estructurado
        if (error.status && error.code && error.message) {
          return res.status(error.status).json({
            error: error.message,
            mensaje: error.message,
            detalles: error.detalles || {},
            code: error.code
          });
        } else {
          // Error genérico para Postman
          return res.status(500).json({
            error: 'Error al actualizar cupón',
            mensaje: error.message || 'Ocurrió un error inesperado',
            detalles: {
              cuponId: req.params.cuponId,
              body: req.body
            },
            code: 'UPDATE_FAILED'
          });
        }
      }
    } catch (err) { 
      console.error("Error en procesamiento de la solicitud:", err);
      
      // Verificar si es un error estructurado
      if (err.status && err.code && err.message) {
        return res.status(err.status).json({
          error: err.message,
          mensaje: err.message,
          detalles: err.detalles || {},
          code: err.code
        });
      } else {
        // Error genérico para Postman
        return res.status(500).json({
          error: 'Error en procesamiento de la solicitud',
          mensaje: err.message || 'Ocurrió un error inesperado',
          detalles: {
            cuponId: req.params.cuponId,
            body: req.body
          },
          code: 'REQUEST_PROCESSING_ERROR'
        });
      }
    }
  }

  async delete(req, res, next) {
    try {
      console.log("Controlador: Iniciando eliminación de cupón", req.params.cuponId);
      
      // Obtener userId de la misma manera que otros métodos
      let userId = null;
      if (req.user) {
        userId = req.user.userId || req.user.id || req.user.sub;
      }
      
      // Obtener los grupos del usuario
      const userGroups = req.user && req.user.groups ? req.user.groups : [];
      
      if (!userId) {
        return res.status(401).json({
          error: 'No autorizado',
          mensaje: 'Debes iniciar sesión para eliminar cupones',
          code: 'UNAUTHORIZED'
        });
      }

      try {
        const resultado = await cuponDescuentoService.delete(req.params.cuponId);
        return res.status(200).json({
          mensaje: resultado.message || 'Cupón eliminado correctamente',
          cuponId: req.params.cuponId,
          expirado: resultado.message && resultado.message.includes('expirado'),
          code: 'DELETE_SUCCESS'
        });
      } catch (error) {
        console.error("Error al eliminar cupón:", error);
        
        // Verificar si es un error estructurado
        if (error.status && error.code && error.message) {
          // Si es un error de cupón con usos, agregar información adicional
          if (error.code === 'COUPON_HAS_USES') {
            return res.status(error.status).json({
              error: error.message,
              mensaje: error.message,
              detalles: {
                ...error.detalles,
                sugerencia: 'Espera a que el cupón expire para eliminarlo o desactívalo cambiando la fecha de fin'
              },
              code: error.code
            });
          }
          
          return res.status(error.status).json({
            error: error.message,
            mensaje: error.message,
            detalles: error.detalles || {},
            code: error.code
          });
        } else {
          // Error genérico
          return res.status(500).json({
            error: 'Error al eliminar cupón',
            mensaje: error.message || 'Ocurrió un error inesperado al eliminar el cupón',
            detalles: {
              cuponId: req.params.cuponId
            },
            code: 'DELETE_FAILED'
          });
        }
      }
    } catch (err) {
      console.error("Error en procesamiento de la solicitud:", err);
      
      // Verificar si es un error estructurado
      if (err.status && err.code && err.message) {
        return res.status(err.status).json({
          error: err.message,
          mensaje: err.message,
          detalles: err.detalles || {},
          code: err.code
        });
      } else {
        return res.status(500).json({
          error: 'Error en procesamiento de la solicitud',
          mensaje: err.message || 'Ocurrió un error inesperado',
          detalles: {
            cuponId: req.params.cuponId
          },
          code: 'REQUEST_PROCESSING_ERROR'
        });
      }
    }
  }
}

module.exports = new CuponDescuentoControllerBackup(); 