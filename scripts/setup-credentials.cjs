const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..');
const apiDir = path.join(repoRoot, 'apps', 'api');
const envExamplePath = path.join(apiDir, '.env.example');
const envPath = path.join(apiDir, '.env');

function randomSecret() {
  return crypto.randomBytes(48).toString('base64url');
}

function writeEnvFromTemplate() {
  if (!fs.existsSync(envExamplePath)) {
    throw new Error(`Missing template: ${envExamplePath}`);
  }

  const template = fs.readFileSync(envExamplePath, 'utf8');
  const replacements = {
    JWT_SECRET: randomSecret(),
    REFRESH_SECRET: randomSecret(),
    COOKIE_SECRET: randomSecret(),
  };

  const content = template
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${replacements.JWT_SECRET}`)
    .replace(/^REFRESH_SECRET=.*$/m, `REFRESH_SECRET=${replacements.REFRESH_SECRET}`)
    .replace(/^COOKIE_SECRET=.*$/m, `COOKIE_SECRET=${replacements.COOKIE_SECRET}`);

  fs.writeFileSync(envPath, content, 'utf8');
}

if (fs.existsSync(envPath)) {
  console.log('`apps/api/.env` already exists. No changes made.');
  console.log('Delete it first if you want fresh generated secrets.');
  process.exit(0);
}

writeEnvFromTemplate();
console.log('Created `apps/api/.env` with generated JWT/refresh/cookie secrets.');
console.log('You can now run: npm run dev');
