function portalBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return '/api/v1';
  return `${configured.replace(/\/$/, '')}/api/v1`;
}

type Envelope<T> = {
  success?: boolean;
  data?: T;
  message?: string | string[];
  error?: { message?: string };
};

function extractError(payload: Envelope<unknown>, status: number): string {
  const msg = payload.message ?? payload.error?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg) return msg;
  return status === 401 ? 'Verification failed' : `Request failed (${status})`;
}

export async function portalGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${portalBaseUrl()}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  const json = (await res.json()) as Envelope<T>;
  if (!res.ok) throw new Error(extractError(json, res.status));
  return (json.data ?? json) as T;
}

export async function portalPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${portalBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Envelope<T>;
  if (!res.ok) throw new Error(extractError(json, res.status));
  return (json.data ?? json) as T;
}

export function supplierPortalSubmitUrl(rfqId?: string): string {
  const base = `${window.location.origin}/supplier-portal/submit`;
  if (!rfqId) return base;
  return `${base}?rfq=${encodeURIComponent(rfqId)}`;
}
