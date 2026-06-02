import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: {
    name: string;
  };
  shopId: string | null;
  shop: {
    id: string;
    shopNumber: string;
    shopName: string;
  } | null;
  isActive: boolean;
  createdAt: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  roleId: string;
  shopId: string | null;
  isActive?: boolean;
};

export type UpdateUserPayload = Partial<Omit<CreateUserPayload, 'password'>> & {
  password?: string;
};

export type InviteUserPayload = {
  email: string;
  name?: string;
  roleId: string;
  shopId?: string | null;
};

export const userKeys = {
  all: ['users'] as const,
  lists: (tenant?: string | null) => [...userKeys.all, 'list', tenant ?? 'anon'] as const,
  detail: (tenant: string | null | undefined, id: string) => [...userKeys.all, 'detail', tenant ?? 'anon', id] as const,
};

function currentTenantKey() {
  const user = useAuthStore.getState().user;
  return user?.companyId ?? user?.id ?? 'anon';
}

export function useUsers(enabled = true) {
  const tenant = currentTenantKey();
  return useQuery({
    queryKey: userKeys.lists(tenant),
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data as User[];
    },
    enabled,
  });
}

export function useUser(id: string) {
  const tenant = currentTenantKey();
  return useQuery({
    queryKey: userKeys.detail(tenant, id),
    queryFn: async () => {
      const res = await api.get(`/users/${id}`);
      return res.data.data as User;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (payload: CreateUserPayload) => {
      const res = await api.post('/users', payload);
      return res.data.data as User;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists(tenant) });
    },
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (payload: InviteUserPayload) => {
      const res = await api.post('/users/invite', payload);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists(tenant) });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateUserPayload & { id: string }) => {
      const res = await api.patch(`/users/${id}`, payload);
      return res.data.data as User;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: userKeys.lists(tenant) });
      qc.invalidateQueries({ queryKey: userKeys.detail(tenant, variables.id) });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  const tenant = currentTenantKey();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/users/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.lists(tenant) });
    },
  });
}
