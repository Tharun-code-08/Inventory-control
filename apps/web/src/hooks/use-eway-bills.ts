import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

/** GST e-way bills backed by the `/eway-bills` API. */

export type EwayBillStatus = 'DRAFT' | 'GENERATED' | 'CANCELLED' | 'EXPIRED';
export type EwaySupplyType = 'OUTWARD' | 'INWARD';
export type EwayTransportMode = 'ROAD' | 'RAIL' | 'AIR' | 'SHIP';

export type EwayBill = {
  id: string;
  ewayBillNumber: string;
  shopId: string;
  invoiceId?: string | null;
  status: EwayBillStatus;
  supplyType: EwaySupplyType;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  fromGstin?: string | null;
  fromName: string;
  fromAddress?: string | null;
  toGstin?: string | null;
  toName: string;
  toAddress?: string | null;
  toPlace?: string | null;
  toPincode?: string | null;
  toStateCode?: string | null;
  transporterName?: string | null;
  transportMode: EwayTransportMode;
  vehicleNumber?: string | null;
  distanceKm?: number | null;
  taxableValue: string;
  cgstValue: string;
  sgstValue: string;
  igstValue: string;
  cessValue: string;
  totalValue: string;
  validUpto?: string | null;
  generatedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  remarks?: string | null;
  createdAt: string;
  invoice?: { invoiceNumber: string } | null;
};

export type EwayBillStats = { draft: number; generated: number; cancelled: number; expired: number };

export type CreateEwayBillPayload = {
  shopId?: string;
  invoiceId?: string;
  supplyType?: EwaySupplyType;
  documentType?: string;
  documentNumber: string;
  documentDate: string;
  fromGstin?: string;
  fromName: string;
  fromAddress?: string;
  toGstin?: string;
  toName: string;
  toAddress?: string;
  transporterName?: string;
  transportMode?: EwayTransportMode;
  vehicleNumber?: string;
  distanceKm?: number;
  taxableValue?: number;
  igstValue?: number;
  totalValue?: number;
  remarks?: string;
};

const keys = {
  all: ['eway-bills'] as const,
  list: (status?: EwayBillStatus) => [...keys.all, 'list', status ?? 'ALL'] as const,
  stats: () => [...keys.all, 'stats'] as const,
};

export function useEwayBills(status?: EwayBillStatus) {
  return useQuery({
    queryKey: keys.list(status),
    queryFn: async () => {
      const res = await api.get('/eway-bills', { params: { status } });
      return (res.data.data ?? []) as EwayBill[];
    },
  });
}

export function useEwayBillStats() {
  return useQuery({
    queryKey: keys.stats(),
    queryFn: async () => {
      const res = await api.get('/eway-bills/stats/summary');
      return (res.data.data ?? res.data) as EwayBillStats;
    },
  });
}

export function useCreateEwayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEwayBillPayload) => {
      const res = await api.post('/eway-bills', payload);
      return res.data.data as EwayBill;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useCreateEwayBillFromInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      invoiceId: string;
      transportMode?: EwayTransportMode;
      transporterName?: string;
      vehicleNumber?: string;
      distanceKm?: number;
    }) => {
      const res = await api.post('/eway-bills/from-invoice', payload);
      return res.data.data as EwayBill;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useGenerateEwayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/eway-bills/${id}/generate`);
      return res.data.data as EwayBill;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useCancelEwayBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.post(`/eway-bills/${id}/cancel`, { reason });
      return res.data.data as EwayBill;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
