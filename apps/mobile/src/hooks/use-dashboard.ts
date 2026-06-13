import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { useNotificationStore } from '@/store/notificationStore';

export type DashboardSummary = {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  recentTransactions: number;
  totalWarehouses: number;
  pendingPO: number;
  pendingGR: number;
  pendingRFQ: number;
  pendingQuotations: number;
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
  totalWarehouses: 0,
  pendingPO: 0,
  pendingGR: 0,
  pendingRFQ: 0,
  pendingQuotations: 0,
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
  const kpiContext = (typeof o.kpiContext === 'object' && o.kpiContext !== null)
    ? (o.kpiContext as Record<string, unknown>)
    : {};
  return {
    totalProducts: typeof o.totalProducts === 'number' ? o.totalProducts : 0,
    totalStockValue: typeof o.totalStockValue === 'number' ? o.totalStockValue : 0,
    lowStockCount: typeof o.lowStockCount === 'number' ? o.lowStockCount : 0,
    recentTransactions: typeof o.recentTransactions === 'number' ? o.recentTransactions : 0,
    totalWarehouses: typeof kpiContext.totalWarehouses === 'number' ? kpiContext.totalWarehouses : 0,
    pendingPO: typeof kpiContext.pendingPurchaseOrders === 'number' ? kpiContext.pendingPurchaseOrders : 0,
    pendingGR: typeof kpiContext.pendingGoodsReceipts === 'number' ? kpiContext.pendingGoodsReceipts : 0,
    pendingRFQ: typeof kpiContext.pendingRFQ === 'number' ? kpiContext.pendingRFQ : 0,
    pendingQuotations: typeof kpiContext.pendingQuotations === 'number' ? kpiContext.pendingQuotations : 0,
    lowStockProducts: Array.isArray(o.lowStockProducts)
      ? (o.lowStockProducts as DashboardSummary['lowStockProducts'])
      : [],
    recentGoodsIssues: Array.isArray(o.recentGoodsIssues)
      ? (o.recentGoodsIssues as DashboardSummary['recentGoodsIssues'])
      : [],
  };
}

function useDashboardBase() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const res = await api.get('/dashboard/summary');
      return normalizeSummary(unwrapData(res.data));
    },
    staleTime: 60_000,
  });
}

/**
 * Dashboard hook with lazy refresh based on notifications.
 * Marks dashboard as dirty when relevant notifications arrive,
 * then refreshes data when user opens the dashboard.
 */
export function useDashboard() {
  const query = useDashboardBase();
  const [isDirty, setIsDirty] = useState(false);
  const notifications = useNotificationStore((s) => s.notifications);

  // Listen for notifications that affect dashboard KPIs
  useEffect(() => {
    if (notifications.length === 0) return;

    const lastNotification = notifications[0];
    const relevantTypes = [
      'GR_CREATED',
      'GR_APPROVED',
      'GR_REJECTED',
      'PO_APPROVED',
      'PO_REJECTED',
      'RFQ_CREATED',
      'RFQ_RESPONSE',
      'QUOTATION_APPROVED',
      'QUOTATION_REJECTED',
      'LOW_STOCK',
      'CRITICAL_STOCK',
      'TRANSFER_COMPLETED',
    ];

    if (relevantTypes.includes(lastNotification.type)) {
      setIsDirty(true);
    }
  }, [notifications]);

  // Refresh when opening dashboard if dirty
  const handleRefresh = () => {
    setIsDirty(false);
    return query.refetch();
  };

  return {
    ...query,
    isDirty,
    onRefresh: handleRefresh,
    lastUpdated: query.dataUpdatedAt,
  };
}
