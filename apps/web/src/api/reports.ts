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

// Customer Aging Types
export interface CustomerAgingItem {
  customerId: string;
  customerName: string;
  lastTransactionDate: string | null;
  agingBuckets: {
    current_0_30: number;
    watch_31_60: number;
    highRisk_61_90: number;
    critical_90plus: number;
  };
  totalOutstanding: number;
  overdueAmount: number;
  overdueInvoiceCount: number;
  collectionPercentage: number;
  avgPaymentDays: number;
  riskScore: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'GREEN';
  actions: string[];
}

export interface CustomerAgingResponse {
  summary: {
    totalCustomers: number;
    totalOutstanding: number;
    totalOverdue: number;
    overdueCustomers: number;
    avgCollectionDays: number;
  };
  items: CustomerAgingItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
  };
}

export interface CustomerAgingFilters {
  shopId?: string;
  showOverdueOnly?: boolean;
  customerName?: string;
  sortBy?: 'totalOutstanding' | 'overdueAmount' | 'riskScore';
  page?: number;
  limit?: number;
}

export const getCustomerAging = async (filters: CustomerAgingFilters): Promise<CustomerAgingResponse> => {
  const params = new URLSearchParams();
  if (filters.shopId) params.append('shop_id', filters.shopId);
  if (filters.showOverdueOnly) params.append('show_overdue_only', 'true');
  if (filters.customerName) params.append('customer_name', filters.customerName);
  if (filters.sortBy) params.append('sort_by', filters.sortBy);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const response = await apiClient.get(`/reports/customer-aging?${params.toString()}`);
  return response.data;
};

export const getRiskIcon = (riskScore: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'GREEN') => {
  switch (riskScore) {
    case 'CRITICAL':
      return '🔴';
    case 'HIGH':
      return '🟠';
    case 'MEDIUM':
      return '🟡';
    case 'GREEN':
      return '🟢';
  }
};

export const getRiskLabel = (riskScore: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'GREEN') => {
  switch (riskScore) {
    case 'CRITICAL':
      return 'Critical Risk';
    case 'HIGH':
      return 'High Risk';
    case 'MEDIUM':
      return 'Medium Risk';
    case 'GREEN':
      return 'Healthy';
  }
};

// Product Profitability Types
export interface ProfitabilityItem {
  productId: string;
  productCode: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  profit: number;
  marginPercentage: number;
  avgSellingPrice: number;
  avgCostPrice: number;
  profitRank: number;
  recommendation: 'STOP_SELLING' | 'REDUCE_DISCOUNT' | 'MONITOR' | 'PROMOTE';
}

export interface ProfitabilityResponse {
  summary: {
    totalRevenue: number;
    totalCogs: number;
    totalProfit: number;
    avgMargin: number;
    lossMakingProducts: number;
    unprofitableValue: number;
  };
  items: ProfitabilityItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
  };
}

export interface ProfitabilityFilters {
  shopId?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  showLossOnly?: boolean;
  sortBy?: 'profit' | 'margin' | 'revenue';
  page?: number;
  limit?: number;
}

export const getProductProfitability = async (filters: ProfitabilityFilters): Promise<ProfitabilityResponse> => {
  const params = new URLSearchParams();
  if (filters.shopId) params.append('shop_id', filters.shopId);
  if (filters.dateFrom) params.append('date_from', filters.dateFrom);
  if (filters.dateTo) params.append('date_to', filters.dateTo);
  if (filters.category) params.append('category', filters.category);
  if (filters.showLossOnly) params.append('show_loss_only', 'true');
  if (filters.sortBy) params.append('sort_by', filters.sortBy);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.limit) params.append('limit', String(filters.limit));

  const response = await apiClient.get(`/reports/product-profitability?${params.toString()}`);
  return response.data;
};

export const getProfitRankStars = (rank: number) => {
  return '⭐'.repeat(Math.max(1, Math.min(4, rank)));
};

export const getRecommendationColor = (recommendation: 'STOP_SELLING' | 'REDUCE_DISCOUNT' | 'MONITOR' | 'PROMOTE') => {
  switch (recommendation) {
    case 'STOP_SELLING':
      return 'red';
    case 'REDUCE_DISCOUNT':
      return 'orange';
    case 'MONITOR':
      return 'yellow';
    case 'PROMOTE':
      return 'green';
  }
};

export const getRecommendationText = (recommendation: 'STOP_SELLING' | 'REDUCE_DISCOUNT' | 'MONITOR' | 'PROMOTE') => {
  switch (recommendation) {
    case 'STOP_SELLING':
      return 'Stop selling';
    case 'REDUCE_DISCOUNT':
      return 'Reduce discount';
    case 'MONITOR':
      return 'Monitor';
    case 'PROMOTE':
      return 'Promote';
  }
};

// Action Center Types
export interface Action {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: 'cash-flow' | 'procurement' | 'inventory' | 'pricing' | 'opportunity';
  title: string;
  description: string;
  details: Record<string, any>;
  suggestedAction: string;
  estimatedImpact: string;
  reportSource: string;
}

export interface ActionCenterResponse {
  generatedAt: string;
  actionsSummary: {
    critical: number;
    high: number;
    medium: number;
  };
  actions: Action[];
}

export interface ActionCenterFilters {
  shopId?: string;
}

export const getActionCenter = async (filters: ActionCenterFilters): Promise<ActionCenterResponse> => {
  const params = new URLSearchParams();
  if (filters.shopId) params.append('shop_id', filters.shopId);

  const response = await apiClient.get(`/reports/action-center?${params.toString()}`);
  return response.data;
};

export const getPriorityIcon = (priority: 'CRITICAL' | 'HIGH' | 'MEDIUM') => {
  switch (priority) {
    case 'CRITICAL':
      return '🔴';
    case 'HIGH':
      return '🟠';
    case 'MEDIUM':
      return '🟡';
  }
};

export const getPriorityLabel = (priority: 'CRITICAL' | 'HIGH' | 'MEDIUM') => {
  switch (priority) {
    case 'CRITICAL':
      return 'Critical';
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
  }
};

export const getCategoryIcon = (category: 'cash-flow' | 'procurement' | 'inventory' | 'pricing' | 'opportunity') => {
  switch (category) {
    case 'cash-flow':
      return '💰';
    case 'procurement':
      return '📦';
    case 'inventory':
      return '📊';
    case 'pricing':
      return '💲';
    case 'opportunity':
      return '💡';
  }
};

export const getCategoryLabel = (category: 'cash-flow' | 'procurement' | 'inventory' | 'pricing' | 'opportunity') => {
  switch (category) {
    case 'cash-flow':
      return 'Cash Flow';
    case 'procurement':
      return 'Procurement';
    case 'inventory':
      return 'Inventory';
    case 'pricing':
      return 'Pricing';
    case 'opportunity':
      return 'Opportunity';
  }
};
