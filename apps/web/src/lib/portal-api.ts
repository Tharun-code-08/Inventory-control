type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

function portalBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return '/api/v1';
  return `${configured.replace(/\/$/, '')}/api/v1`;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const p = payload as { message?: string | string[] };
    if (Array.isArray(p.message)) return p.message.join(', ');
    if (typeof p.message === 'string' && p.message.trim()) return p.message;
  }
  return fallback;
}

async function portalRequest<T>(
  method: 'GET' | 'POST',
  path: string,
  options?: { body?: unknown; params?: Record<string, string> },
): Promise<T> {
  const url = new URL(`${portalBaseUrl()}${path}`, window.location.origin);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value);
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
    body: method === 'POST' && options?.body != null ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  const payload = (await res.json().catch(() => ({}))) as ApiEnvelope<T> & {
    message?: string | string[];
  };

  if (!res.ok) {
    throw new Error(extractErrorMessage(payload, `Request failed (${res.status})`));
  }

  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data as T;
  }

  return payload as T;
}

export function portalGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  return portalRequest<T>('GET', path, { params });
}

export function portalPost<T>(path: string, body?: unknown): Promise<T> {
  return portalRequest<T>('POST', path, { body });
}

/** Public supplier portal link shown in RFQ emails and admin copy UI. */
export function supplierPortalSubmitUrl(rfqId?: string): string {
  const origin = window.location.origin.replace(/\/$/, '');
  if (!rfqId) return `${origin}/supplier-portal/submit`;
  return `${origin}/supplier-portal/submit?rfq=${encodeURIComponent(rfqId)}`;
}
