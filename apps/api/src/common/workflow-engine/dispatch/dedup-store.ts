import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';

/**
 * Content-hash + TTL deduplication (Plan §8 "Deduplication": hash → TTL →
 * suppress). Distinct from the at-least-once idempotency key on the delivery
 * ledger: this suppresses *semantically duplicate* sends (same customer, same
 * message intent, within a window) even across different events — e.g. two
 * overlapping sweeps both deciding to remind the same invoice the same day.
 *
 * In-memory with lazy expiry: single-instance safe. A multi-instance deploy
 * should back this with Redis (same interface); noted for §10 scaling.
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
  private readonly seen = new Map<string, number>(); // hash → expiry epoch ms
  private static readonly DEFAULT_TTL_MS = 20 * 60 * 60 * 1000; // 20h

  /** True if this hash is already present (and unexpired). */
  isDuplicate(hash: string, now: Date = new Date()): boolean {
    const expiry = this.seen.get(hash);
    if (expiry === undefined) return false;
    if (expiry <= now.getTime()) {
      this.seen.delete(hash);
      return false;
    }
    return true;
  }

  /** Record a hash with a TTL. */
  remember(hash: string, now: Date = new Date(), ttlMs = DedupStore.DEFAULT_TTL_MS): void {
    this.seen.set(hash, now.getTime() + ttlMs);
    if (this.seen.size > 10_000) this.sweepExpired(now);
  }

  private sweepExpired(now: Date): void {
    for (const [hash, expiry] of this.seen) {
      if (expiry <= now.getTime()) this.seen.delete(hash);
    }
  }
}
