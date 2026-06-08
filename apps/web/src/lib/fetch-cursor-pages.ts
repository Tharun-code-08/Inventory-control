import { api } from '@/api/client';

export type CursorPageMeta = {
  nextCursor?: string | null;
  hasMore?: boolean;
};

type CursorListResponse<T> = {
  data?: T[];
  meta?: CursorPageMeta;
};

const DEFAULT_MAX_PAGES = 20;

/**
 * Fetches all pages from a cursor-paginated list endpoint.
 * Stops when nextCursor is absent or maxPages is reached.
 */
export async function fetchAllCursorPages<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  maxPages = DEFAULT_MAX_PAGES,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  let page = 0;

  while (page < maxPages) {
    const res = await api.get(path, {
      params: {
        ...params,
        ...(cursor ? { cursor } : {}),
      },
    });
    const payload = (res.data?.data ?? res.data) as CursorListResponse<T> | T[];
    const rows = Array.isArray(payload) ? payload : (payload.data ?? []);
    const meta = Array.isArray(payload) ? (res.data?.meta as CursorPageMeta) : payload.meta;

    items.push(...rows);
    const next = meta?.nextCursor ?? null;
    if (!next) break;
    cursor = next;
    page += 1;
  }

  return items;
}
