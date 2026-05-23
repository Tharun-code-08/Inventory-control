import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export type GstHsnMatch = {
  code: string;
  description: string;
};

export const gstHsnKeys = {
  all: ['gst-hsn'] as const,
  search: (q: string) => [...gstHsnKeys.all, q] as const,
};

function extractMatches(payload: unknown): GstHsnMatch[] {
  if (!payload || typeof payload !== 'object') return [];
  const envelope = payload as { data?: GstHsnMatch[] | { data?: GstHsnMatch[] } };
  const inner = envelope.data;
  const rows = Array.isArray(inner)
    ? inner
    : inner && typeof inner === 'object' && Array.isArray(inner.data)
      ? inner.data
      : [];
  return rows.filter((row) => row.code && row.description);
}

export function useGstHsnSearch(query: string, enabled: boolean) {
  const q = query.trim();
  return useQuery({
    queryKey: gstHsnKeys.search(q),
    queryFn: async () => {
      const res = await api.get('/products/hsn/search', { params: { q } });
      return extractMatches(res.data);
    },
    enabled: enabled && q.length >= 3,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
