export type BrowserCookieOptions = {
  maxAgeSeconds?: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
};

function defaultSecureFlag() {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

export function readBrowserCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const encoded = `${encodeURIComponent(name)}=`;
  const hit = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(encoded));
  if (!hit) return null;
  return decodeURIComponent(hit.slice(encoded.length));
}

export function writeBrowserCookie(name: string, value: string, options: BrowserCookieOptions = {}) {
  if (typeof document === 'undefined') return;
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path ?? '/'}`);
  if (typeof options.maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
  if (options.secure ?? defaultSecureFlag()) {
    parts.push('Secure');
  }
  document.cookie = parts.join('; ');
}

export function deleteBrowserCookie(name: string, path = '/') {
  writeBrowserCookie(name, '', {
    path,
    maxAgeSeconds: 0,
  });
}
