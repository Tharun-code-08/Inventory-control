import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { fetchAllCursorPages } from '@/lib/fetch-cursor-pages';
import { dashboardKeys } from '@/hooks/use-dashboard';

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
  issueType?: string;
  issueReason: string;
  otherReason?: string | null;
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
  issueType: string;
  otherReason?: string;
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

export function useGoodsIssues(filters: GoodsIssueFilters = {}) {
  return useQuery({
    queryKey: giKeys.list(filters),
    queryFn: async () => {
      // The API caps a page at 100; follow the cursor for the rest.
      const rows = await fetchAllCursorPages<unknown>('/goods-issues', {
        take: Math.min(filters.take ?? 100, 100),
        shop_id: filters.shopId,
        status: filters.status,
      });
      return extractGiRows(rows);
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
        qc.invalidateQueries({ queryKey: dashboardKeys.all }),
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
