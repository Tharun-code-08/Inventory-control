import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export type Company = {
  id: string;
  companyCode: string;
  companyName: string;
  address?: string | null;
  isActive: boolean;
  brandingProfileId?: string | null;
};

export const companyKeys = {
  all: ['companies'] as const,
  list: (tenant?: string | null) => [...companyKeys.all, 'list', tenant ?? 'anon'] as const,
};

function currentTenantKey() {
  const user = useAuthStore.getState().user;
  return user?.companyId ?? user?.id ?? 'anon';
}

function extractCompanyRows(payload: unknown): Company[] {
  if (Array.isArray(payload)) return payload as Company[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as { data?: unknown; items?: unknown[] };
  if (Array.isArray(source.items)) return source.items as Company[];
  if (Array.isArray(source.data)) return source.data as Company[];
  return [];
}

export function useCompanies() {
  const tenant = currentTenantKey();
  return useQuery({
    queryKey: companyKeys.list(tenant),
    queryFn: async () => {
      const res = await api.get('/companies');
      return extractCompanyRows(res.data?.data ?? res.data);
    },
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (payload: Partial<Company>) => {
      const res = await api.post('/companies', payload);
      return res.data.data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.list(tenant) }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Company> & { id: string }) => {
      const res = await api.patch(`/companies/${id}`, payload);
      return res.data.data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.list(tenant) }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/companies/${id}`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.list(tenant) }),
  });
}

