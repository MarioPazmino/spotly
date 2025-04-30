// src/cognito/preSignUp.js
exports.handler = async (event) => {
  console.log('PreSignUp triggered', JSON.stringify(event, null, 2));
  const { triggerSource, request } = event;
  // Valores de entorno
  const ADMIN_DOMAINS = process.env.ADMIN_DOMAINS ? process.env.ADMIN_DOMAINS.split(',') : [];
  const COGNITO_WEB_CLIENT_ID = process.env.COGNITO_WEB_CLIENT_ID;
  const COGNITO_MOBILE_CLIENT_ID = process.env.COGNITO_MOBILE_CLIENT_ID;
  // Determinar si el registro viene de la app web o móvil
  const clientId = event.callerContext.clientId;
  const isWebRegistration = clientId === COGNITO_WEB_CLIENT_ID;
  const isMobileRegistration = clientId === COGNITO_MOBILE_CLIENT_ID;
  // Extraer el email y dominio
  const email = request.userAttributes.email;
  const domain = email.substring(email.indexOf('@') + 1);
  // Por defecto, autoconfirmar email y teléfono
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;
  if (request.userAttributes.hasOwnProperty('phone_number')) {
    event.response.autoVerifyPhone = true;
  }
  // Definir tipo de usuario y pendiente de aprobación
  if (isWebRegistration) {
    // Los registros desde web se consideran admin_centro y requieren aprobación
    request.userAttributes['custom:role'] = 'admin_centro';
    request.userAttributes['custom:pendiente_aprobacion'] = 'true';
    request.userAttributes['custom:registration_source'] = 'web';
  } else if (isMobileRegistration) {
    // Los registros desde móvil se consideran clientes y se aprueban automáticamente
    request.userAttributes['custom:role'] = 'cliente';
    request.userAttributes['custom:pendiente_aprobacion'] = 'false';
    request.userAttributes['custom:registration_source'] = 'mobile';
  }
  console.log('PreSignUp completed', JSON.stringify(event, null, 2));
  return event;
};
