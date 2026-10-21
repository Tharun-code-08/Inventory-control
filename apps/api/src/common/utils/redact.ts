/**
 * Walk an arbitrary JSON-shaped value and replace any value whose KEY matches
 * one of the sensitive name patterns with `[REDACTED]`. Used to scrub audit
 * payloads (oldValues/newValues) before they hit the audit_log table where
 * read access is broader than for the source row.
 *
 * Notes:
 *   - We only inspect keys, not values, because matching values to reasonable
 *     entropy/format heuristics produces too many false positives.
 *   - Cycles are guarded with a WeakSet — defensive against accidental
 *     `JSON.stringify`-unfriendly inputs.
 *   - Returns a new object; never mutates the caller's input.
 */
const SENSITIVE_KEY_RE =
  /(password|passwordhash|password_hash|token|tokenhash|token_hash|refresh|secret|csrf|apikey|api_key|authorization)/i;

const REDACTED = '[REDACTED]';

export function redactSensitive<T>(value: T): T {
  return walk(value, new WeakSet()) as T;
}

function walk(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  // Dates and Decimals have no meaningful own keys; rebuilding them as plain
  // objects would store {} in the audit JSON. Keep their serialised value.
  if (value instanceof Date) return value;
  if (isDecimalLike(value as object)) return String(value);
  if (seen.has(value as object)) return undefined;
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((entry) => walk(entry, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_RE.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = walk(v, seen);
    }
  }
  return out;
}

function isDecimalLike(value: object): boolean {
  return (
    typeof (value as { toFixed?: unknown }).toFixed === 'function' &&
    typeof (value as { isZero?: unknown }).isZero === 'function' &&
    typeof (value as { toNumber?: unknown }).toNumber === 'function'
  );
}
