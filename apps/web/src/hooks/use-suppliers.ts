import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Supplier = {
  id: string;
  supplierCode: string;
  supplierName: string;
  companyId?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  paymentTerms?: string | null;
  rating: number;
  categories: string[];
  isActive: boolean;
};

export type CreateSupplierPayload = {
  supplierCode?: string;
  supplierName: string;
  companyId?: string;
  taxId?: string;
  vatNumber?: string;
  rating?: number;
  categories?: string[];
  contactPerson?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  paymentTerms?: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  isActive?: boolean;
};

const keys = {
  all: ['suppliers'] as const,
  list: (search?: string) => [...keys.all, 'list', search ?? ''] as const,
};

export function useSuppliers(search?: string) {
  return useQuery({
    queryKey: keys.list(search),
    queryFn: async () => {
      const res = await api.get('/suppliers', { params: { search } });
      return (res.data.data ?? []) as Supplier[];
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPayload) => {
      const res = await api.post('/suppliers', payload);
      return res.data.data as Supplier;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Supplier> & { id: string }) => {
      const res = await api.patch(`/suppliers/${id}`, payload);
      return res.data.data as Supplier;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/suppliers/${id}`);
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

