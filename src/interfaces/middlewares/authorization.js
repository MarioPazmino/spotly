// src/interfaces/middlewares/authorization.js
const Boom = require('@hapi/boom');

// Clase para gestionar autorización basada en políticas
class Authorization {
  constructor() {
    // Mapeo de roles a permisos
    this.rolePermissions = {
      'super_admin': ['*'],
      'admin_centro': ['read:*', 'write:centro', 'update:centro', 'read:usuarios'],
      'cliente': ['read:public', 'write:reservas', 'read:propias']
    };
  }

  // Verificar si un rol tiene un permiso específico
  hasPermission(role, permission) {
    if (!role || !permission) return false;
    
    const permissions = this.rolePermissions[role] || [];
    
    // Verificar permisos específicos o wildcard
    return permissions.some(p => 
      p === '*' || 
      p === permission || 
      (p.endsWith(':*') && permission.startsWith(p.replace('*', '')))
    );
  }

  // Middleware para verificar permisos
  checkPermission(requiredPermission) {
    return (req, res, next) => {
      try {
        if (!req.user) {
          throw Boom.unauthorized('Usuario no autenticado');
        }

        const userRole = req.user.role;
        
        if (!this.hasPermission(userRole, requiredPermission)) {
          throw Boom.forbidden(`No tienes el permiso requerido: ${requiredPermission}`);
        }
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  // Helper para crear un middleware que verifique si el usuario es propietario
  checkOwnership(resourceGetterFn) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          throw Boom.unauthorized('Usuario no autenticado');
        }
        
        // Los super_admin siempre tienen acceso
        if (req.user.role === 'super_admin') {
          return next();
        }
        
        // Para otros roles, verificar propiedad
        const resource = await resourceGetterFn(req);
        
        if (!resource) {
          throw Boom.notFound('Recurso no encontrado');
        }
        
        // Si es admin_centro, verificar su centro
        if (req.user.role === 'admin_centro' && 
            resource.centroDeportivoId === req.user.centroDeportivoId) {
          return next();
        }
        
        // Para usuarios normales, verificar propiedad directa
        if (resource.userId === req.user.sub || resource.usuarioId === req.user.sub) {
          return next();
        }
        
        throw Boom.forbidden('No tienes permiso para acceder a este recurso');
      } catch (error) {
        next(error);
      }
    };
  }
}

const authorization = new Authorization();
module.exports = authorization;