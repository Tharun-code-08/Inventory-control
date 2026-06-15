import { api } from './client';

/**
 * Executive Dashboard API - Web version
 * Shared types with mobile for consistency
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
 * Fetch executive dashboard - Web version
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
  type: 'opened' | 'card' | 'action' | 'exit' | 'attention_resolved';
  card?: DashboardCard;
  firstClick?: boolean;
  action?: string;
  loadTimeMs?: number;
  sessionId?: string;
  // DASHBOARD_EXIT metadata
  durationMs?: number;
  cardsViewed?: number;
  actionsTaken?: number;
  firstCard?: DashboardCard;
  openedAt?: string;
  closedAt?: string;
  // ATTENTION_ITEM_RESOLVED metadata
  itemId?: string;
  itemType?: string;
  resolution?: string;
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
 * Format currency for display (INR)
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
 * Get severity color for UI
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
 * Get severity background color (lighter)
 */
export function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case 'high':
      return '#fee2e2'; // red
    case 'medium':
      return '#fef3c7'; // amber
    case 'low':
    default:
      return '#dbeafe'; // blue
  }
}
