import { createHash } from 'node:crypto';

/**
 * Deterministic A/B variant assignment (Plan Phase 4 "A/B templates"). A given
 * (key, experiment) always maps to the same variant — no storage needed and
 * stable across restarts — via a hash of the pair modulo the variant count.
 * Weighted variants are supported by repeating a variant in the list.
 */
export function assignVariant<T extends string>(key: string, experimentId: string, variants: readonly T[]): T {
  if (variants.length === 0) throw new Error('assignVariant: variants must not be empty');
  const hash = createHash('sha256').update(`${experimentId}:${key}`).digest();
  // Use the first 4 bytes as an unsigned int for a stable bucket.
  const bucket = hash.readUInt32BE(0);
  return variants[bucket % variants.length];
}

/** Split ratio a key falls into for a two-arm test, for reporting. */
export function variantBucketPercent(key: string, experimentId: string): number {
  const hash = createHash('sha256').update(`${experimentId}:${key}`).digest();
  return hash.readUInt32BE(0) % 100;
}
