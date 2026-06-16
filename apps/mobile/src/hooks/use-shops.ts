import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';

export type Shop = {
  id: string;
  shopNumber: string;
  shopName: string;
  isActive: boolean;
};

export const shopKeys = {
  all: ['shops'] as const,
  lists: () => [...shopKeys.all, 'list'] as const,
};

export function useShops() {
  return useQuery({
    queryKey: shopKeys.lists(),
    queryFn: async () => {
      const res = await api.get('/shops');
      const payload = unwrapData<Shop[] | { data?: Shop[] }>(res.data);
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: Shop[] }).data)) {
        return (payload as { data: Shop[] }).data;
      }
      return [] as Shop[];
    },
    staleTime: 120_000,
  });
}
