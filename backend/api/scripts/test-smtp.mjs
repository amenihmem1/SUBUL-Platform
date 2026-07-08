/**
 * @deprecated The old Microsoft Graph SMTP test lived here with embedded credentials (removed).
 * Use the SES script instead (same env names as the Nest API):
 *
 *   cd backend/api
 *   npm run test:smtp
 *
 * Requires: SMTP_USER, SMTP_PASS, MAIL_FROM (optional: SMTP_HOST, SMTP_PORT, SMTP_TO).
 */
console.error(
  '[test-smtp.mjs] Deprecated. Run: npm run test:smtp\n' +
    '(from backend/api; sets SMTP_* + MAIL_FROM — see scripts/ses-smtp-test.js).',
);
process.exit(1);
