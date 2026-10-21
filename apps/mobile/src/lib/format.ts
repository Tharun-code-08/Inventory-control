/** Format an INR amount with Indian digit grouping (12,34,567.00). Falls back if Intl is limited. */
export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? Number(value) : (value ?? 0);
  if (!Number.isFinite(num)) return '₹0.00';
  try {
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}

/** Format an ISO date string or epoch-ms number into a readable date. */
export function formatDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(value);
  }
}
