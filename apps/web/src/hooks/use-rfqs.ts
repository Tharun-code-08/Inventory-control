import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type Rfq = {
  id: string;
  rfqNumber: string;
  title: string;
  rfqDate: string;
  deadline?: string | null;
  status: string;
  shopId: string;
  shop?: { id: string; shopName: string; shopNumber?: string; address?: string };
  suppliers: Array<{ supplierId: string; supplier?: { supplierName: string } }>;
  items: Array<{
    id: string;
    productId?: string | null;
    description?: string | null;
    quantity: string | number;
    uom: string;
    specifications?: string | null;
    product?: { id: string; productCode?: string; description?: string; purchasePrice?: number | string };
  }>;
};

export type CreateRfqPayload = {
  shopId?: string;
  rfqDate?: string;
  deadline?: string;
  title: string;
  notes?: string;
  suppliers?: string[];
  items: Array<{ productId?: string; description?: string; quantity: number; uom?: string; specifications?: string }>;
};

const keys = {
  all: ['rfqs'] as const,
  list: () => [...keys.all, 'list'] as const,
};

export function useRfqs() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: async () => {
      const res = await api.get('/rfqs');
      return (res.data.data ?? []) as Rfq[];
    },
  });
}

export function useRfq(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.all, 'detail', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}`);
      return res.data.data as Rfq;
    },
    enabled: Boolean(id),
  });
}

/** Short code shown on RFQ detail; portal verify accepts full id or this prefix. */
export function rfqPortalAccessCode(rfqId: string): string {
  return rfqId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRfqPayload) => {
      const res = await api.post('/rfqs', payload);
      return res.data.data as Rfq;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export type RfqEmailDelivery = {
  configured: boolean;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    supplierId: string;
    supplierName: string;
    email: string;
    status: 'sent' | 'failed' | 'skipped';
    error?: string;
  }>;
};

export type SendRfqResult = Rfq & { emailDelivery?: RfqEmailDelivery };

export function useSendRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/rfqs/${id}/send`);
      return res.data.data as SendRfqResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useResendRfqInvites() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/rfqs/${id}/resend-invites`);
      return res.data.data as SendRfqResult;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export type RfqDeletionImpact = {
  canDelete: boolean;
  quotationCount: number;
  contractCount: number;
  reason: string | null;
};

export function useRfqDeletionImpact(id: string | undefined) {
  return useQuery({
    queryKey: [...keys.all, 'deletion-impact', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}/deletion-impact`);
      return res.data.data as RfqDeletionImpact;
    },
    enabled: Boolean(id),
  });
}

export function useDeleteRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/rfqs/${id}`);
      const payload = res.data?.data ?? res.data;
      return payload as { id: string; rfqNumber: string; deleted: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
}

