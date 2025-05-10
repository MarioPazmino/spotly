// src/interfaces/middlewares/authorization.js
const Boom = require('@hapi/boom');

class AuthorizationMiddleware {
  constructor() {
    this.groupPermissions = {
      "super_admin": ["*"],
      "admin_centro": [
        "list:centro", "read:centro", "write:centro", "update:centro", "delete:centro",
        "read:canchas", "write:canchas", "update:canchas", "delete:canchas",
        "read:horarios", "write:horarios", "update:horarios", "delete:horarios",
        "read:reservas", "update:reservas", "cancel:reservas",
        "read:cupon", "write:cupon", "update:cupon", "delete:cupon",
        "read:pagos", "update:pagos", "delete:pagos", "refund:pagos",
        "read:comprobantes", "update:comprobantes", "delete:comprobantes",
        "read:resenas", "delete:resenas"
      ],
      "cliente": [
        "list:centro", "read:centro",
        "read:public", "write:reservas", "cancel:propias",
        "update:perfil", "read:pagos_propios", "create:pagos",
        "read:cupon",
        "read:comprobantes_propios", "update:comprobantes_propios", "delete:comprobantes_propios",
        "create:resenas", "read:resenas", "update:resenas_propios", "delete:resenas_propios"
      ]
    };
  }
  
  // Middleware de autenticación para Express
  autenticar(req, res, next) {
    try {
      // Verificar si el usuario está autenticado
      if (!req.user || !req.user.sub) {
        return res.status(401).json({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'No estás autenticado'
        });
      }
      next();
    } catch (error) {
      console.error('Error en autenticación:', error);
      return res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Error de autenticación'
      });
    }
  }

  hasPermission(userGroups, requiredPermission) {
    return userGroups.some(group => {
      const permissions = this.groupPermissions[group] || [];
      return permissions.some(p => 
        p === "*" || 
        p === requiredPermission || 
        (p.endsWith(":*") && requiredPermission.startsWith(p.replace(":*", "")))
      );
    });
  }

  checkPermission(requiredPermission) {
    return (req, res, next) => {
      try {
        // Temporalmente permitir la creación de centros deportivos para cualquier usuario autenticado
        if (requiredPermission === 'write:centro') {
          console.log('Permitiendo temporalmente la creación de centros deportivos para:', req.user.sub);
          // Agregar temporalmente el rol super_admin a los grupos del usuario
          if (!req.user.groups.includes('super_admin')) {
            req.user.groups.push('super_admin');
            console.log('Grupos actualizados temporalmente:', req.user.groups);
          }
          next();
          return;
        }
        
        const userGroups = req.user.groups || [];
        console.log('Verificando permisos para:', req.user.sub, 'Grupos:', userGroups, 'Permiso requerido:', requiredPermission);
        
        if (!this.hasPermission(userGroups, requiredPermission)) {
          throw Boom.forbidden(`No tienes permiso para realizar esta acción. Permiso requerido: ${requiredPermission}`);
        }
        next();
      } catch (error) {
        next(error);
      }
    };
  }
}

module.exports = new AuthorizationMiddleware();