export function unwrapData<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') return payload as T;
  const envelope = payload as { data?: T };
  if ('data' in envelope && envelope.data !== undefined) return envelope.data as T;
  return payload as T;
}

/** Extract a human-readable message from an Axios error response. */
export function extractApiError(error: unknown): string | undefined {
  const ax = error as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
  return (
    ax?.response?.data?.error?.message ??
    ax?.response?.data?.message ??
    undefined
  );
}
