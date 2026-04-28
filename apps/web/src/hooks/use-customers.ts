import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Customer = {
  id: string;
  customerCode: string;
  customerName: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
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
      const res = await api.get('/customers', { params: { search } });
      return (res.data.data ?? []) as Customer[];
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Customer>) => {
      const res = await api.post('/customers', payload);
      return res.data.data as Customer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

