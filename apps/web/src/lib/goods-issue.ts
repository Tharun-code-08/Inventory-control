export const ISSUE_TYPES = [
  'Sales Order',
  'Production',
  'Maintenance',
  'Transfer',
  'Damage',
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export function formatGiDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Display label for issue reason / type column */
export function issueTypeLabel(reason: string): string {
  const trimmed = reason?.trim() ?? '';
  if (!trimmed) return '—';
  if (trimmed === 'Retail sales') return 'Sales Order';
  return trimmed;
}

/** Parse SO or other reference stored in remarks */
export function parseGiReference(remarks?: string | null): string {
  if (!remarks) return '—';
  const ref = remarks.match(/Reference:\s*(\S+)/i);
  if (ref?.[1]) return ref[1];
  const so = remarks.match(/\b(SO-\d+)\b/i);
  if (so?.[1]) return so[1];
  return '—';
}

export function buildGiRemarks(reference: string | undefined, notes: string): string {
  const parts: string[] = [];
  if (reference?.trim()) parts.push(`Reference: ${reference.trim()}`);
  if (notes.trim()) parts.push(notes.trim());
  return parts.join('\n');
}
