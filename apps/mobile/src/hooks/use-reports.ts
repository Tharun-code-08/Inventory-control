import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { reportKeys } from '@/lib/query-keys';
import { QUERY_STALE_TIME } from '@/lib/constants';

/** ISO date (YYYY-MM-DD) for `n` days ago and today. */
export function lastNDays(n: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - n);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

// ---- Dead Stock ----------------------------------------------------------
export type DeadStockItem = {
  productId: string;
  productCode: string;
  name: string;
  category: string | null;
  supplier: string;
  currentStock: number;
  unitCost: number;
  stockValue: number;
  lastSaleDate: string | null;
  daysUnsold: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
};

export type DeadStockResult = {
  summary: { totalDeadItems: number; totalDeadQty: number; totalDeadValue: number; theme: string };
  items: DeadStockItem[];
};

export function useDeadStockReport(shopId?: string) {
  return useQuery({
    queryKey: reportKeys.deadStock({ shopId }),
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100, sort_by: 'stockValue' };
      if (shopId) params.shop_id = shopId;
      const res = await api.get('/reports/dead-stock', { params });
      const data = unwrapData<DeadStockResult>(res.data);
      return {
        summary: data?.summary ?? { totalDeadItems: 0, totalDeadQty: 0, totalDeadValue: 0, theme: '' },
        items: Array.isArray(data?.items) ? data.items : [],
      } as DeadStockResult;
    },
    staleTime: QUERY_STALE_TIME.lists,
  });
}

// ---- Reorder Intelligence ------------------------------------------------
export type ReorderItem = {
  productId: string;
  productCode: string;
  name: string;
  category: string | null;
  currentStock: number;
  minStockLevel: number;
  avgSalesPerDay: number;
  daysRemaining: number;
  suggestedOrderQty: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
};

export function useReorderReport(shopId?: string) {
  return useQuery({
    queryKey: reportKeys.reorder({ shopId }),
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 100, sort_by: 'urgency' };
      if (shopId) params.shop_id = shopId;
      const res = await api.get('/reports/reorder-intelligence', { params });
      const data = unwrapData<{ items?: ReorderItem[] }>(res.data);
      return Array.isArray(data?.items) ? data.items : [];
    },
    staleTime: QUERY_STALE_TIME.lists,
  });
}

// ---- Product Profitability ----------------------------------------------
export type ProfitabilityItem = {
  productId: string;
  productCode: string;
  name: string;
  category: string | null;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  recommendation: 'STOP_SELLING' | 'REDUCE_DISCOUNT' | 'MONITOR' | 'PROMOTE';
};

export type ProfitabilityResult = {
  summary: {
    totalRevenue: number;
    totalCogs: number;
    totalProfit: number;
    avgMargin: number;
    lossMakingProducts: number;
    unprofitableValue: number;
  };
  items: ProfitabilityItem[];
};

export function useProfitabilityReport(shopId?: string, days = 90) {
  return useQuery({
    queryKey: reportKeys.profitability({ shopId, days }),
    queryFn: async () => {
      const { from, to } = lastNDays(days);
      const params: Record<string, string | number> = {
        limit: 100,
        sort_by: 'profit',
        date_from: from,
        date_to: to,
      };
      if (shopId) params.shop_id = shopId;
      const res = await api.get('/reports/product-profitability', { params });
      const data = unwrapData<ProfitabilityResult>(res.data);
      return {
        summary:
          data?.summary ?? {
            totalRevenue: 0,
            totalCogs: 0,
            totalProfit: 0,
            avgMargin: 0,
            lossMakingProducts: 0,
            unprofitableValue: 0,
          },
        items: Array.isArray(data?.items) ? data.items : [],
      } as ProfitabilityResult;
    },
    staleTime: QUERY_STALE_TIME.lists,
  });
}

// ---- Fast Moving (stock movement) ---------------------------------------
export type FastMovingItem = {
  productCode: string;
  description: string;
  totalIssuedQty: number;
  velocity: number;
  isTopVelocity: boolean;
};

export function useFastMovingReport(shopId?: string, days = 90) {
  return useQuery({
    queryKey: reportKeys.fastMoving({ shopId, days }),
    queryFn: async () => {
      const { from, to } = lastNDays(days);
      const params: Record<string, string | number> = { limit: 100, date_from: from, date_to: to };
      if (shopId) params.shop_id = shopId;
      const res = await api.get('/reports/fast-moving', { params });
      const rows = unwrapData<unknown>(res.data);
      const arr = Array.isArray(rows) ? rows : [];
      return arr.map((raw) => {
        const r = raw as Record<string, unknown>;
        return {
          productCode: String(r.product_code ?? ''),
          description: String(r.description ?? ''),
          totalIssuedQty: Number(r.total_issued_qty ?? 0),
          velocity: Number(r.velocity ?? 0),
          isTopVelocity: Boolean(r.is_top_velocity_decile),
        } as FastMovingItem;
      });
    },
    staleTime: QUERY_STALE_TIME.lists,
  });
}
