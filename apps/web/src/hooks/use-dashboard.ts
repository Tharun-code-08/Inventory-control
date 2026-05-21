import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { EMPTY_DASHBOARD, type DashboardViewData } from '@/lib/dashboard-demo-data';

export type { DashboardViewData } from '@/lib/dashboard-demo-data';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

function normalizeSummary(raw: unknown): DashboardViewData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.totalProducts !== 'number') return null;
  return {
    totalProducts: o.totalProducts as number,
    totalStockValue: typeof o.totalStockValue === 'number' ? o.totalStockValue : 0,
    lowStockCount: typeof o.lowStockCount === 'number' ? o.lowStockCount : 0,
    recentTransactions: typeof o.recentTransactions === 'number' ? o.recentTransactions : 0,
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
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      try {
        const res = await api.get('/dashboard/summary');
        return normalizeSummary(res.data?.data) ?? EMPTY_DASHBOARD;
      } catch {
        return EMPTY_DASHBOARD;
      }
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}
