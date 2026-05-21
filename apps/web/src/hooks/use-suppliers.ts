import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Supplier = {
  id: string;
  supplierCode: string;
  supplierName: string;
  companyId?: string | null;
  taxId?: string | null;
  vatNumber?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  paymentTerms?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  routingNumber?: string | null;
  iban?: string | null;
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

function normalizeSupplier(raw: unknown): Supplier {
  const row = raw as Partial<Supplier> & { rating?: unknown; categories?: unknown };
  return {
    id: String(row.id ?? ''),
    supplierCode: String(row.supplierCode ?? ''),
    supplierName: String(row.supplierName ?? ''),
    companyId: row.companyId ?? null,
    taxId: row.taxId ?? null,
    vatNumber: row.vatNumber ?? null,
    contactPerson: row.contactPerson ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    street: row.street ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    postalCode: row.postalCode ?? null,
    country: row.country ?? null,
    paymentTerms: row.paymentTerms ?? null,
    bankName: row.bankName ?? null,
    accountNumber: row.accountNumber ?? null,
    routingNumber: row.routingNumber ?? null,
    iban: row.iban ?? null,
    rating: typeof row.rating === 'number' ? row.rating : Number(row.rating ?? 3) || 3,
    categories: Array.isArray(row.categories) ? row.categories.map(String) : [],
    isActive: row.isActive !== false,
  };
}

export function useSuppliers(search?: string) {
  return useQuery({
    queryKey: keys.list(search),
    queryFn: async () => {
      const res = await api.get('/suppliers', { params: { search, take: 200 } });
      const payload = res.data as { data?: unknown };
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      return rows.map(normalizeSupplier);
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPayload) => {
      const res = await api.post('/suppliers', payload);
      return normalizeSupplier(res.data.data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.all });
      await qc.refetchQueries({ queryKey: keys.all, type: 'active' });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Supplier> & { id: string }) => {
      const res = await api.patch(`/suppliers/${id}`, payload);
      return normalizeSupplier(res.data.data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.all });
      await qc.refetchQueries({ queryKey: keys.all, type: 'active' });
    },
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

