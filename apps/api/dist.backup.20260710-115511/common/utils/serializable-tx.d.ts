import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
export declare function runSerializableTxWithRetry<T>(prisma: PrismaService, work: (tx: Prisma.TransactionClient) => Promise<T>, maxAttempts?: number): Promise<T>;
