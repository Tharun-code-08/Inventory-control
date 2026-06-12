import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { grKeys, poKeys, productKeys, dashboardKeys, alertKeys } from '@/lib/query-keys';
import { PAGE_SIZE, QUERY_STALE_TIME } from '@/lib/constants';
import type { CursorPageMeta } from '@/types/documents';

export type GoodsReceiptItem = {
  id: string;
  productId: string;
  quantity: number;
  uom: string;
  purchaseRate: number;
  lineValue: number;
  batchNumber?: string | null;
  serialNumber?: string | null;
  expiryDate?: string | null;
  product: { id: string; productCode: string; description: string };
};

export type GoodsReceipt = {
  id: string;
  grNumber: string;
  grDate: string;
  shopId: string;
  purchaseOrderId?: string | null;
  receiptType: 'FULL' | 'PARTIAL';
  receiptSource: 'PURCHASE_ORDER' | 'OUTSIDE';
  supplierName: string;
  supplierRef?: string | null;
  remarks?: string | null;
  status: string;
  totalValue: number;
  postedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  shop?: { shopName: string };
  items: GoodsReceiptItem[];
};

export type GRFilters = {
  shopId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  take?: number;
};

export type GRListResult = {
  items: GoodsReceipt[];
  meta: CursorPageMeta;
};

function normalizeGR(raw: unknown): GoodsReceipt {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    grNumber: String(r.grNumber ?? ''),
    grDate: String(r.grDate ?? ''),
    shopId: String(r.shopId ?? ''),
    purchaseOrderId: (r.purchaseOrderId as string) ?? null,
    receiptType: (r.receiptType as GoodsReceipt['receiptType']) ?? 'FULL',
    receiptSource: (r.receiptSource as GoodsReceipt['receiptSource']) ?? 'PURCHASE_ORDER',
    supplierName: String(r.supplierName ?? ''),
    supplierRef: (r.supplierRef as string) ?? null,
    remarks: (r.remarks as string) ?? null,
    status: String(r.status ?? 'DRAFT'),
    totalValue: Number(r.totalValue ?? 0),
    postedAt: (r.postedAt as string) ?? null,
    createdAt: String(r.createdAt ?? ''),
    updatedAt: String(r.updatedAt ?? ''),
    shop: r.shop as GoodsReceipt['shop'],
    items: Array.isArray(r.items) ? (r.items as GoodsReceiptItem[]) : [],
  };
}

function normalizeGRList(payload: unknown): GRListResult {
  const envelope = unwrapData<Record<string, unknown>>(payload);
  const rows = Array.isArray(envelope)
    ? envelope
    : Array.isArray((envelope as any)?.data)
      ? (envelope as any).data
      : Array.isArray((envelope as any)?.items)
        ? (envelope as any).items
        : [];
  const items = (rows as unknown[]).map(normalizeGR);
  const meta = (envelope as any)?.meta ?? {};
  return {
    items,
    meta: {
      nextCursor: meta.nextCursor ?? null,
      limit: meta.limit ?? items.length,
      hasMore: meta.hasNextPage ?? meta.hasMore ?? false,
    },
  };
}

export function useGoodsReceipts(filters: GRFilters = {}) {
  return useQuery({
    queryKey: grKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      params.take = filters.take ?? PAGE_SIZE;
      if (filters.shopId) params.shop_id = filters.shopId;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      if (filters.cursor) params.cursor = filters.cursor;
      const res = await api.get('/goods-receipts', { params });
      return normalizeGRList(res.data);
    },
    staleTime: QUERY_STALE_TIME.lists,
  });
}

export function useGoodsReceipt(id: string) {
  return useQuery({
    queryKey: grKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/goods-receipts/${id}`);
      return normalizeGR(unwrapData(res.data));
    },
    enabled: !!id,
  });
}

export type CreateGRLine = {
  productId: string;
  quantity: number;
  uom: string;
  purchaseRate: number;
  storageLocationId: string;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
};

export type CreateGRPayload = {
  grDate: string;
  shopId: string;
  purchaseOrderId?: string;
  receiptType: 'FULL' | 'PARTIAL';
  receiptSource: 'PURCHASE_ORDER' | 'OUTSIDE';
  supplierName: string;
  supplierRef?: string;
  remarks?: string;
  items: CreateGRLine[];
};

export function useCreateGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateGRPayload) => {
      const res = await api.post('/goods-receipts', payload);
      return normalizeGR(unwrapData(res.data));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: grKeys.lists() });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function usePostGoodsReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/goods-receipts/${id}/post`);
      return normalizeGR(unwrapData(res.data));
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: grKeys.lists() });
      qc.invalidateQueries({ queryKey: grKeys.detail(id) });
      qc.invalidateQueries({ queryKey: productKeys.all });
      qc.invalidateQueries({ queryKey: poKeys.lists() });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
      qc.invalidateQueries({ queryKey: alertKeys.all });
    },
  });
}
