import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type SupplierBillStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID';

export type SupplierBill = {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate?: string | null;
  status: SupplierBillStatus;
  totalValue: string | number;
  paidValue?: string | number;
  purchaseOrderId?: string | null;
  goodsReceiptId?: string | null;
  shopId: string;
  supplierId: string;
  supplier?: { id: string; supplierCode?: string; supplierName: string };
  purchaseOrder?: { poNumber: string } | null;
};

export type SupplierBillFilters = {
  shopId?: string;
  status?: SupplierBillStatus;
  supplierId?: string;
  take?: number;
};

export type CreateSupplierBillPayload = {
  billNumber?: string;
  billDate?: string;
  supplierId?: string;
  dueDate?: string;
  remarks?: string;
};

const keys = {
  all: ['supplier-bills'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (filters: SupplierBillFilters) => [...keys.lists(), filters] as const,
};

function extractRows(payload: unknown): SupplierBill[] {
  if (Array.isArray(payload)) return payload as SupplierBill[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as { data?: unknown; items?: unknown[] };
  if (Array.isArray(source.items)) return source.items as SupplierBill[];
  if (Array.isArray(source.data)) return source.data as SupplierBill[];
  return [];
}

export function useSupplierBills(filters: SupplierBillFilters = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.shopId) params.set('shop_id', filters.shopId);
      if (filters.status) params.set('status', filters.status);
      if (filters.supplierId) params.set('supplier_id', filters.supplierId);
      if (filters.take) params.set('take', String(filters.take));
      const qs = params.toString();
      const res = await api.get(`/supplier-bills${qs ? `?${qs}` : ''}`);
      return extractRows(res.data?.data ?? res.data);
    },
  });
}

export function useCreateSupplierBillFromGr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      grId,
      ...payload
    }: CreateSupplierBillPayload & { grId: string }) => {
      const res = await api.post(`/supplier-bills/from-gr/${grId}`, payload);
      return res.data.data as SupplierBill;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() });
      qc.invalidateQueries({ queryKey: ['supplier-payments'] });
    },
  });
}

export function useVoidSupplierBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.post(`/supplier-bills/${id}/void`, { reason });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}
