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
  remarks: string | null;
  status: GoodsIssueStatus;
  itemCount?: number;
  items: GoodsIssueItem[];
  createdAt: string;
  shop?: {
    id: string;
    shopName: string;
    shopNumber?: string;
  };
};

export type GoodsIssueFilters = {
  shopId?: string;
  status?: GoodsIssueStatus;
  take?: number;
};

export type CreateGoodsIssuePayload = {
  giDate: string;
  shopId: string;
  issueReason: string;
  remarks?: string;
  items: Array<{ productId: string; quantity: number; uom: string }>;
};

export type UpdateGoodsIssuePayload = Partial<CreateGoodsIssuePayload>;

export const giKeys = {
  all: ['goods-issues'] as const,
  lists: () => [...giKeys.all, 'list'] as const,
  list: (filters: GoodsIssueFilters) => [...giKeys.lists(), filters] as const,
  details: () => [...giKeys.all, 'detail'] as const,
  detail: (id: string) => [...giKeys.details(), id] as const,
};

function extractGiRows(payload: unknown): GoodsIssue[] {
  if (Array.isArray(payload)) return normalizeGiList(payload as GoodsIssue[]);
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as { data?: unknown; items?: unknown[] };
  if (Array.isArray(source.items)) return normalizeGiList(source.items as GoodsIssue[]);
  if (Array.isArray(source.data)) return normalizeGiList(source.data as GoodsIssue[]);
  return [];
}

function normalizeGiList(rows: GoodsIssue[]): GoodsIssue[] {
  return rows.map((row) => {
    const itemCount =
      typeof row.itemCount === 'number'
        ? row.itemCount
        : Array.isArray(row.items)
          ? row.items.length
          : 0;
    return {
      ...row,
      itemCount,
      items: Array.isArray(row.items) ? row.items : [],
    };
  });
}

function unwrapGiPayload<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') return payload as T;
  const source = payload as { data?: unknown };
  if (source.data !== undefined) return source.data as T;
  return payload as T;
}

export function useGoodsIssues(filters: GoodsIssueFilters = {}) {
  return useQuery({
    queryKey: giKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = {
        take: filters.take ?? 300,
      };
      if (filters.shopId) params.shop_id = filters.shopId;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/goods-issues', { params });
      const payload = unwrapGiPayload<unknown>(res.data);
      return extractGiRows(payload);
    },
    staleTime: 30_000,
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
    onSuccess: async (_data, id) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: giKeys.lists() }),
        qc.invalidateQueries({ queryKey: giKeys.detail(id) }),
        qc.invalidateQueries({ queryKey: ['products'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
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
