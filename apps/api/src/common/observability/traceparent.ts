/**
 * Minimal W3C trace-context parser. We only need to validate that an incoming
 * `traceparent` header is well-formed before mirroring it onto the response
 * and the request-context store. We do not actually generate spans here —
 * that's deferred until OpenTelemetry is wired in.
 *
 * Format: `<version>-<trace-id>-<parent-id>-<flags>`
 *   version: 2 hex chars
 *   trace-id: 32 hex chars (must not be all zeros)
 *   parent-id: 16 hex chars (must not be all zeros)
 *   flags: 2 hex chars
 */
const TRACEPARENT_RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i;
const ZERO_TRACE = '0'.repeat(32);
const ZERO_SPAN = '0'.repeat(16);

export function parseTraceparent(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  const m = TRACEPARENT_RE.exec(trimmed);
  if (!m) return null;
  const [, , traceId, parentId] = m;
  if (traceId.toLowerCase() === ZERO_TRACE || parentId.toLowerCase() === ZERO_SPAN) {
    return null;
  }
  // Normalize to lowercase per spec.
  return trimmed.toLowerCase();
}
