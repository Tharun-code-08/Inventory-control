import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';

export type DashboardSummary = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  recentTransactions: number;
  lowStockProducts: Array<{
    id: string;
    productCode: string;
    description: string;
    currentStock?: number;
  }>;
  recentGoodsIssues: Array<{
    id: string;
    giNumber: string;
    giDate: string;
    status: string;
    shop?: { shopName?: string };
  }>;
};

const EMPTY: DashboardSummary = {
  totalProducts: 0,
  totalStockValue: 0,
  lowStockCount: 0,
  recentTransactions: 0,
  lowStockProducts: [],
  recentGoodsIssues: [],
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
};

function normalizeSummary(raw: unknown): DashboardSummary {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const o = raw as Record<string, unknown>;
  return {
    totalProducts: typeof o.totalProducts === 'number' ? o.totalProducts : 0,
    totalStockValue: typeof o.totalStockValue === 'number' ? o.totalStockValue : 0,
    lowStockCount: typeof o.lowStockCount === 'number' ? o.lowStockCount : 0,
    recentTransactions: typeof o.recentTransactions === 'number' ? o.recentTransactions : 0,
    lowStockProducts: Array.isArray(o.lowStockProducts)
      ? (o.lowStockProducts as DashboardSummary['lowStockProducts'])
      : [],
    recentGoodsIssues: Array.isArray(o.recentGoodsIssues)
      ? (o.recentGoodsIssues as DashboardSummary['recentGoodsIssues'])
      : [],
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return normalizeSummary(unwrapData(res.data));
    },
    staleTime: 60_000,
  });
}
