/**
 * Copies the canonical Smartovate/Subul certificate template from the frontend
 * into this package so Docker/API builds do not depend on ../../frontend at runtime.
 *
 * Run manually after editing frontend/lib/certifications/certificate_template.html:
 *   node scripts/sync-certificate-template.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, '..');
const repoRoot = path.join(apiRoot, '..', '..');
const srcFile = path.join(
  repoRoot,
  'frontend',
  'lib',
  'certifications',
  'certificate_template.html',
);
const destFile = path.join(
  apiRoot,
  'src',
  'certifications',
  'templates',
  'certificate_template.official.html',
);

if (!fs.existsSync(srcFile)) {
  console.warn(
    `[sync-certificate-template] Source not found (ok for CI-only builds): ${srcFile}`,
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(destFile), { recursive: true });
fs.copyFileSync(srcFile, destFile);
console.log(`[sync-certificate-template] Copied → ${destFile}`);
