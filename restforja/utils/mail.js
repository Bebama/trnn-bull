var nodemailer = require('nodemailer');

function smtpConfigured(smtp) {
  return !!(smtp && smtp.host && smtp.user && smtp.pass && smtp.from);
}

function sendVerificationEmail(smtp, toEmail, code, boxName) {
  if (!smtpConfigured(smtp)) {
    return Promise.resolve({ sent: false, reason: 'SMTP no configurado' });
  }

  var transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port || 587),
    secure: !!smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  var mail = {
    from: smtp.from,
    to: toEmail,
    subject: (boxName || 'TRNN BULL CrossFit') + ' — código de verificación',
    text:
      'Tu código de verificación es: ' +
      code +
      '\n\nIntrodúcelo en la pantalla de verificación para completar el registro.',
    html:
      '<p>Tu código de verificación es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">' +
      code +
      '</p><p>Introdúcelo en la pantalla de verificación para completar el registro.</p>',
  };

  return transporter
    .sendMail(mail)
    .then(function () {
      return { sent: true };
    })
    .catch(function (err) {
      return { sent: false, reason: err.message || 'Error al enviar email' };
    });
}

module.exports = {
  smtpConfigured,
  sendVerificationEmail,
};
