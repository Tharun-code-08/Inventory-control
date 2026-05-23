import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

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
  list: (tenant?: string | null, search?: string) =>
    [...keys.all, 'list', tenant ?? 'anon', search ?? ''] as const,
};

function currentTenantKey() {
  const user = useAuthStore.getState().user;
  return user?.companyId ?? user?.id ?? 'anon';
}

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
  const tenant = currentTenantKey();
  return useQuery({
    queryKey: keys.list(tenant, search),
    queryFn: async () => {
      const res = await api.get('/suppliers', { params: { search, take: 100 } });
      const payload = res.data as { data?: unknown };
      const rows = Array.isArray(payload?.data) ? payload.data : [];
      // API returns newest-first; reverse so newest appears at the bottom of the table.
      return rows.map(normalizeSupplier).reverse();
    },
  });
}

function appendSupplierToListCache(
  qc: ReturnType<typeof useQueryClient>,
  created: Supplier,
  search?: string,
) {
  const key = keys.list(currentTenantKey(), search);
  qc.setQueryData<Supplier[]>(key, (current) => {
    if (!current) return [created];
    if (current.some((s) => s.id === created.id)) return current;
    return [...current, created];
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPayload) => {
      const res = await api.post('/suppliers', payload);
      return normalizeSupplier(res.data.data);
    },
    onSuccess: (created) => {
      appendSupplierToListCache(qc, created, '');
      void qc.invalidateQueries({ queryKey: keys.all });
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

export type SupplierDeletionImpact = {
  supplier: { id: string; supplierName: string; supplierCode: string };
  counts: {
    rfqInvitations: number;
    quotations: number;
    contracts: number;
    purchaseOrders: number;
  };
  linkedRfqs: Array<{ id: string; rfqNumber: string; title: string; status: string }>;
  note: string;
};

export function useSupplierDeletionImpact(supplierId: string | null) {
  return useQuery({
    queryKey: [...keys.all, 'deletion-impact', supplierId],
    queryFn: async () => {
      const res = await api.get(`/suppliers/${supplierId}/deletion-impact`);
      return res.data.data as SupplierDeletionImpact;
    },
    enabled: Boolean(supplierId),
  });
}

export function useRequestSupplierDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/suppliers/${id}/request-deletion`);
      return res.data.data as {
        pending: boolean;
        adminEmail: string;
        message: string;
        impact: SupplierDeletionImpact;
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

/** @deprecated Use useRequestSupplierDeletion */
export function useDeleteSupplier() {
  return useRequestSupplierDeletion();
}

