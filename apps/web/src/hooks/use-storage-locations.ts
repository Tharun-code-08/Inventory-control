import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type StorageLocation = {
  id: string;
  shopId: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

const keys = {
  all: ['storage-locations'] as const,
  list: () => [...keys.all, 'list'] as const,
};

function extractStorageLocationRows(payload: unknown): StorageLocation[] {
  if (Array.isArray(payload)) return payload as StorageLocation[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as { data?: unknown; items?: unknown[] };
  if (Array.isArray(source.items)) return source.items as StorageLocation[];
  if (Array.isArray(source.data)) return source.data as StorageLocation[];
  return [];
}

export function useStorageLocations(shopId?: string) {
  return useQuery({
    queryKey: [...keys.list(), shopId ?? 'all'],
    queryFn: async () => {
      const res = await api.get('/storage-locations', {
        params: shopId ? { shop_id: shopId } : undefined,
      });
      return extractStorageLocationRows(res.data?.data ?? res.data);
    },
  });
}

export function useCreateStorageLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<StorageLocation>) => {
      const res = await api.post('/storage-locations', payload);
      return res.data.data as StorageLocation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateStorageLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<StorageLocation> & { id: string }) => {
      const res = await api.patch(`/storage-locations/${id}`, payload);
      return res.data.data as StorageLocation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteStorageLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/storage-locations/${id}`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

