import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { QUERY_STALE_TIME } from '@/lib/constants';

export type StorageLocation = {
  id: string;
  shopId: string;
  code: string;
  name: string;
  isActive: boolean;
};

const slKeys = {
  all: ['storage-locations'] as const,
  list: (shopId?: string) => [...slKeys.all, 'list', shopId ?? 'all'] as const,
};

function extractRows(payload: unknown): StorageLocation[] {
  if (Array.isArray(payload)) return payload as StorageLocation[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as { data?: unknown; items?: unknown[] };
  if (Array.isArray(source.items)) return source.items as StorageLocation[];
  if (Array.isArray(source.data)) return source.data as StorageLocation[];
  if (source.data && typeof source.data === 'object') {
    return extractRows(source.data);
  }
  return [];
}

export function useStorageLocations(shopId?: string) {
  return useQuery({
    queryKey: slKeys.list(shopId),
    queryFn: async () => {
      const res = await api.get('/storage-locations', {
        params: shopId ? { shop_id: shopId } : undefined,
      });
      return extractRows(res.data);
    },
    enabled: !!shopId,
    staleTime: QUERY_STALE_TIME.lists,
  });
}
