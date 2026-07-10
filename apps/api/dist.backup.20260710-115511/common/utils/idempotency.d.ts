import { Prisma } from '@prisma/client';
export declare function getIdempotentResult<T>(tx: Prisma.TransactionClient, key: string | undefined, scope?: string): Promise<T | null>;
export declare function setIdempotentResult(tx: Prisma.TransactionClient, key: string | undefined, value: Prisma.InputJsonValue, userId?: string, scope?: string, ttlSeconds?: number): Promise<void>;
export declare function tryGetIdempotentResult<T>(tx: Prisma.TransactionClient, key: string | undefined, scope?: string): Promise<T | null>;
export declare function trySetIdempotentResult(tx: Prisma.TransactionClient, key: string | undefined, value: Prisma.InputJsonValue, userId?: string, scope?: string, ttlSeconds?: number): Promise<void>;
