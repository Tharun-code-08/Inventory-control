import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { soKeys, dashboardKeys } from '@/lib/query-keys';
import { QUERY_STALE_TIME } from '@/lib/constants';

export type SalesOrderStatus = 'DRAFT' | 'CONFIRMED' | 'FULFILLED' | 'CLOSED' | 'CANCELLED';

export type SalesOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineValue: number;
  product?: { id: string; productCode: string; description: string };
};

export type SalesOrder = {
  id: string;
  soNumber: string;
  orderDate: string;
  expectedDate: string | null;
  status: SalesOrderStatus;
  totalValue: number | null;
  remarks: string | null;
  shopId: string;
  customerId: string | null;
  customer?: { id: string; customerCode: string; customerName: string };
  shop?: { id: string; shopName: string; shopNumber?: string };
  items: SalesOrderItem[];
};

export type SOFilters = {
  shopId?: string;
  status?: SalesOrderStatus;
  take?: number;
};

function normalizeItem(raw: unknown): SalesOrderItem {
  const i = raw as Record<string, unknown>;
  const quantity = Number(i.quantity ?? 0);
  const unitPrice = Number(i.unitPrice ?? 0);
  return {
    id: String(i.id ?? ''),
    productId: String(i.productId ?? ''),
    quantity,
    unitPrice,
    lineValue: i.lineValue != null ? Number(i.lineValue) : quantity * unitPrice,
    product: i.product as SalesOrderItem['product'],
  };
}

export function normalizeSalesOrder(raw: unknown): SalesOrder {
  const s = raw as Record<string, unknown>;
  return {
    id: String(s.id ?? ''),
    soNumber: String(s.soNumber ?? ''),
    orderDate: String(s.orderDate ?? ''),
    expectedDate: (s.expectedDate as string) ?? null,
    status: (s.status as SalesOrderStatus) ?? 'DRAFT',
    totalValue: s.totalValue != null ? Number(s.totalValue) : null,
    remarks: (s.remarks as string) ?? null,
    shopId: String(s.shopId ?? ''),
    customerId: (s.customerId as string) ?? null,
    customer: s.customer as SalesOrder['customer'],
    shop: s.shop as SalesOrder['shop'],
    items: Array.isArray(s.items) ? (s.items as unknown[]).map(normalizeItem) : [],
  };
}

function extractRows(payload: unknown): SalesOrder[] {
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) return (data as unknown[]).map(normalizeSalesOrder);
  if (data && typeof data === 'object') {
    const src = data as { data?: unknown; items?: unknown[] };
    if (Array.isArray(src.data)) return (src.data as unknown[]).map(normalizeSalesOrder);
    if (Array.isArray(src.items)) return (src.items as unknown[]).map(normalizeSalesOrder);
  }
  return [];
}

export function useSalesOrders(filters: SOFilters = {}) {
  return useQuery({
    queryKey: soKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = { take: filters.take ?? 100 };
      if (filters.shopId) params.shop_id = filters.shopId;
      if (filters.status) params.status = filters.status;
      const res = await api.get('/sales-orders', { params });
      return extractRows(res.data);
    },
    staleTime: QUERY_STALE_TIME.lists,
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: soKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/sales-orders/${id}`);
      return normalizeSalesOrder(unwrapData(res.data));
    },
    enabled: !!id,
  });
}

export function useConfirmSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-orders/${id}/confirm`);
      return normalizeSalesOrder(unwrapData(res.data));
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: soKeys.lists() });
      qc.invalidateQueries({ queryKey: soKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}

export function useFulfillSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/sales-orders/${id}/fulfill`);
      return normalizeSalesOrder(unwrapData(res.data));
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: soKeys.lists() });
      qc.invalidateQueries({ queryKey: soKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
