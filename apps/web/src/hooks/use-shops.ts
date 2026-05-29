import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export type Shop = {
  id: string;
  shopNumber: string;
  shopName: string;
  taxId?: string | null;
  address: string;
  contactPerson: string;
  mobile: string;
  email: string;
  companyId?: string | null;
  company?: {
    id: string;
    companyCode: string;
    companyName: string;
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateShopPayload = {
  shopNumber: string;
  shopName: string;
  taxId?: string;
  address: string;
  contactPerson: string;
  mobile: string;
  email: string;
  companyId?: string | null;
  isActive?: boolean;
};

export type UpdateShopPayload = Partial<CreateShopPayload> & { id: string };

export const shopKeys = {
  all: ['shops'] as const,
  lists: (tenant?: string | null) => [...shopKeys.all, 'list', tenant ?? 'anon'] as const,
  details: (tenant?: string | null) => [...shopKeys.all, 'detail', tenant ?? 'anon'] as const,
  detail: (tenant: string | null | undefined, id: string) => [...shopKeys.details(tenant), id] as const,
};

function currentTenantKey() {
  const user = useAuthStore.getState().user;
  return user?.companyId ?? user?.id ?? 'anon';
}

export function useShops() {
  const tenant = currentTenantKey();
  return useQuery({
    queryKey: shopKeys.lists(tenant),
    queryFn: async () => {
      const res = await api.get('/shops', { params: { take: 100 } });
      const payload = res.data.data;
      if (Array.isArray(payload)) return payload as Shop[];
      if (Array.isArray(payload?.data)) return payload.data as Shop[];
      return [] as Shop[];
    },
  });
}

export function useShop(id: string) {
  const tenant = currentTenantKey();
  return useQuery({
    queryKey: shopKeys.detail(tenant, id),
    queryFn: async () => {
      const res = await api.get(`/shops/${id}`);
      return res.data.data as Shop;
    },
    enabled: !!id,
  });
}

export function useCreateShop() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (payload: CreateShopPayload) => {
      const res = await api.post('/shops', payload);
      return res.data.data as Shop;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shopKeys.lists(tenant) });
    },
  });
}

export function useUpdateShop() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateShopPayload) => {
      const res = await api.patch(`/shops/${id}`, payload);
      return res.data.data as Shop;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: shopKeys.lists(tenant) });
      qc.invalidateQueries({ queryKey: shopKeys.detail(tenant, variables.id) });
    },
  });
}

export function useDeleteShop() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/shops/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shopKeys.lists(tenant) });
    },
  });
}
