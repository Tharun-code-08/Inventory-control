import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Customer = {
  id: string;
  customerCode: string;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  pan?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  shopId?: string;
  isActive: boolean;
};

const keys = {
  all: ['customers'] as const,
  list: (search?: string) => [...keys.all, 'list', search ?? ''] as const,
};

export function useCustomers(search?: string) {
  return useQuery({
    queryKey: keys.list(search),
    queryFn: async () => {
      const res = await api.get('/customers', {
        params: { search: search || undefined, take: 100 },
      });
      return (res.data.data ?? []) as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Customer> & { shopId?: string }) => {
      const res = await api.post('/customers', payload);
      return res.data.data as Customer;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: keys.all });
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: Customer = {
        id: tempId,
        customerCode: '…',
        customerName: payload.customerName ?? '',
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        taxId: payload.taxId ?? null,
        pan: payload.pan ?? null,
        street: payload.street ?? null,
        city: payload.city ?? null,
        state: payload.state ?? null,
        postalCode: payload.postalCode ?? null,
        country: payload.country ?? null,
        shopId: payload.shopId,
        isActive: true,
      };
      const snapshots = qc.getQueriesData<Customer[]>({ queryKey: keys.all });
      snapshots.forEach(([queryKey, data]) => {
        if (!Array.isArray(data)) return;
        qc.setQueryData(queryKey, [...data, optimistic]);
      });
      return { snapshots, tempId };
    },
    onError: (_err, _payload, context) => {
      context?.snapshots?.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Customer> & { shopId?: string };
    }) => {
      const res = await api.patch(`/customers/${id}`, payload);
      return res.data.data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
