import { buildMeta, clampTake, prismaCursorArgs } from './pagination';

describe('pagination helpers', () => {
  describe('clampTake', () => {
    it('defaults to 20 when undefined', () => {
      expect(clampTake(undefined)).toBe(20);
    });
    it('clamps to lower bound 1', () => {
      expect(clampTake(0)).toBe(1);
      expect(clampTake(-5)).toBe(1);
    });
    it('clamps to upper bound 100', () => {
      expect(clampTake(101)).toBe(100);
      expect(clampTake(9999)).toBe(100);
    });
    it('passes through valid values', () => {
      expect(clampTake(50)).toBe(50);
    });
  });

  describe('prismaCursorArgs', () => {
    it('returns take+1 when no cursor', () => {
      expect(prismaCursorArgs({ take: 20 })).toEqual({ take: 21 });
    });
    it('attaches cursor + skip:1 when cursor is provided', () => {
      expect(prismaCursorArgs({ take: 10, cursor: 'abc' })).toEqual({
        take: 11,
        skip: 1,
        cursor: { id: 'abc' },
      });
    });
  });

  describe('buildMeta', () => {
    it('reports hasMore=true and trims when overfetched', () => {
      const rows = Array.from({ length: 6 }, (_, i) => ({ id: String(i) }));
      const { items, meta } = buildMeta(rows, 5);
      expect(items).toHaveLength(5);
      expect(meta.hasMore).toBe(true);
      expect(meta.nextCursor).toBe('4');
    });

    it('reports hasMore=false at the tail', () => {
      const rows = [{ id: 'a' }, { id: 'b' }];
      const { items, meta } = buildMeta(rows, 5);
      expect(items).toHaveLength(2);
      expect(meta.hasMore).toBe(false);
      expect(meta.nextCursor).toBeNull();
    });
  });
});
