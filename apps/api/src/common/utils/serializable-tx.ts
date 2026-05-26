import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

function isRetryableSerializationError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2034') return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('40001') || message.toLowerCase().includes('serialization');
}

export async function runSerializableTxWithRetry<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 30_000,
      });
    } catch (error) {
      if (isRetryableSerializationError(error) && attempt < maxAttempts) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Serializable transaction failed after retries');
}
