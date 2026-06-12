import { getApiOrigin } from '@/api/client';

/** Resolve a server-relative upload path (/uploads/...) to an absolute URL. */
export function uploadAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiOrigin()}${path}`;
}
