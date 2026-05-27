import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export type DocumentSeriesRestart = 'NONE' | 'MONTHLY' | 'YEARLY';

export type DocumentSeriesRow = {
  docType: string;
  moduleLabel: string;
  prefix: string;
  startingNumber: number;
  padWidth: number;
  restartPeriod: DocumentSeriesRestart;
  shopScoped: boolean;
  enabled: boolean;
  useCategoryPrefix: boolean;
  isOverride: boolean;
  preview: string;
  currentSequence: number | null;
  sequenceBucket: string;
};

export type DocumentSeriesUpdateRow = {
  docType: string;
  prefix?: string;
  startingNumber?: number;
  padWidth?: number;
  restartPeriod?: DocumentSeriesRestart;
  shopScoped?: boolean;
  enabled?: boolean;
  useCategoryPrefix?: boolean;
};

export const documentSeriesKeys = {
  all: ['document-series'] as const,
  list: (tenant?: string | null, shopId?: string | null) =>
    [...documentSeriesKeys.all, 'list', tenant ?? 'anon', shopId ?? 'company'] as const,
};

function currentTenantKey() {
  const user = useAuthStore.getState().user;
  return user?.companyId ?? user?.id ?? 'anon';
}

function unwrapRows(payload: unknown): DocumentSeriesRow[] {
  if (Array.isArray(payload)) return payload as DocumentSeriesRow[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: DocumentSeriesRow[] }).data;
  }
  return [];
}

export function useDocumentSeries(shopId?: string | null) {
  const tenant = currentTenantKey();
  return useQuery({
    queryKey: documentSeriesKeys.list(tenant, shopId),
    queryFn: async () => {
      const res = await api.get('/settings/document-series', {
        params: shopId ? { shopId } : undefined,
      });
      return unwrapRows(res.data.data ?? res.data);
    },
  });
}

export function useUpdateDocumentSeries(shopId?: string | null) {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (rows: DocumentSeriesUpdateRow[]) => {
      if (shopId) {
        const res = await api.put(`/settings/document-series/shops/${shopId}`, { rows });
        return unwrapRows(res.data.data ?? res.data);
      }
      const res = await api.put('/settings/document-series', { rows });
      return unwrapRows(res.data.data ?? res.data);
    },
    onSuccess: (data) => {
      qc.setQueryData(documentSeriesKeys.list(tenant, shopId), data);
    },
  });
}

export function useDeleteDocumentSeriesOverride(shopId: string) {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (docType: string) => {
      const res = await api.delete(`/settings/document-series/shops/${shopId}/${docType}`);
      return unwrapRows(res.data.data ?? res.data);
    },
    onSuccess: (data) => {
      qc.setQueryData(documentSeriesKeys.list(tenant, shopId), data);
    },
  });
}
