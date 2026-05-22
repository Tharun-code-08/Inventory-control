import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type SalesOrderItem = {
  id: string;
  productId: string;
  quantity: string | number;
  shippedQty?: string | number;
  uom: string;
  unitPrice: string | number;
  lineValue: string | number;
  product?: { id: string; productCode?: string; description?: string };
};

export type SalesOrder = {
  id: string;
  soNumber: string;
  orderDate: string;
  expectedDate?: string | null;
  customerId: string;
  shopId: string;
  status: string;
  remarks?: string | null;
  totalValue?: string | number | null;
  customer?: { id: string; customerCode?: string; customerName: string };
  shop?: { id: string; shopName: string; shopNumber: string };
  items?: SalesOrderItem[];
  salesQuotation?: { id: string; quoteNumber: string } | null;
};

export type CreateSalesOrderPayload = {
  shopId?: string;
  orderDate?: string;
  expectedDate?: string;
  customerId: string;
  remarks?: string;
  items: Array<{ productId: string; quantity: number; uom?: string; unitPrice: number }>;
};

export type UpdateSalesOrderPayload = Partial<CreateSalesOrderPayload>;

const keys = {
  all: ['sales-orders'] as const,
  list: () => [...keys.all, 'list'] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};

function extractRows(payload: unknown): SalesOrder[] {
  if (Array.isArray(payload)) return payload as SalesOrder[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as { data?: unknown; items?: unknown[] };
  if (Array.isArray(source.items)) return source.items as SalesOrder[];
  if (Array.isArray(source.data)) return source.data as SalesOrder[];
  return [];
}

export function useSalesOrders(filters?: { customerId?: string; status?: string }) {
  return useQuery({
    queryKey: [...keys.list(), filters?.customerId ?? 'all', filters?.status ?? 'all'],
    queryFn: async () => {
      const params: Record<string, string | number> = { take: 100 };
      if (filters?.customerId) params.customer_id = filters.customerId;
      if (filters?.status) params.status = filters.status;
      const res = await api.get('/sales-orders', { params });
      return extractRows(res.data?.data ?? res.data);
    },
  });
}

export function useSalesOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/sales-orders/${id}`);
      return res.data.data as SalesOrder;
    },
    enabled: enabled && !!id,
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

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateSalesOrderPayload & { id: string }) => {
      const res = await api.patch(`/sales-orders/${id}`, payload);
      return res.data.data as SalesOrder;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.detail(variables.id) });
    },
  });
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/sales-orders/${id}`);
      return id;
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
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.detail(id) });
    },
  });
}

export function useFulfillSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-orders/${id}/fulfill`);
      return res.data.data;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: keys.detail(id) });
    },
  });
}
