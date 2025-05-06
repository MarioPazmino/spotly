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
        "read:comprobantes", "update:comprobantes", "delete:comprobantes"
      ],
      "cliente": [
        "list:centro", "read:centro",
        "read:public", "write:reservas", "cancel:propias",
        "update:perfil", "read:pagos_propios", "create:pagos",
        "read:cupon",
        "read:comprobantes_propios", "update:comprobantes_propios", "delete:comprobantes_propios"
      ]
    };
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
    return (userGroups) => {
      if (!this.hasPermission(userGroups, requiredPermission)) {
        throw Boom.forbidden(`Permiso requerido: ${requiredPermission}`);
      }
    };
  }
}

module.exports = new AuthorizationMiddleware();