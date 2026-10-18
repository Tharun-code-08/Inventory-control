import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Prisma 7 connects through a driver adapter instead of its own query engine.
 * Every PrismaClient (the API service, seed and maintenance scripts) uses
 * node-postgres with the same DATABASE_URL.
 */
export function createPgAdapter(connectionString = process.env.DATABASE_URL): PrismaPg {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new PrismaPg({ connectionString });
}
