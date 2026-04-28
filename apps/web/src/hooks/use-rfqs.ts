import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Rfq = {
  id: string;
  rfqNumber: string;
  title: string;
  rfqDate: string;
  deadline?: string | null;
  status: string;
  suppliers: Array<{ supplierId: string; supplier?: { supplierName: string } }>;
  items: Array<{ id: string; description?: string | null; quantity: string; uom: string }>;
};

export type CreateRfqPayload = {
  shopId?: string;
  rfqDate?: string;
  deadline?: string;
  title: string;
  notes?: string;
  suppliers?: string[];
  items: Array<{ productId?: string; description?: string; quantity: number; uom?: string; specifications?: string }>;
};

const keys = {
  all: ['rfqs'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useRfqs() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      const res = await api.get('/rfqs');
      return (res.data.data ?? []) as Rfq[];
    },
  });
}

export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRfqPayload) => {
      const res = await api.post('/rfqs', payload);
      return res.data.data as Rfq;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useSendRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/rfqs/${id}/send`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

