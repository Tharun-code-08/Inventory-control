/**
 * Key for one document being created. Reused on retry so a request that timed
 * out after the server saved it replays instead of creating a duplicate.
 */
export function newIdempotencyKey(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `m-${Date.now().toString(36)}-${rand()}${rand()}`;
}
