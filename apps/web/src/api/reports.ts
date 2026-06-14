import { apiClient } from './client';

export interface DeadStockItem {
  productId: string;
  productCode: string;
  name: string;
  category: string;
  supplier: string;
  currentStock: number;
  unitCost: number;
  stockValue: number;
  lastSaleDate: string | null;
  daysUnsold: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  recommendation: 'STOP_REORDER' | 'OFFER_DISCOUNT' | 'MONITOR';
}

export interface DeadStockResponse {
  summary: {
    totalDeadItems: number;
    totalDeadQty: number;
    totalDeadValue: number;
    theme: string;
  };
  items: DeadStockItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
  };
}

export interface DeadStockFilters {
  shopId?: string;
  category?: string;
  supplier?: string;
  daysUnsold?: number;
  sortBy?: 'stockValue' | 'daysUnsold';
  page?: number;
  limit?: number;
}

export const getDeadStockReport = async (filters: DeadStockFilters): Promise<DeadStockResponse> => {
  const params = new URLSearchParams();
  if (filters.shopId) params.append('shop_id', filters.shopId);
  if (filters.category) params.append('category', filters.category);
  if (filters.supplier) params.append('supplier', filters.supplier);
  if (filters.daysUnsold) params.append('days_unsold', String(filters.daysUnsold));
  if (filters.sortBy) params.append('sort_by', filters.sortBy);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const response = await apiClient.get(`/reports/dead-stock?${params.toString()}`);
  return response.data;
};

export const getSeverityIcon = (severity: 'CRITICAL' | 'HIGH' | 'MEDIUM') => {
  switch (severity) {
    case 'CRITICAL':
      return '🔴';
    case 'HIGH':
      return '🟠';
    case 'MEDIUM':
      return '🟡';
  }
};

export const getRecommendationLabel = (recommendation: 'STOP_REORDER' | 'OFFER_DISCOUNT' | 'MONITOR') => {
  switch (recommendation) {
    case 'STOP_REORDER':
      return 'Stop ordering';
    case 'OFFER_DISCOUNT':
      return 'Offer discount';
    case 'MONITOR':
      return 'Monitor closely';
  }
};

// Reorder Intelligence Types
export interface ReorderItem {
  productId: string;
  productCode: string;
  name: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  avgSalesPerDay: number;
  salesLast30Days: number;
  daysRemaining: number;
  suggestedOrderQty: number;
  leadTimeDays: number;
  lastRestockDate: string | null;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  calculation: {
    salesLast30Days: number;
    avgSalesPerDay: number;
    currentStock: number;
    daysRemaining: number;
    leadTimeDays: number;
    safetyStockDays: number;
    targetSupplyDays: number;
    suggestedOrderQty: number;
    reasoning: string;
  };
}

export interface ReorderResponse {
  summary: {
    totalProducts: number;
    urgent: { count: number; totalOrderQty: number };
    warning: { count: number; totalOrderQty: number };
    normal: { count: number; totalOrderQty: number };
  };
  items: ReorderItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
  };
}

export interface ReorderFilters {
  shopId: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  stockStatus?: 'IN_STOCK' | 'BELOW_MIN' | 'OVERSTOCK';
  sortBy?: 'urgency' | 'daysLeft' | 'avgSalesPerDay';
  page?: number;
  limit?: number;
}

export const getReorderIntelligence = async (filters: ReorderFilters): Promise<ReorderResponse> => {
  const params = new URLSearchParams();
  params.append('shop_id', filters.shopId);
  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);
  if (filters.category) params.append('category', filters.category);
  if (filters.stockStatus) params.append('stock_status', filters.stockStatus);
  if (filters.sortBy) params.append('sort_by', filters.sortBy);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const response = await apiClient.get(`/reports/reorder-intelligence?${params.toString()}`);
  return response.data;
};

export const getUrgencyIcon = (urgency: 'HIGH' | 'MEDIUM' | 'LOW') => {
  switch (urgency) {
    case 'HIGH':
      return '🔴';
    case 'MEDIUM':
      return '🟡';
    case 'LOW':
      return '🟢';
  }
};

export const getUrgencyLabel = (urgency: 'HIGH' | 'MEDIUM' | 'LOW') => {
  switch (urgency) {
    case 'HIGH':
      return 'Order Today';
    case 'MEDIUM':
      return 'Order This Week';
    case 'LOW':
      return 'Monitor';
  }
};
