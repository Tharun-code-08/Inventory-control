export type CursorPage = {
  take: number;
  cursor?: string;
};

export function clampTake(take?: number) {
  const t = take ?? 20;
  if (t < 1) return 1;
  if (t > 100) return 100;
  return t;
}

export function prismaCursorArgs(page: CursorPage): { take: number; skip?: number; cursor?: { id: string }; skipCursor?: boolean } {
  const take = clampTake(page.take);
  if (!page.cursor) {
    return { take: take + 1 };
  }
  return { take: take + 1, skip: 1, cursor: { id: page.cursor } };
}

export function buildMeta<T extends { id: string }>(rows: T[], take: number) {
  const hasMore = rows.length > take;
  const items = hasMore ? rows.slice(0, take) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
  return { items, meta: { nextCursor, limit: take, hasMore } };
}
