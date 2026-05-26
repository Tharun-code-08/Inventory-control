import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type StockTransferStatus = 'DRAFT' | 'POSTED';

export type StockTransferLine = {
  productId: string;
  quantity: number;
  uom: string;
};

export type StockTransfer = {
  id: string;
  transferNumber: string;
  transferDate: string;
  fromShopId: string;
  toShopId: string;
  fromStorageLocationId?: string | null;
  toStorageLocationId?: string | null;
  status: StockTransferStatus;
  notes?: string | null;
  postedAt?: string | null;
  itemCount?: number;
  fromShop?: { id: string; shopName: string; shopNumber: string };
  toShop?: { id: string; shopName: string; shopNumber: string };
};

export type CreateStockTransferPayload = {
  fromShopId: string;
  toShopId: string;
  fromStorageLocationId?: string;
  toStorageLocationId?: string;
  transferDate: string;
  notes?: string;
  items: StockTransferLine[];
};

const keys = {
  all: ['stock-transfers'] as const,
  lists: () => [...keys.all, 'list'] as const,
};

function extractRows(payload: unknown): StockTransfer[] {
  if (Array.isArray(payload)) return payload as StockTransfer[];
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as { data?: unknown };
  if (Array.isArray(source.data)) return source.data as StockTransfer[];
  return [];
}

export function useStockTransfers() {
  return useQuery({
    queryKey: keys.lists(),
    queryFn: async () => {
      const res = await api.get('/stock-transfers');
      return extractRows(res.data?.data ?? res.data);
    },
  });
}

export function useCreateStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateStockTransferPayload) => {
      const res = await api.post('/stock-transfers', payload);
      return res.data.data as StockTransfer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() });
    },
  });
}

export function usePostStockTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/stock-transfers/${id}/post`);
      return res.data.data as StockTransfer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.lists() });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['warehouse-inventory'] });
    },
  });
}
