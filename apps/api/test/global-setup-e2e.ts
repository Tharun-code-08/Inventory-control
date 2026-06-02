import { execSync } from 'child_process';
import { resolve } from 'path';

/**
 * Prisma `db seed` must run from apps/api — from the monorepo root,
 * `npx prisma db seed --schema apps/api/prisma/schema.prisma` is a silent no-op.
 */
export default async function globalSetup() {
  if (!process.env.DATABASE_URL) return;
  const apiRoot = resolve(__dirname, '..');
  execSync('npx prisma db seed', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
