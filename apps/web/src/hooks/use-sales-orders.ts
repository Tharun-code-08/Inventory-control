import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type SalesOrder = {
  id: string;
  soNumber: string;
  orderDate: string;
  customerId?: string;
  status: string;
  customer?: { customerName: string };
  totalValue?: string | number | null;
};

export type CreateSalesOrderPayload = {
  shopId?: string;
  orderDate?: string;
  expectedDate?: string;
  customerId: string;
  remarks?: string;
  items: Array<{ productId: string; quantity: number; uom?: string; unitPrice: number }>;
};

const keys = {
  all: ['sales-orders'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useSalesOrders() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      const res = await api.get('/sales-orders');
      return (res.data.data ?? []) as SalesOrder[];
    },
  });
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSalesOrderPayload) => {
      const res = await api.post('/sales-orders', payload);
      return res.data.data as SalesOrder;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-orders/${id}/confirm`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useFulfillSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-orders/${id}/fulfill`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

