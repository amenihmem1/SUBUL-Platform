/**
 * AWS SES SMTP smoke test (STARTTLS on 587 by default).
 *
 *   cd backend/api
 *   npm run test:smtp
 *
 * Env (same as Nest MailService; SES_* names still accepted as aliases):
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM
 *   SMTP_TO — recipient (default: alamissaoui.dev@gmail.com)
 */
const nodemailer = require('nodemailer');

async function main() {
  const user = process.env.SMTP_USER || process.env.SES_SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SES_SMTP_PASS;
  const from = process.env.MAIL_FROM || process.env.SES_FROM;
  const to = process.env.SMTP_TO || process.env.SES_TO || 'alamissaoui.dev@gmail.com';
  const host =
    process.env.SMTP_HOST ||
    process.env.SES_SMTP_HOST ||
    'email-smtp.eu-central-1.amazonaws.com';
  const port = Number(
    process.env.SMTP_PORT || process.env.SES_SMTP_PORT || 587,
  );
  const secureEnv = (process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const secure = secureEnv || port === 465 || port === 2465;

  if (!user || !pass || !from) {
    console.error(
      'Set SMTP_USER, SMTP_PASS, MAIL_FROM (verified SES identity in this region).',
    );
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'SES SMTP test',
      text: 'SES SMTP + TLS test OK.',
      html: '<p>SES SMTP + TLS test OK.</p>',
    });
    console.log('Sent:', info.messageId);
  } catch (err) {
    console.error('Send failed:', err.message);
    if (err.response) console.error(err.response);
    process.exit(1);
  }
}

main();
