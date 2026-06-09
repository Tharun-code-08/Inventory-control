import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type PurchaseOrderStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type PurchaseOrderLifecycleStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' | 'CANCELLED';

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  rfqItemId?: string | null;
  lineDescription?: string | null;
  lineCategory?: string | null;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  orderQty: number;
  rate: number;
  lineValue: number;
  product?: {
    id?: string;
    description: string;
    productCode: string;
  };
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  poDate: string;
  shopId: string;
  rfqId?: string | null;
  shop?: { id: string; shopName?: string; shopNumber?: string };
  supplier: string;
  status: PurchaseOrderStatus;
  remarks: string | null;
  items: PurchaseOrderItem[];
  totalValue: number;
  createdAt: string;
  lifecycleStatus?: PurchaseOrderLifecycleStatus;
  receiptProgress?: Array<{
    productId: string;
    productCode?: string;
    orderedQty: number;
    receivedQty: number;
    remainingQty: number;
  }>;
};

export type PurchaseOrderFilters = {
  search?: string;
  status?: PurchaseOrderStatus;
  shopId?: string;
  page?: number;
  limit?: number;
};

export type PurchaseOrderListMeta = {
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasMore?: boolean;
};

export type PurchaseOrderListResponse = {
  data: PurchaseOrder[];
  meta?: PurchaseOrderListMeta;
};

export type PurchaseOrderEmailDelivery = {
  sent?: boolean;
  queued?: boolean;
  message?: string;
  to?: string;
  pdfAttached?: boolean;
  emailStatus?: string;
};

export type CreatePurchaseOrderResult = PurchaseOrder & {
  emailDelivery?: PurchaseOrderEmailDelivery;
};

export type CreatePurchaseOrderPayload = {
  shopId: string;
  poDate: string;
  poNumber?: string;
  supplier: string;
  remarks?: string;
  contractId?: string;
  rfqId?: string;
  idempotencyKey?: string;
  /** When true, newer APIs email the supplier as part of create. */
  sendToSupplier?: boolean;
  /** Create as CONFIRMED when emailing supplier. */
  confirmOnSend?: boolean;
  items: Array<{
    productId?: string;
    rfqItemId?: string;
    lineDescription?: string;
    lineCategory?: string;
    orderQty: number;
    rate: number;
  }>;
};

export type UpdatePurchaseOrderPayload = Partial<CreatePurchaseOrderPayload> & {
  ifUnmodifiedSince?: string;
};

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
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.shopId) params.set('shop_id', filters.shopId);
      const res = await api.get(`/purchase-orders?${params}`);
      return {
        data: (res.data.data ?? []) as PurchaseOrder[],
        meta: res.data.meta as PurchaseOrderListMeta | undefined,
      };
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePurchaseOrderPayload) => {
      const res = await api.post('/purchase-orders', payload);
      return res.data.data as CreatePurchaseOrderResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
    },
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ifUnmodifiedSince, ...payload }: UpdatePurchaseOrderPayload & { id: string }) => {
      const res = await api.patch(`/purchase-orders/${id}`, { ...payload, ifUnmodifiedSince }, {
        headers: ifUnmodifiedSince ? { 'If-Unmodified-Since': ifUnmodifiedSince } : undefined,
      });
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

export function useRequestPoCancel() {
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/purchase-orders/${id}/cancel/request`, { reason });
      return res.data.data ?? res.data;
    },
  });
}

export function useConfirmPoCancel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason, otp }: { id: string; reason: string; otp: string }) => {
      const res = await api.post(`/purchase-orders/${id}/cancel/confirm`, { reason, otp });
      return res.data.data as PurchaseOrder;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: poKeys.detail(variables.id) });
    },
  });
}

export function useSendPurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resend }: { id: string; resend?: boolean }) => {
      const res = await api.post(
        `/purchase-orders/${id}/send${resend ? '?resend=true' : ''}`,
      );
      return res.data.data ?? res.data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ['document-email-history', 'purchase-order', id] });
    },
  });
}
