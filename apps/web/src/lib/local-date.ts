/**
 * The user's local calendar date as YYYY-MM-DD. `toISOString()` gives the UTC
 * date, which is still yesterday in India until 05:30.
 */
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
