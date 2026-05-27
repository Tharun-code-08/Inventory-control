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
