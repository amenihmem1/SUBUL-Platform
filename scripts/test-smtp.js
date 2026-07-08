// Simple SMTP test for Microsoft 365 outbound mail.
//
// Usage:  node scripts/test-smtp.js
//
// Connects to smtp.office365.com:587 with STARTTLS, authenticates as
// subul@smartovate.com, and sends a plain-text test message to
// alamissaoui.dev@gmail.com. Logs the full SMTP conversation so we can
// see exactly what M365 says at every step.

const path = require('path');
// nodemailer lives in backend/api/node_modules — resolve explicitly so
// this script runs from any working directory.
const nodemailer = require(path.join(__dirname, '..', 'backend', 'api', 'node_modules', 'nodemailer'));

const SMTP_HOST = 'smtp.office365.com';
const SMTP_PORT = 587;
const SMTP_USER = 'subul@smartovate.com';
const SMTP_PASS = 'Vamoscarajo123@';

const FROM_ADDR = 'subul@smartovate.com';
const FROM_NAME = 'Subul Platform';
const TO_ADDR   = 'alamissaoui.dev@gmail.com';

(async () => {
  const timestamp = new Date().toISOString();
  console.log(`[1/4] Building transport for ${SMTP_HOST}:${SMTP_PORT} ...`);

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,           // STARTTLS upgrade on 587
    requireTLS: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { minVersion: 'TLSv1.2' },
    logger: true,            // print SMTP commands
    debug:  true,            // print SMTP responses
  });

  console.log('[2/4] Verifying connection + auth ...');
  try {
    await transport.verify();
    console.log('     ✓ verify() OK — server reachable, auth accepted');
  } catch (err) {
    console.log();
    console.log('❌ verify() FAILED:', err && err.message ? err.message : err);
    if (err && err.responseCode === 535) {
      console.log('   → 535 = SMTP AUTH disabled on the mailbox.');
      console.log('     Fix in M365 admin → Users → subul@smartovate.com →');
      console.log('     Mail → Manage email apps → enable Authenticated SMTP.');
    }
    process.exit(1);
  }

  console.log(`[3/4] Sending plain-text test to ${TO_ADDR} ...`);
  const info = await transport.sendMail({
    from: { name: FROM_NAME, address: FROM_ADDR },
    to: TO_ADDR,
    subject: `SMTP test from Subul - ${timestamp}`,
    text: [
      'Hello,',
      '',
      'This is a plain-text SMTP test sent directly via smtp.office365.com',
      'from the Subul Platform mail account.',
      '',
      `Timestamp: ${timestamp}`,
      '',
      'If you received this, SMTP delivery from smartovate.com to Gmail',
      'is working end-to-end. The issue with the verification/reset',
      'emails is then content-related (URL reputation of subul.uk) or in',
      'the Graph API path, not in the underlying mail authentication.',
      '',
      '-- Subul Platform diagnostic',
    ].join('\n'),
  });

  console.log('[4/4] Send result:');
  console.log('     messageId :', info.messageId);
  console.log('     accepted  :', info.accepted);
  console.log('     rejected  :', info.rejected);
  console.log('     response  :', info.response);
  console.log();
  console.log('✅ SUCCESS — message accepted by smtp.office365.com');
  console.log(`   Now check ${TO_ADDR} (inbox AND spam folder).`);
  process.exit(0);
})().catch((err) => {
  console.log();
  console.log('❌ ERROR:', err && err.message ? err.message : err);
  if (err && err.responseCode) console.log('   responseCode :', err.responseCode);
  if (err && err.response)     console.log('   response     :', err.response);
  process.exit(2);
});
