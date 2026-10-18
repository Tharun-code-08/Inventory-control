import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '@/common/cache/redis.provider';

/**
 * Content-hash + TTL deduplication (Plan §8 "Deduplication": hash → TTL →
 * suppress). Distinct from the at-least-once idempotency key on the delivery
 * ledger: this suppresses *semantically duplicate* sends (same customer, same
 * message intent, within a window) even across different events.
 *
 * Redis-backed so it is correct across instances (PM2 cluster / multiple pods):
 * `SET key 1 NX PX ttl` is atomic — exactly one caller gets the send, the rest
 * see a duplicate. Fails open (treats as new) if Redis is unavailable, so a
 * cache outage never *blocks* delivery.
 */
export interface DedupKeyParts {
  readonly companyId: string;
  readonly customerId: string;
  readonly invoiceId: string;
  readonly tone: string;
  /** Bucket that bounds the window, e.g. the yyyy-mm-dd of `now`. */
  readonly bucket: string;
}

export function contentHash(parts: DedupKeyParts): string {
  return createHash('sha256')
    .update([parts.companyId, parts.customerId, parts.invoiceId, parts.tone, parts.bucket].join('|'))
    .digest('hex');
}

/** The yyyy-mm-dd bucket (UTC) for a timestamp — one send per tone per day. */
export function dayBucket(now: Date): string {
  return now.toISOString().slice(0, 10);
}

@Injectable()
export class DedupStore {
  private readonly logger = new Logger(DedupStore.name);
  private static readonly DEFAULT_TTL_MS = 20 * 60 * 60 * 1000; // 20h

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Atomically claim a hash. Returns true if this caller is the first to see it
   * within the TTL (i.e. NOT a duplicate — proceed to send), false if a
   * duplicate. Fails open (true) on Redis errors so delivery is never blocked.
   */
  async markIfNew(hash: string, _now: Date = new Date(), ttlMs = DedupStore.DEFAULT_TTL_MS): Promise<boolean> {
    try {
      const res = await this.redis.set(`wf:dedup:${hash}`, '1', 'PX', ttlMs, 'NX');
      return res === 'OK';
    } catch (err) {
      this.logger.warn(`dedup check failed open (${(err as Error).message})`);
      return true;
    }
  }
}
