/**
 * Resolve a server-relative upload path (e.g. /uploads/products/x.webp) to a
 * URL the browser can load. With VITE_API_URL set the asset lives on the API
 * origin; otherwise the dev proxy / same-origin deployment serves it as-is.
 */
export function uploadAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return path;
  return `${configured.replace(/\/$/, '')}${path}`;
}
