const STOP_WORDS = new Set([
  'the',
  'of',
  'and',
  'private',
  'pvt',
  'ltd',
  'limited',
  'inc',
  'llc',
]);

export function computeCompanyInitials(name: string | null | undefined): string {
  const raw = (name ?? '').trim();
  if (!raw) return 'NA';
  const parts = raw
    .split(/[\s,]+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .filter(Boolean)
    .filter((part) => !STOP_WORDS.has(part));
  const letters = parts.length > 0 ? parts : raw.split(/\s+/);
  const first = letters[0]?.[0] ?? 'N';
  const second = letters[1]?.[0] ?? (letters[0]?.[1] ?? 'A');
  return `${String(first).toUpperCase()}${String(second).toUpperCase()}`;
}
