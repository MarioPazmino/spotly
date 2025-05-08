//src/interfaces/middlewares/CognitoAuthMiddleware.js
const Boom = require('@hapi/boom');

class CognitoAuthMiddleware {
  // Método para extraer y validar información de autenticación
  async validateAuth(claims, clientId) {
    if (!claims.sub) {
      throw Boom.unauthorized('Token inválido o ausente');
    }

    // Validar cliente
    const isMobileClient = clientId === process.env.COGNITO_MOBILE_CLIENT_ID;
    const isWebClient = clientId === process.env.COGNITO_WEB_CLIENT_ID;

    // Validar que el cliente sea válido
    if (!isMobileClient && !isWebClient) {
      console.error(`Cliente no reconocido: ${clientId}`);
      throw Boom.unauthorized('Cliente no autorizado');
    }

    // Crear un objeto usuario con la estructura de la entidad Usuario
    const user = {
      userId: claims.sub,
      email: claims.email,
      name: claims.name || claims.nickname || claims.email.split('@')[0],
      picture: claims.picture || null,
      registrationSource: claims.identities 
        ? JSON.parse(claims.identities)[0]?.providerName 
        : 'cognito',
      role: claims['custom:role'] || 'cliente',
      pendienteAprobacion: claims['custom:pendiente_aprobacion'] || null,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Mantener grupos para validaciones internas
      groups: claims['cognito:groups'] 
        ? claims['cognito:groups'].split(',') 
        : []
    };

    // Validar roles según el cliente
    if (isMobileClient) {
      // Usuarios móviles solo pueden ser clientes
      if (user.role !== 'cliente') {
        console.error(`Intento de acceso móvil con rol no permitido: ${user.email} (${user.role})`);
        throw Boom.forbidden('Los usuarios móviles solo pueden acceder como clientes');
      }
    } else if (isWebClient) {
      // Usuarios web pueden ser admin_centro o super_admin
      if (user.role === 'admin_centro') {
        // Validar estado de aprobación para admin_centro
        if (user.pendienteAprobacion === 'true') {
          console.error(`Admin centro pendiente de aprobación intentando acceder: ${user.email}`);
          throw Boom.forbidden('Tu cuenta está pendiente de aprobación por un superadministrador');
        }
        
        // Verificar que esté en el grupo correcto
        if (!user.groups.includes('admin_centro')) {
          console.error(`Admin centro no está en el grupo correcto: ${user.email}`);
          throw Boom.forbidden('Tu cuenta no tiene los permisos necesarios');
        }
      } else if (user.role === 'super_admin') {
        // Verificar que super_admin esté en el grupo correcto
        if (!user.groups.includes('super_admin')) {
          console.error(`Super admin no está en el grupo correcto: ${user.email}`);
          throw Boom.forbidden('Tu cuenta no tiene los permisos necesarios');
        }
      }
    }

    return user;
  }

  // Middleware para AWS Lambda
  async authenticate(event) {
    try {
      const claims = event?.requestContext?.authorizer?.claims || {};
      const clientId = event?.requestContext?.authorizer?.clientId;
      return await this.validateAuth(claims, clientId);
    } catch (error) {
      throw Boom.unauthorized('Autenticación fallida: ' + error.message);
    }
  }

  // Middleware para Express
  authenticateExpress() {
    return (req, res, next) => {
      // En Express, simulamos la estructura de evento de API Gateway
      // Aquí deberías implementar la lógica para extraer el token y validarlo
      // Por ahora, como estamos en desarrollo, permitimos todas las solicitudes
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
        updatedAt: new Date().toISOString()
      };
      next();
    };
  }
}

module.exports = new CognitoAuthMiddleware();