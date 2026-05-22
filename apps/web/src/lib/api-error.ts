/** Extract a user-visible message from an Axios/API error payload. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  const response = (err as { response?: { status?: number; data?: unknown } })?.response;
  const status = response?.status;

  if (!response) {
    const msg = (err as Error)?.message?.trim();
    if (msg?.toLowerCase().includes('network error')) {
      return 'Could not reach the API. Check your connection and try again.';
    }
    return msg || fallback;
  }

  if (status === 502 || status === 503 || status === 504) {
    return `API server unavailable (${status}). Wait a moment and try again.`;
  }

  const data = response.data;
  if (!data || typeof data !== 'object') {
    if (status === 404) return 'API endpoint not found. The server may need an update.';
    return (err as Error)?.message?.trim() || fallback;
  }

  const payload = data as Record<string, unknown>;

  const nested = payload.error;
  if (nested && typeof nested === 'object' && nested !== null) {
    const msg = (nested as { message?: string | string[] }).message;
    if (Array.isArray(msg)) return msg.filter(Boolean).join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
  }

  const top = payload.message;
  if (Array.isArray(top)) return top.filter(Boolean).join(', ');
  if (typeof top === 'string' && top.trim()) return top.trim();

  return fallback;
}
