import type { BrandingSnapshotV1 } from './branding.types';
import type { Prisma } from '@prisma/client';

/**
 * Type-safe cast from Prisma JsonValue to BrandingSnapshotV1.
 * Used when loading snapshots from database (stored as JSON).
 */
export function asBrandingSnapshot(
  value: Prisma.JsonValue | null | undefined,
): BrandingSnapshotV1 {
  if (!value) {
    throw new Error('Cannot cast null/undefined to BrandingSnapshotV1');
  }
  return value as BrandingSnapshotV1;
}

/**
 * Type-safe optional cast from Prisma JsonValue to BrandingSnapshotV1.
 * Returns null if value is null/undefined.
 */
export function asBrandingSnapshotOrNull(
  value: Prisma.JsonValue | null | undefined,
): BrandingSnapshotV1 | null {
  if (!value) return null;
  return value as BrandingSnapshotV1;
}
