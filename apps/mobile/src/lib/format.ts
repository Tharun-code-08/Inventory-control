/** Format a number as currency (LKR). Falls back to toLocaleString if Intl is limited. */
export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(num)) return '0.00';
  try {
    return num.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return num.toFixed(2);
  }
}

/** Format an ISO date string (2024-01-15 or full ISO) into a readable date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}
