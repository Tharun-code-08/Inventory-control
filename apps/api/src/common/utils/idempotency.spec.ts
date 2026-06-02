import type { Prisma } from '@prisma/client';
import {
  getIdempotentResult,
  setIdempotentResult,
  tryGetIdempotentResult,
  trySetIdempotentResult,
} from './idempotency';

function makeTx(impl: { findUnique?: jest.Mock; upsert?: jest.Mock }) {
  return {
    idempotencyKey: {
      findUnique: impl.findUnique ?? jest.fn(),
      upsert: impl.upsert ?? jest.fn(),
    },
  } as unknown as Prisma.TransactionClient;
}

describe('idempotency helpers', () => {
  describe('getIdempotentResult', () => {
    it('returns null when key is undefined (no-op)', async () => {
      const findUnique = jest.fn();
      const tx = makeTx({ findUnique });
      const result = await getIdempotentResult(tx, undefined, 'scope');
      expect(result).toBeNull();
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('looks up the composed key when scope is provided', async () => {
      const findUnique = jest.fn().mockResolvedValue({ result: { ok: true } });
      const tx = makeTx({ findUnique });
      const result = await getIdempotentResult<{ ok: boolean }>(tx, 'k1', 'payment:create');
      expect(result).toEqual({ ok: true });
      expect(findUnique).toHaveBeenCalledWith({
        where: { key: 'payment:create:k1' },
        select: { result: true },
      });
    });

    it('returns null when nothing is stored', async () => {
      const findUnique = jest.fn().mockResolvedValue(null);
      const tx = makeTx({ findUnique });
      expect(await getIdempotentResult(tx, 'k1', 'scope')).toBeNull();
    });
  });

  describe('setIdempotentResult', () => {
    it('does nothing when key is undefined', async () => {
      const upsert = jest.fn();
      await setIdempotentResult(makeTx({ upsert }), undefined, { ok: true });
      expect(upsert).not.toHaveBeenCalled();
    });

    it('upserts under the composed key', async () => {
      const upsert = jest.fn();
      const tx = makeTx({ upsert });
      await setIdempotentResult(tx, 'k1', { paymentId: 'p1' }, 'user-1', 'payment:create');
      expect(upsert).toHaveBeenCalledTimes(1);
      const arg = upsert.mock.calls[0][0];
      expect(arg.where).toEqual({ key: 'payment:create:k1' });
      expect(arg.create.scope).toBe('payment:create');
      expect(arg.create.userId).toBe('user-1');
      expect(arg.create.result).toEqual({ paymentId: 'p1' });
    });

    it('writes a future expiresAt when ttlSeconds is set', async () => {
      const upsert = jest.fn();
      const tx = makeTx({ upsert });
      const before = Date.now();
      await setIdempotentResult(tx, 'k1', { ok: true }, undefined, 'scope', 60);
      const arg = upsert.mock.calls[0][0];
      const expiresAt = arg.create.expiresAt as Date;
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 60 * 1000 - 50);
    });
  });

  describe('tryGetIdempotentResult', () => {
    it('returns null when the lookup throws', async () => {
      const findUnique = jest.fn().mockRejectedValue(new Error('db down'));
      const tx = makeTx({ findUnique });
      await expect(tryGetIdempotentResult(tx, 'k1', 'scope')).resolves.toBeNull();
    });
  });

  describe('trySetIdempotentResult', () => {
    it('swallows persistence errors', async () => {
      const upsert = jest.fn().mockRejectedValue(new Error('db down'));
      const tx = makeTx({ upsert });
      await expect(trySetIdempotentResult(tx, 'k1', { ok: true })).resolves.toBeUndefined();
    });
  });
});
