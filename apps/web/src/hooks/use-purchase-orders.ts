import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type PurchaseOrderStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  orderQty: number;
  rate: number;
  lineValue: number;
  product: {
    description: string;
    productCode: string;
  };
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  poDate: string;
  shopId: string;
  supplier: string;
  status: PurchaseOrderStatus;
  remarks: string;
  items: PurchaseOrderItem[];
  totalValue: number;
  createdAt: string;
};

export type PurchaseOrderFilters = {
  search?: string;
  status?: PurchaseOrderStatus;
  shopId?: string;
  take?: number;
  cursor?: string;
};

export type CreatePurchaseOrderPayload = Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'totalValue' | 'status'> & {
  contractId?: string;
  items: Omit<PurchaseOrderItem, 'id' | 'lineValue' | 'product'>[];
};

export type UpdatePurchaseOrderPayload = Partial<CreatePurchaseOrderPayload>;

export const poKeys = {
  all: ['purchase-orders'] as const,
  lists: () => [...poKeys.all, 'list'] as const,
  list: (filters: PurchaseOrderFilters) => [...poKeys.lists(), filters] as const,
  details: () => [...poKeys.all, 'detail'] as const,
  detail: (id: string) => [...poKeys.details(), id] as const,
};

export function usePurchaseOrders(filters: PurchaseOrderFilters = {}) {
  return useQuery({
    queryKey: poKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.take) params.set('take', String(filters.take));
      if (filters.cursor) params.set('cursor', filters.cursor);
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.shopId) params.set('shop_id', filters.shopId);
      const res = await api.get(`/purchase-orders?${params}`);
      return res.data.data;
    },
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: poKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`);
      return res.data.data as PurchaseOrder;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseOrderPayload) => {
      const res = await api.post('/purchase-orders', payload);
      return res.data.data as PurchaseOrder;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdatePurchaseOrderPayload & { id: string }) => {
      const res = await api.patch(`/purchase-orders/${id}`, payload);
      return res.data.data as PurchaseOrder;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: poKeys.detail(variables.id) });
    },
  });
}

export function useConfirmPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/purchase-orders/${id}/confirm`);
      return res.data.data as PurchaseOrder;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
    },
  });
}

export function useCancelPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/purchase-orders/${id}/cancel`);
      return res.data.data as PurchaseOrder;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
    },
  });
}
