import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no longer reads .env files itself. Load apps/api/.env the way the
// CLI used to: variables already set (CI, PM2, the shell) take precedence.
loadEnv({ path: path.join(__dirname, '.env') });

// Paths are absolute so the root prisma.config.ts can re-export this config
// for commands run from the repo root (`npx prisma ... --schema apps/api/...`).
export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
    // The seed command is split on spaces, not run through a shell, so use a
    // path relative to where the CLI runs (repo root or apps/api): an absolute
    // one breaks on checkouts under a folder with a space in its name.
    seed: `ts-node --transpile-only ${path.relative(process.cwd(), path.join(__dirname, 'prisma', 'seed.ts'))}`,
  },
  datasource: {
    // `prisma generate` needs no database, so a missing URL must not throw
    // here (Docker and CI generate the client without DATABASE_URL).
    url: process.env.DATABASE_URL ?? '',
    shadowDatabaseUrl: process.env.PRISMA_SHADOW_DATABASE_URL,
  },
});
