export function unwrapData<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') return payload as T;
  const envelope = payload as { data?: T };
  if ('data' in envelope && envelope.data !== undefined) return envelope.data as T;
  return payload as T;
}
