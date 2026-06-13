import { api } from './client';

/**
 * Executive Dashboard - 4 cards, 30 seconds, owner opens every morning
 */

export type FinancialCardData = {
  revenueToday: number;
  revenueThisMonth: number;
  netProfitMonth: number;
  cashAvailable: number;
};

export type InventoryCardData = {
  inventoryValue: number;
  lowStockCount: number;
  deadStockValue: number;
  coverageDays: number;
};

export type AttentionItem = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  action: string;
};

export type AttentionCardData = AttentionItem[];

export type RecommendationItem = {
  action: string;
  reason?: string;
  expectedProfit?: number;
  confidence?: number;
};

export type RecommendationsCardData = RecommendationItem[];

export type ExecutiveDashboardResponse = {
  financial: FinancialCardData;
  inventory: InventoryCardData;
  attention: AttentionCardData;
  recommendations: RecommendationsCardData;
};

/**
 * Fetch executive dashboard data
 * Target: < 300ms response, < 30 seconds to understand and act
 */
export async function fetchExecutiveDashboard(
  shopId?: string,
): Promise<ExecutiveDashboardResponse> {
  const params = shopId ? { shop_id: shopId } : {};
  const response = await api.get<ExecutiveDashboardResponse>(
    '/dashboard/executive',
    { params },
  );
  return response.data;
}

export type DashboardCard = 'financial' | 'inventory' | 'attention' | 'recommendations';

export type DashboardEvent = {
  type: 'opened' | 'card' | 'action';
  card?: DashboardCard;
  firstClick?: boolean;
  action?: string;
  loadTimeMs?: number;
  sessionId?: string;
};

/** New session id per dashboard mount — groups opens/clicks/actions into one visit. */
export function newDashboardSession(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Fire-and-forget telemetry. The Week 4 Reality Report reads these from the
 * audit log. Never let a failed beacon disrupt the dashboard — swallow errors.
 */
export function emitDashboardEvent(event: DashboardEvent): void {
  void api.post('/dashboard/events', event).catch(() => {
    // telemetry is best-effort; ignore
  });
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Get severity color for attention items
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'high':
      return '#dc2626'; // red
    case 'medium':
      return '#f59e0b'; // amber
    case 'low':
    default:
      return '#3b82f6'; // blue
  }
}

/**
 * Calculate simple trend indicator
 * Returns: 'up' | 'down' | 'stable'
 */
export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous === 0) return current > 0 ? 'up' : 'stable';
  const percentChange = ((current - previous) / previous) * 100;
  if (percentChange > 2) return 'up';
  if (percentChange < -2) return 'down';
  return 'stable';
}
