// Builds firestore.rules from firestore.rules.template, filling in the allowed email
// from VITE_ALLOWED_EMAIL (environment, or .env.local / .env). Keeps the email out of git.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file); // never overrides real env vars
}

const email = (process.env.VITE_ALLOWED_EMAIL ?? '').trim().toLowerCase();
if (!/^[^\s@'"\\]+@[^\s@'"\\]+\.[^\s@'"\\]+$/.test(email)) {
  console.error(
    '✖ VITE_ALLOWED_EMAIL is missing or invalid. Set it in .env.local (see .env.example).',
  );
  process.exit(1);
}

const template = readFileSync('firestore.rules.template', 'utf8');
writeFileSync('firestore.rules', template.replaceAll('__ALLOWED_EMAIL__', email));
console.log(`✔ firestore.rules generated for ${email}`);
