const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

// Nunca rompe la petición si el correo falla: solo registra el error.
async function sendMail(to, subject, text) {
  if (!to) return;
  try {
    await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
  } catch (e) {
    console.error('Error enviando correo:', e.message);
  }
}

module.exports = { sendMail };
