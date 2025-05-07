// src/cognito/customMessage.js
exports.handler = async (event, context) => {
  try {
    console.log('CustomMessage event:', JSON.stringify(event, null, 2));

    // Determinar el tipo de mensaje
    const { triggerSource } = event;
    const { userName, request } = event;
    const { codeParameter, linkParameter } = request;

    let emailSubject = '';
    let emailMessage = '';

    switch (triggerSource) {
      case 'CustomMessage_AdminCreateUser':
        emailSubject = 'Bienvenido a Spotly - Tu cuenta ha sido creada';
        emailMessage = `
          <h2>¡Bienvenido a Spotly!</h2>
          <p>Tu cuenta ha sido creada con éxito.</p>
          <p>Tu nombre de usuario es: <strong>${userName}</strong></p>
          <p>Tu contraseña temporal es: <strong>${codeParameter}</strong></p>
          <p>Por favor, inicia sesión y cambia tu contraseña lo antes posible.</p>
          <p>Si no solicitaste esta cuenta, por favor ignora este correo.</p>
        `;
        break;

      case 'CustomMessage_ResendCode':
        emailSubject = 'Código de verificación - Spotly';
        emailMessage = `
          <h2>Verificación de cuenta Spotly</h2>
          <p>Tu código de verificación es: <strong>${codeParameter}</strong></p>
          <p>Este código expirará en 24 horas.</p>
          <p>Si no solicitaste este código, por favor ignora este correo.</p>
        `;
        break;

      case 'CustomMessage_ForgotPassword':
        emailSubject = 'Recuperación de contraseña - Spotly';
        emailMessage = `
          <h2>Recuperación de contraseña</h2>
          <p>Has solicitado restablecer tu contraseña.</p>
          <p>Tu código de verificación es: <strong>${codeParameter}</strong></p>
          <p>Este código expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, por favor ignora este correo.</p>
        `;
        break;

      case 'CustomMessage_UpdateUserAttribute':
        emailSubject = 'Verificación de cambio de email - Spotly';
        emailMessage = `
          <h2>Verificación de nuevo email</h2>
          <p>Has solicitado cambiar tu dirección de correo electrónico.</p>
          <p>Tu código de verificación es: <strong>${codeParameter}</strong></p>
          <p>Este código expirará en 24 horas.</p>
          <p>Si no solicitaste este cambio, por favor ignora este correo.</p>
        `;
        break;

      case 'CustomMessage_VerifyUserAttribute':
        emailSubject = 'Verificación de cuenta - Spotly';
        emailMessage = `
          <h2>Verificación de cuenta Spotly</h2>
          <p>Tu código de verificación es: <strong>${codeParameter}</strong></p>
          <p>Este código expirará en 24 horas.</p>
          <p>Si no solicitaste este código, por favor ignora este correo.</p>
        `;
        break;

      default:
        // Para cualquier otro caso, usar el mensaje por defecto
        return event;
    }

    // Actualizar el evento con los mensajes personalizados
    event.response.emailSubject = emailSubject;
    event.response.emailMessage = emailMessage;

    console.log('CustomMessage response:', JSON.stringify(event.response, null, 2));
    return event;
  } catch (error) {
    console.error('CustomMessage Error:', error);
    throw error;
  }
}; 