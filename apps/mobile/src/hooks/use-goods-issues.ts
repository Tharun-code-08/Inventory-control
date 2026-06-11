import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';

export type GoodsIssueStatus = 'DRAFT' | 'POSTED';

export type GoodsIssueItem = {
  id: string;
  productId: string;
  quantity: number;
  uom: string;
  product: { description: string; productCode: string };
};

export type GoodsIssue = {
  id: string;
  giNumber: string;
  giDate: string;
  shopId: string;
  issueReason: string;
  remarks: string | null;
  status: GoodsIssueStatus;
  items: GoodsIssueItem[];
  shop?: { id: string; shopName: string; shopNumber?: string };
};

export type GoodsIssueFilters = {
  shopId?: string;
  status?: GoodsIssueStatus;
  take?: number;
};

export type CreateGoodsIssuePayload = {
  giDate: string;
  shopId: string;
  issueType: string;
  issueReason: string;
  remarks?: string;
  items: Array<{ productId: string; quantity: number; uom: string }>;
};

export const giKeys = {
  all: ['goods-issues'] as const,
  lists: () => [...giKeys.all, 'list'] as const,
  list: (filters: GoodsIssueFilters) => [...giKeys.lists(), filters] as const,
  details: () => [...giKeys.all, 'detail'] as const,
  detail: (id: string) => [...giKeys.details(), id] as const,
};

function extractGiRows(payload: unknown): GoodsIssue[] {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) return data as GoodsIssue[];
  if (data && typeof data === 'object') {
    const source = data as { data?: unknown; items?: unknown[] };
    if (Array.isArray(source.data)) return source.data as GoodsIssue[];
    if (Array.isArray(source.items)) return source.items as GoodsIssue[];
  }
  return [];
}

export function useGoodsIssues(filters: GoodsIssueFilters = {}) {
  return useQuery({
    queryKey: giKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = { take: filters.take ?? 300 };
      if (filters.shopId) params.shop_id = filters.shopId;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/goods-issues', { params });
      return extractGiRows(res.data);
    },
    staleTime: 30_000,
  });
}

export function useGoodsIssue(id: string) {
  return useQuery({
    queryKey: giKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/goods-issues/${id}`);
      return unwrapData<GoodsIssue>(res.data);
    },
    enabled: !!id,
  });
}

export function useCreateGoodsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGoodsIssuePayload) => {
      const res = await api.post('/goods-issues', payload);
      return unwrapData<GoodsIssue>(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: giKeys.lists() }),
  });
}

export function usePostGoodsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/goods-issues/${id}/post`);
      return unwrapData<GoodsIssue>(res.data);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: giKeys.lists() });
      qc.invalidateQueries({ queryKey: giKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
