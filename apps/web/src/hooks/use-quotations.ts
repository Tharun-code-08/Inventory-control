import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type QuotationItem = {
  id: string;
  rfqItemId?: string | null;
  quantity: string | number;
  uom: string;
  unitPrice: string | number;
  lineValue: string | number;
  description?: string | null;
  specifications?: string | null;
  product?: { productCode?: string; description?: string } | null;
  rfqItem?: { id?: string; specifications?: string | null } | null;
};

export type Quotation = {
  id: string;
  quoteNumber: string;
  quoteDate: string;
  status: string;
  rfqId?: string;
  notes?: string | null;
  supplier?: { id?: string; supplierName: string; email?: string | null };
  rfq?: { id?: string; rfqNumber: string; title: string };
  items?: QuotationItem[];
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

export function useQuotations(rfqId?: string) {
  return useQuery({
    queryKey: rfqId ? [...keys.list(), rfqId] : keys.list(),
    queryFn: async () => {
      const res = await api.get('/quotations', {
        params: rfqId ? { rfq_id: rfqId } : undefined,
      });
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

