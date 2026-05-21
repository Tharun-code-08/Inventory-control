import { Prisma } from '@prisma/client';

const SCOPE_SEPARATOR = ':';

function compose(scope: string | undefined, key: string) {
  return scope ? `${scope}${SCOPE_SEPARATOR}${key}` : key;
}

export async function getIdempotentResult<T>(
  tx: Prisma.TransactionClient,
  key: string | undefined,
  scope?: string,
): Promise<T | null> {
  if (!key) return null;
  const composed = compose(scope, key);
  const found = await tx.idempotencyKey.findUnique({
    where: { key: composed },
    select: { result: true },
  });
  return (found?.result as T | undefined) ?? null;
}

export async function setIdempotentResult(
  tx: Prisma.TransactionClient,
  key: string | undefined,
  value: Prisma.InputJsonValue,
  userId?: string,
  scope?: string,
  ttlSeconds?: number,
) {
  if (!key) return;
  const composed = compose(scope, key);
  const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
  await tx.idempotencyKey.upsert({
    where: { key: composed },
    update: { result: value, userId: userId ?? null, expiresAt },
    create: { key: composed, scope: scope ?? null, result: value, userId: userId ?? null, expiresAt },
  });
}
