import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type SupplierPayment = {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  amount: string | number;
  method?: string | null;
  reference?: string | null;
  remarks?: string | null;
  supplierBillId: string;
  shopId: string;
  supplierBill?: {
    id: string;
    billNumber: string;
    totalValue?: string | number;
    paidValue?: string | number;
  };
};

export type CreateSupplierPaymentPayload = {
  paymentNumber?: string;
  paymentDate?: string;
  supplierBillId: string;
  amount: number;
  method?: string;
  reference?: string;
  remarks?: string;
  idempotencyKey?: string;
};

const keys = {
  all: ['supplier-payments'] as const,
  list: (supplierBillId?: string) => [...keys.all, 'list', supplierBillId ?? 'all'] as const,
};

export function useSupplierPayments(supplierBillId?: string) {
  return useQuery({
    queryKey: keys.list(supplierBillId),
    queryFn: async () => {
      const params = supplierBillId ? { supplier_bill_id: supplierBillId } : undefined;
      const res = await api.get('/supplier-payments', { params });
      const payload = res.data?.data ?? res.data;
      return (Array.isArray(payload) ? payload : []) as SupplierPayment[];
    },
  });
}

export function useCreateSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSupplierPaymentPayload) => {
      const headers = payload.idempotencyKey
        ? { 'x-idempotency-key': payload.idempotencyKey }
        : undefined;
      const res = await api.post('/supplier-payments', payload, { headers });
      return res.data.data as SupplierPayment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ['supplier-bills'] });
    },
  });
}

export function useReverseSupplierPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await api.post(`/supplier-payments/${id}/reverse`, { reason });
      return res.data.data as {
        ok: boolean;
        supplierBillId: string;
        paidValue: string;
        status: string;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ['supplier-bills'] });
    },
  });
}
