import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

/**
 * Pending Approvals feed backed by the `/approvals` API.
 *
 * Drives the Approvals page and the sidebar pending-count badge: high-value
 * or policy-gated documents (goods receipts, purchase orders, etc.) that a
 * manager must approve or reject before they post.
 */

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ApprovalRequest = {
  id: string;
  companyId: string;
  requestedBy: string;
  assignedTo: string;
  approvalType: string;
  referenceId: string;
  status: ApprovalStatus;
  documentNumber?: string | null;
  amount?: number | null;
  description?: string | null;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  requiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalFeed = {
  data: ApprovalRequest[];
  total: number;
  pendingCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export type ApprovalComment = {
  id: string;
  approvalId: string;
  userId: string;
  comment: string;
  createdAt: string;
};

export type ApprovalStats = { pending: number; approved: number; rejected: number };

const keys = {
  all: ['approvals'] as const,
  list: (status?: ApprovalStatus, page?: number) => [...keys.all, 'list', status ?? 'ALL', page ?? 1] as const,
  stats: () => [...keys.all, 'stats'] as const,
  pendingCount: () => [...keys.all, 'pending-count'] as const,
  comments: (id: string) => [...keys.all, 'comments', id] as const,
};

function unwrap<T>(payload: unknown): T {
  const env = payload as { data?: T };
  return (env?.data ?? payload) as T;
}

export function useApprovals(params?: { status?: ApprovalStatus; page?: number; limit?: number }) {
  const status = params?.status;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 20;
  return useQuery({
    queryKey: keys.list(status, page),
    queryFn: async (): Promise<ApprovalFeed> => {
      const res = await api.get('/approvals', { params: { status, page, limit } });
      const body = (res.data?.data ?? res.data) as ApprovalFeed;
      return {
        data: Array.isArray(body?.data) ? body.data : [],
        total: body?.total ?? 0,
        pendingCount: body?.pendingCount ?? 0,
        page: body?.page ?? page,
        limit: body?.limit ?? limit,
        hasMore: body?.hasMore ?? false,
      };
    },
  });
}

export function useApprovalStats() {
  return useQuery({
    queryKey: keys.stats(),
    queryFn: async (): Promise<ApprovalStats> => {
      const res = await api.get('/approvals/stats/summary');
      const body = unwrap<ApprovalStats>(res.data);
      return { pending: body?.pending ?? 0, approved: body?.approved ?? 0, rejected: body?.rejected ?? 0 };
    },
  });
}

export function usePendingApprovalCount(enabled = true) {
  return useQuery({
    queryKey: keys.pendingCount(),
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<number> => {
      const res = await api.get('/approvals/count/pending');
      const body = unwrap<{ count: number }>(res.data);
      return body?.count ?? 0;
    },
  });
}

export function useApprovalComments(id: string | null) {
  return useQuery({
    queryKey: keys.comments(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<ApprovalComment[]> => {
      const res = await api.get(`/approvals/${id}/comments`);
      const body = unwrap<ApprovalComment[]>(res.data);
      return Array.isArray(body) ? body : [];
    },
  });
}

export function useApproveApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      await api.post(`/approvals/${id}/approve`, { comment });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useRejectApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, rejectionReason, comment }: { id: string; rejectionReason: string; comment?: string }) => {
      await api.post(`/approvals/${id}/reject`, { rejectionReason, comment });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useAddApprovalComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      await api.post(`/approvals/${id}/comments`, { comment });
    },
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: keys.comments(vars.id) }),
  });
}

/** Map an approval type to the document detail route, for "View document" deep links. */
export function approvalDeepLink(a: ApprovalRequest): string | null {
  const t = (a.approvalType || '').toUpperCase();
  if (t.includes('GOODS_RECEIPT')) return `/goods-receipts/${a.referenceId}`;
  if (t.includes('GOODS_ISSUE')) return `/goods-issues/${a.referenceId}`;
  if (t.includes('PURCHASE_ORDER')) return `/purchase-orders/${a.referenceId}`;
  if (t.includes('SALES_ORDER')) return `/sales/${a.referenceId}`;
  if (t.includes('RFQ')) return `/rfqs/${a.referenceId}`;
  if (t.includes('CONTRACT')) return `/contracts`;
  return null;
}
