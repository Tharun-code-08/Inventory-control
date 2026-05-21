import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function isRetryableSerializableConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return true;
  }
  const msg = (error as Error | undefined)?.message?.toLowerCase() ?? '';
  return msg.includes('could not serialize access') || msg.includes('serialization failure');
}

export async function runSerializableTxWithRetry<T>(
  prisma: PrismaService,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableSerializableConflict(error) || attempt >= maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }

  throw lastError;
}
