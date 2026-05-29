import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { EMPTY_DASHBOARD, type DashboardViewData } from '@/lib/dashboard-demo-data';

export type { DashboardViewData } from '@/lib/dashboard-demo-data';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function normalizeKpiContext(raw: unknown): DashboardViewData['kpiContext'] {
  if (!raw || typeof raw !== 'object') {
    return EMPTY_DASHBOARD.kpiContext;
  }
  const o = raw as Record<string, unknown>;
  return {
    productsAddedThisMonth: toNumber(o.productsAddedThisMonth),
    stockValueAvgPerProduct: toNumber(o.stockValueAvgPerProduct),
    transactionsPriorPeriod: toNumber(o.transactionsPriorPeriod),
    pendingPurchaseOrders: toNumber(o.pendingPurchaseOrders),
    pendingSalesOrders: toNumber(o.pendingSalesOrders),
  };
}

function normalizeSummary(raw: unknown): DashboardViewData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const totalProducts = toNumber(o.totalProducts, NaN);
  if (Number.isNaN(totalProducts)) return null;
  return {
    totalProducts,
    totalStockValue: toNumber(o.totalStockValue),
    lowStockCount: toNumber(o.lowStockCount),
    lowStockCriticalCount: toNumber(o.lowStockCriticalCount),
    lowStockWarningCount: toNumber(o.lowStockWarningCount),
    recentTransactions: toNumber(o.recentTransactions),
    monthlyMovement: Array.isArray(o.monthlyMovement) ? (o.monthlyMovement as DashboardViewData['monthlyMovement']) : [],
    categoryBreakdown: Array.isArray(o.categoryBreakdown)
      ? (o.categoryBreakdown as DashboardViewData['categoryBreakdown'])
      : [],
    recentGoodsReceipts: Array.isArray(o.recentGoodsReceipts)
      ? (o.recentGoodsReceipts as DashboardViewData['recentGoodsReceipts'])
      : [],
    recentGoodsIssues: Array.isArray(o.recentGoodsIssues)
      ? (o.recentGoodsIssues as DashboardViewData['recentGoodsIssues'])
      : [],
    lowStockProducts: Array.isArray(o.lowStockProducts)
      ? (o.lowStockProducts as DashboardViewData['lowStockProducts'])
      : [],
    topProducts: Array.isArray(o.topProducts)
      ? (o.topProducts as DashboardViewData['topProducts']).map((p) => ({
          ...p,
          unitCost: toNumber(
            (p as { unitCost?: unknown; sellingPrice?: unknown }).unitCost ??
              (p as { sellingPrice?: unknown }).sellingPrice,
          ),
        }))
      : [],
    kpiContext: normalizeKpiContext(o.kpiContext),
  };
}

export function useDashboard(shopId?: string) {
  return useQuery({
    queryKey: [...dashboardKeys.summary(), shopId ?? 'default'],
    queryFn: async () => {
      const res = await api.get('/dashboard/summary', {
        params: shopId ? { shop_id: shopId } : undefined,
      });
      const payload = res.data?.data ?? res.data;
      return normalizeSummary(payload) ?? EMPTY_DASHBOARD;
    },
    staleTime: 15_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
  });
}
