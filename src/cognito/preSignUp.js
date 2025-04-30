// src/cognito/preSignUp.js
exports.handler = async (event) => {
  console.log('PreSignUp triggered', JSON.stringify(event, null, 2));
  const { triggerSource, request } = event;

  // Valores de entorno
  const ADMIN_DOMAIN = process.env.ADMIN_DOMAINS; // Dominio único (no lista)
  const COGNITO_WEB_CLIENT_ID = process.env.COGNITO_WEB_CLIENT_ID;
  const COGNITO_MOBILE_CLIENT_ID = process.env.COGNITO_MOBILE_CLIENT_ID;

  // Determinar si el registro viene de la app web o móvil
  const clientId = event.callerContext.clientId;
  const isWebRegistration = clientId === COGNITO_WEB_CLIENT_ID;
  const isMobileRegistration = clientId === COGNITO_MOBILE_CLIENT_ID;

  // Extraer el email y dominio
  const email = request.userAttributes.email;
  const domain = email.substring(email.indexOf('@') + 1);

  // Autoconfirmar email (obligatorio por Cognito)
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  // Verificar si el email pertenece al dominio administrativo
  const isAdminDomain = ADMIN_DOMAIN 
    ? domain.toLowerCase() === ADMIN_DOMAIN.toLowerCase().trim() 
    : false;

  // Definir tipo de usuario y pendiente de aprobación
  if (isWebRegistration) {
    // Usuarios web son admins de centro y requieren aprobación
    request.userAttributes['role'] = 'admin_centro';
    request.userAttributes['pendiente_aprobacion'] = 'true';
    request.userAttributes['registration_source'] = 'web';

    // Pre-aprobar administradores del dominio administrativo
    if (isAdminDomain) {
      console.log(`Usuario de dominio administrativo ${email} - pre-aprobación aplicada`);
      request.userAttributes['pendiente_aprobacion'] = 'false';
    }
  } else if (isMobileRegistration) {
    // Usuarios móviles son clientes y se aprueban automáticamente
    request.userAttributes['role'] = 'cliente';
    request.userAttributes['pendiente_aprobacion'] = 'false';
    request.userAttributes['registration_source'] = 'mobile';
  } else {
    // Origen desconocido: marcar para revisión
    request.userAttributes['role'] = 'unknown';
    request.userAttributes['pendiente_aprobacion'] = 'true';
    request.userAttributes['registration_source'] = 'unknown';
    console.log(`Registro de origen desconocido: ${clientId}`);
  }

  console.log('PreSignUp completed', JSON.stringify(event, null, 2));
  return event;
};