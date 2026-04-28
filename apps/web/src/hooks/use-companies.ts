import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Company = {
  id: string;
  companyCode: string;
  companyName: string;
  address?: string | null;
  isActive: boolean;
};

export const companyKeys = {
  all: ['companies'] as const,
  list: () => [...companyKeys.all, 'list'] as const,
};

export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.list(),
    queryFn: async () => {
      const res = await api.get('/companies');
      return (res.data.data ?? []) as Company[];
    },
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Company>) => {
      const res = await api.post('/companies', payload);
      return res.data.data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.list() }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Company> & { id: string }) => {
      const res = await api.patch(`/companies/${id}`, payload);
      return res.data.data as Company;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.list() }),
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/companies/${id}`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: companyKeys.list() }),
  });
}

