/** Escape a value for interpolation into email HTML (text or attribute). */
export function escapeHtml(value: unknown): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A copy of `content` whose string fields are HTML-escaped. */
export function escapeFields<T extends object>(content: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(content)) {
    out[key] = typeof value === "string" ? escapeHtml(value) : value;
  }
  return out as T;
}
