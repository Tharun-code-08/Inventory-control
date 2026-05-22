import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type SalesQuotationItem = {
  id: string;
  productId: string;
  quantity: string | number;
  uom: string;
  unitPrice: string | number;
  lineValue: string | number;
  product?: { id: string; productCode?: string; description?: string };
};

export type SalesQuotation = {
  id: string;
  quoteNumber: string;
  quoteDate: string;
  validUntil?: string | null;
  status: string;
  customerId: string;
  shopId: string;
  totalValue?: string | number | null;
  salesOrderId?: string | null;
  customer?: { id: string; customerCode?: string; customerName: string };
  items?: SalesQuotationItem[];
  salesOrder?: { id: string; soNumber: string; status: string } | null;
};

export type CreateSalesQuotationPayload = {
  shopId?: string;
  customerId: string;
  quoteDate?: string;
  validUntil?: string;
  remarks?: string;
  items: Array<{ productId: string; quantity: number; uom?: string; unitPrice: number }>;
};

const keys = {
  all: ['sales-quotations'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useSalesQuotations(customerId?: string) {
  return useQuery({
    queryKey: customerId ? [...keys.list(), customerId] : keys.list(),
    queryFn: async () => {
      const res = await api.get('/sales-quotations', {
        params: customerId ? { customer_id: customerId } : undefined,
      });
      return (res.data.data ?? []) as SalesQuotation[];
    },
  });
}

export function useCreateSalesQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSalesQuotationPayload) => {
      const res = await api.post('/sales-quotations', payload);
      return res.data.data as SalesQuotation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}

export function useSendSalesQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-quotations/${id}/send`);
      return res.data.data as SalesQuotation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useAcceptSalesQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-quotations/${id}/accept`);
      return res.data.data as SalesQuotation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useConvertSalesQuotationToOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-quotations/${id}/convert-to-sales-order`);
      return res.data.data as SalesQuotation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
    },
  });
}
