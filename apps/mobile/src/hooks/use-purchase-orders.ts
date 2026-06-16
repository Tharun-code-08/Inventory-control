import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { poKeys, dashboardKeys, alertKeys } from '@/lib/query-keys';
import { PAGE_SIZE, QUERY_STALE_TIME } from '@/lib/constants';

export type PurchaseOrderItem = {
  id: string;
  productId: string;
  lineDescription: string | null;
  lineCategory: string | null;
  currentStock: number;
  minStock: number;
  suggestedQty: number;
  orderQty: number;
  rate: number;
  lineValue: number;
  product?: { id: string; productCode: string; description: string };
};

export type ReceiptProgress = {
  productId: string;
  productCode?: string;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  poDate: string;
  shopId: string;
  supplier: string;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  lifecycleStatus: string;
  remarks: string | null;
  currency: string;
  totalValue: number | null;
  createdAt: string;
  updatedAt: string;
  createdById?: string | null;
  updatedById?: string | null;
  shop?: { id: string; shopName: string; shopNumber?: string };
  items: PurchaseOrderItem[];
  receiptProgress?: ReceiptProgress[];
};

export type POFilters = {
  page?: number;
  limit?: number;
  search?: string;
  shopId?: string;
  status?: string;
};

export type POListResult = {
  items: PurchaseOrder[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

function normalizePO(raw: unknown): PurchaseOrder {
  const p = raw as Record<string, unknown>;
  return {
    id: String(p.id ?? ''),
    poNumber: String(p.poNumber ?? ''),
    poDate: String(p.poDate ?? ''),
    shopId: String(p.shopId ?? ''),
    supplier: String(p.supplier ?? ''),
    status: (p.status as PurchaseOrder['status']) ?? 'DRAFT',
    lifecycleStatus: String(p.lifecycleStatus ?? p.status ?? ''),
    remarks: (p.remarks as string) ?? null,
    currency: String(p.currency ?? 'USD'),
    totalValue: p.totalValue != null ? Number(p.totalValue) : null,
    createdAt: String(p.createdAt ?? ''),
    updatedAt: String(p.updatedAt ?? ''),
    createdById: (p.createdById as string) ?? null,
    updatedById: (p.updatedById as string) ?? null,
    shop: p.shop as PurchaseOrder['shop'],
    items: Array.isArray(p.items) ? (p.items as PurchaseOrderItem[]) : [],
    receiptProgress: Array.isArray(p.receiptProgress) ? (p.receiptProgress as ReceiptProgress[]) : [],
  };
}

function normalizePOList(payload: unknown, filters: POFilters): POListResult {
  const envelope = unwrapData<Record<string, unknown>>(payload);
  const rows = Array.isArray(envelope)
    ? envelope
    : Array.isArray((envelope as any)?.items)
      ? (envelope as any).items
      : [];
  const items = (rows as unknown[]).map(normalizePO);
  const meta = (envelope as any)?.meta;
  const limit = Math.max(1, meta?.limit ?? filters.limit ?? PAGE_SIZE);
  const total = meta?.total ?? items.length;
  const page = meta?.page ?? filters.page ?? 1;
  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: meta?.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export function usePurchaseOrders(filters: POFilters = {}) {
  return useQuery({
    queryKey: poKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      params.limit = filters.limit ?? PAGE_SIZE;
      if (filters.search) params.search = filters.search;
      if (filters.shopId) params.shop_id = filters.shopId;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/purchase-orders', { params });
      return normalizePOList(res.data, filters);
    },
    staleTime: QUERY_STALE_TIME.lists,
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: poKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`);
      return normalizePO(unwrapData(res.data));
    },
    enabled: !!id,
  });
}

export function useConfirmPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/purchase-orders/${id}/confirm`);
      return normalizePO(unwrapData(res.data));
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}

export function useCancelPO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/purchase-orders/${id}/cancel`);
      return normalizePO(unwrapData(res.data));
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: poKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
