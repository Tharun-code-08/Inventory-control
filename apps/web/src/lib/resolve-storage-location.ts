import type { StorageLocation } from '@/hooks/use-storage-locations';

/**
 * Resolve a storage location for a plant assignment during product bulk import.
 * Matches by code or name (case-insensitive). Auto-picks the only location when
 * the plant has exactly one active location and the cell is blank.
 */
export function resolveStorageLocationIdForImport(
  shopId: string,
  rawCode: string,
  locations: StorageLocation[],
): string | undefined {
  const active = locations.filter((loc) => loc.shopId === shopId && loc.isActive);
  const trimmed = rawCode.trim();

  if (trimmed) {
    const match = active.find(
      (loc) =>
        loc.code.toLowerCase() === trimmed.toLowerCase() ||
        loc.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!match) {
      throw new Error(
        `Storage location "${trimmed}" not found for this plant — use a code from the Storage Locations sheet`,
      );
    }
    return match.id;
  }

  if (active.length === 1) {
    return active[0].id;
  }

  if (active.length > 1) {
    throw new Error(
      'Storage Location Code is required — this plant has multiple storage locations (see template Storage Locations sheet)',
    );
  }

  return undefined;
}
