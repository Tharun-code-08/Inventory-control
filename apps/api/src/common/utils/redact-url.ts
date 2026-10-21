const TOKEN_QUERY_KEYS = /^(token|t|key|sig|signature|code|otp|state)$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mask capability tokens in a request URL before it is logged or sent to
 * Sentry: long opaque path segments (portal links carry tokens in the path)
 * and token-like query values. UUID path segments are ids and are kept.
 */
export function redactUrl(url: string | undefined | null): string {
  if (!url) return '';
  const [path, query] = url.split('?', 2);
  const safePath = path
    .split('/')
    .map((seg) => (seg.length >= 24 && /^[A-Za-z0-9_.~%-]+$/.test(seg) && !UUID_RE.test(seg) ? '[redacted]' : seg))
    .join('/');
  if (!query) return safePath;
  const safeQuery = query
    .split('&')
    .map((pair) => {
      const [k] = pair.split('=', 1);
      return TOKEN_QUERY_KEYS.test(decodeURIComponent(k ?? '')) ? `${k}=[redacted]` : pair;
    })
    .join('&');
  return `${safePath}?${safeQuery}`;
}
