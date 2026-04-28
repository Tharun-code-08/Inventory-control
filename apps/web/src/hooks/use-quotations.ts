import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Quotation = {
  id: string;
  quoteNumber: string;
  quoteDate: string;
  status: string;
  supplier?: { supplierName: string };
  rfq?: { rfqNumber: string; title: string };
};

export type CreateQuotationPayload = {
  rfqId: string;
  supplierId: string;
  quoteDate?: string;
  notes?: string;
  items: Array<{
    rfqItemId?: string;
    productId?: string;
    description?: string;
    quantity: number;
    uom?: string;
    specifications?: string;
    unitPrice: number;
  }>;
};

const keys = {
  all: ['quotations'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useQuotations() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      const res = await api.get('/quotations');
      return (res.data.data ?? []) as Quotation[];
    },
  });
}

export function useCreateQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateQuotationPayload) => {
      const res = await api.post('/quotations', payload);
      return res.data.data as Quotation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useSubmitQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/quotations/${id}/submit`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useAcceptAutoLinkQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/quotations/${id}/accept-auto-link`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

