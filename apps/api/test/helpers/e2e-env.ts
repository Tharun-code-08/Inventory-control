/**
 * Captures environment variables that were set explicitly BEFORE the app's
 * load-env module runs (load-env loads .env files with `override: true`,
 * which would otherwise clobber them and silently point e2e tests at a
 * deployed database — this caused a staging/prod write incident).
 *
 * Import this module FIRST in e2e-bootstrap, then call restoreExplicitEnv()
 * inside createE2eApp() so explicit env always wins for tests.
 */
const SNAPSHOT_KEYS = [
  'NODE_ENV',
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'REFRESH_SECRET',
  'COOKIE_SECRET',
  'WEB_ORIGIN',
  'EXPORT_STORAGE_DIR',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'MAIL_TRANSPORT',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
] as const;

const explicitEnv: Record<string, string> = {};
for (const key of SNAPSHOT_KEYS) {
  const value = process.env[key];
  if (value !== undefined) explicitEnv[key] = value;
}

export const HAS_EXPLICIT_DATABASE_URL = 'DATABASE_URL' in explicitEnv;

export function restoreExplicitEnv(): void {
  if (!HAS_EXPLICIT_DATABASE_URL) {
    throw new Error(
      'E2E tests require DATABASE_URL to be set explicitly in the environment ' +
        '(not inherited from a .env file). Refusing to run against an implicit ' +
        'database — point DATABASE_URL at a disposable test database.',
    );
  }
  Object.assign(process.env, explicitEnv);
}
