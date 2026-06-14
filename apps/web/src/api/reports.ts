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
