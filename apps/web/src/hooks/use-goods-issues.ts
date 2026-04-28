import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type GoodsIssueStatus = 'DRAFT' | 'POSTED';

export type GoodsIssueItem = {
  id: string;
  productId: string;
  quantity: number;
  uom: string;
  availableStockSnapshot: number;
  product: {
    description: string;
    productCode: string;
  };
};

export type GoodsIssue = {
  id: string;
  giNumber: string;
  giDate: string;
  shopId: string;
  issueReason: string;
  remarks: string;
  status: GoodsIssueStatus;
  items: GoodsIssueItem[];
  createdAt: string;
};

export type GoodsIssueFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: GoodsIssueStatus;
  shopId?: string;
};

export type CreateGoodsIssuePayload = Omit<GoodsIssue, 'id' | 'giNumber' | 'createdAt' | 'status'> & {
  items: Omit<GoodsIssueItem, 'id' | 'availableStockSnapshot' | 'product'>[];
};

export type UpdateGoodsIssuePayload = Partial<CreateGoodsIssuePayload>;

export const giKeys = {
  all: ['goods-issues'] as const,
  lists: () => [...giKeys.all, 'list'] as const,
  list: (filters: GoodsIssueFilters) => [...giKeys.lists(), filters] as const,
  details: () => [...giKeys.all, 'detail'] as const,
  detail: (id: string) => [...giKeys.details(), id] as const,
};

export function useGoodsIssues(filters: GoodsIssueFilters = {}) {
  return useQuery({
    queryKey: giKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.shopId) params.set('shopId', filters.shopId);
      const res = await api.get(`/goods-issues?${params}`);
      return res.data.data;
    },
  });
}

export function useGoodsIssue(id: string) {
  return useQuery({
    queryKey: giKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/goods-issues/${id}`);
      return res.data.data as GoodsIssue;
    },
    enabled: !!id,
  });
}

export function useCreateGoodsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGoodsIssuePayload) => {
      const res = await api.post('/goods-issues', payload);
      return res.data.data as GoodsIssue;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: giKeys.lists() });
    },
  });
}

export function useUpdateGoodsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateGoodsIssuePayload & { id: string }) => {
      const res = await api.patch(`/goods-issues/${id}`, payload);
      return res.data.data as GoodsIssue;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: giKeys.lists() });
      qc.invalidateQueries({ queryKey: giKeys.detail(variables.id) });
    },
  });
}

export function usePostGoodsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/goods-issues/${id}/post`);
      return res.data.data as GoodsIssue;
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: giKeys.lists() });
      qc.invalidateQueries({ queryKey: giKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteGoodsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/goods-issues/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: giKeys.lists() });
    },
  });
}
