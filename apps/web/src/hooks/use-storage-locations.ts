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

export function useStorageLocations(shopId?: string) {
  return useQuery({
    queryKey: [...keys.list(), shopId],
    queryFn: async () => {
      const res = await api.get('/storage-locations', { params: { shop_id: shopId } });
      return (res.data.data ?? []) as StorageLocation[];
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

