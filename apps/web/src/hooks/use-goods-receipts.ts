import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { dashboardKeys } from '@/hooks/use-dashboard';

export type GoodsReceiptStatus = 'DRAFT' | 'POSTED';

export type GoodsReceiptItem = {
  id: string;
  productId: string;
  quantity: number;
  uom: string;
  purchaseRate: number;
  lineValue: number;
  batchNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: string | null;
  storageLocationId?: string | null;
  product?: {
    description: string;
    productCode: string;
  } | null;
};

export type GoodsReceipt = {
  id: string;
  grNumber: string;
  grDate: string;
  shopId: string;
  supplierName: string;
  purchaseOrderId?: string;
  receiptType?: 'FULL' | 'PARTIAL';
  receiptSource?: 'PURCHASE_ORDER' | 'OUTSIDE';
  inwardShift?: 'DAY_SHIFT' | 'NIGHT_SHIFT' | null;
  supplierRef: string;
  remarks: string;
  status: GoodsReceiptStatus;
  items: GoodsReceiptItem[];
  totalValue: number;
  createdAt: string;
};

export type GoodsReceiptFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: GoodsReceiptStatus;
  shopId?: string;
};

export type CreateGoodsReceiptPayload = Omit<GoodsReceipt, 'id' | 'grNumber' | 'createdAt' | 'totalValue' | 'status'> & {
  items: Omit<GoodsReceiptItem, 'id' | 'lineValue' | 'product'>[];
};

export type UpdateGoodsReceiptPayload = Partial<CreateGoodsReceiptPayload>;

export const grKeys = {
  all: ['goods-receipts'] as const,
  lists: () => [...grKeys.all, 'list'] as const,
  list: (filters: GoodsReceiptFilters) => [...grKeys.lists(), filters] as const,
  details: () => [...grKeys.all, 'detail'] as const,
  detail: (id: string) => [...grKeys.details(), id] as const,
};

export function useGoodsReceipts(filters: GoodsReceiptFilters = {}) {
  return useQuery({
    queryKey: grKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.limit) params.set('take', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.shopId) params.set('shop_id', filters.shopId);
      const res = await api.get(`/goods-receipts?${params}`);
      const payload = res.data.data as
        | GoodsReceipt[]
        | {
            data?: GoodsReceipt[];
            items?: GoodsReceipt[];
            meta?: {
              total?: number;
              page?: number;
              limit?: number;
              totalPages?: number;
              hasMore?: boolean;
              nextCursor?: string | null;
            };
          }
        | undefined;
      const envelopeMeta = res.data.meta as
        | {
            total?: number;
            page?: number;
            limit?: number;
            totalPages?: number;
            hasMore?: boolean;
            nextCursor?: string | null;
          }
        | undefined;
      const itemsRaw = Array.isArray(payload)
        ? payload
        : (payload?.items ?? payload?.data ?? []);
      const items = itemsRaw.map((gr) => {
        const safeItems = Array.isArray(gr.items) ? gr.items : [];
        const computedTotal = safeItems.reduce((sum, line) => {
          const lineValue = Number(line?.lineValue ?? 0);
          return sum + (Number.isFinite(lineValue) ? lineValue : 0);
        }, 0);
        return {
          ...gr,
          items: safeItems,
          totalValue: Number(gr.totalValue ?? computedTotal),
        };
      });
      const meta = Array.isArray(payload) ? envelopeMeta : (payload?.meta ?? envelopeMeta);
      return {
        items,
        meta: {
          total: meta?.total ?? items.length,
          page: meta?.page ?? 1,
          limit: meta?.limit ?? (filters.limit ?? 10),
          totalPages: meta?.totalPages ?? 1,
          hasMore: meta?.hasMore ?? false,
          nextCursor: meta?.nextCursor ?? null,
        },
      };
    },
  });
}

export function useGoodsReceipt(id: string) {
  return useQuery({
    queryKey: grKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/goods-receipts/${id}`);
      return res.data.data as GoodsReceipt;
    },
    enabled: !!id,
  });
}

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGoodsReceiptPayload) => {
      const res = await api.post('/goods-receipts', payload);
      return res.data.data as GoodsReceipt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: grKeys.lists() });
    },
  });
}

export function useUpdateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateGoodsReceiptPayload & { id: string }) => {
      const res = await api.patch(`/goods-receipts/${id}`, payload);
      return res.data.data as GoodsReceipt;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: grKeys.lists() });
      qc.invalidateQueries({ queryKey: grKeys.detail(variables.id) });
    },
  });
}

export function usePostGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/goods-receipts/${id}/post`);
      return res.data.data as GoodsReceipt;
    },
    onSuccess: async (_data, id) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: grKeys.lists() }),
        qc.invalidateQueries({ queryKey: grKeys.detail(id) }),
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
        qc.invalidateQueries({ queryKey: dashboardKeys.all }),
        qc.invalidateQueries({ queryKey: ['alerts'] }),
      ]);
    },
  });
}

export function useDeleteGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/goods-receipts/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: grKeys.lists() });
    },
  });
}
