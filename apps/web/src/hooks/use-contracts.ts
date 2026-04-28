import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Contract = {
  id: string;
  contractNumber: string;
  title: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  supplier?: { supplierName: string };
};

export type CreateContractPayload = {
  shopId?: string;
  supplierId: string;
  rfqId?: string;
  title: string;
  paymentTerms?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
  items: Array<{ productId?: string; description?: string; quantity: number; uom?: string; unitPrice: number }>;
};

const keys = {
  all: ['contracts'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useContracts() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      const res = await api.get('/contracts');
      return (res.data.data ?? []) as Contract[];
    },
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateContractPayload) => {
      const res = await api.post('/contracts', payload);
      return res.data.data as Contract;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useActivateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/contracts/${id}/activate`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

