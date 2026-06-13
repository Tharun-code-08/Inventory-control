import { api } from './client';

/**
 * Executive Dashboard API - Web version
 * Shared types with mobile for consistency
 */

export type FinancialCardData = {
  revenueToday: number;
  revenueThisMonth: number;
  grossProfit: number;
  netProfit: number;
  receivables: number;
  payables: number;
};

export type InventoryCardData = {
  totalValue: number;
  lowStockCount: number;
  deadStockValue: number;
  stockCoverageDays: number;
};

export type AttentionItem = {
  type: string;
  count: number;
  severity: 'critical' | 'warning' | 'info';
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
    case 'critical':
      return '#dc2626'; // red
    case 'warning':
      return '#f59e0b'; // amber
    case 'info':
    default:
      return '#3b82f6'; // blue
  }
}

/**
 * Get severity background color (lighter)
 */
export function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return '#fee2e2'; // red
    case 'warning':
      return '#fef3c7'; // amber
    case 'info':
    default:
      return '#dbeafe'; // blue
  }
}
