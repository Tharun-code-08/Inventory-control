import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type GoodsReceiptStatus = 'DRAFT' | 'POSTED';

export type GoodsReceiptItem = {
  id: string;
  productId: string;
  quantity: number;
  uom: string;
  purchaseRate: number;
  lineValue: number;
  product: {
    description: string;
    productCode: string;
  };
};

export type GoodsReceipt = {
  id: string;
  grNumber: string;
  grDate: string;
  shopId: string;
  supplierName: string;
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
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.shopId) params.set('shopId', filters.shopId);
      const res = await api.get(`/goods-receipts?${params}`);
      return res.data.data;
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
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: grKeys.lists() });
      qc.invalidateQueries({ queryKey: grKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ['products'] });
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
