import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';

export type ReportFilters = {
  shopId?: string;
  productId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ExportReportPayload = ReportFilters & {
  reportType: string;
  format?: 'csv' | 'xlsx' | 'pdf';
};

export const reportKeys = {
  all: ['reports'] as const,
  inventory: (filters: ReportFilters) => [...reportKeys.all, 'inventory', filters] as const,
  lowStock: (filters: ReportFilters) => [...reportKeys.all, 'low-stock', filters] as const,
  fastMoving: (filters: ReportFilters) => [...reportKeys.all, 'fast-moving', filters] as const,
  grRegister: (filters: ReportFilters) => [...reportKeys.all, 'gr-register', filters] as const,
  giRegister: (filters: ReportFilters) => [...reportKeys.all, 'gi-register', filters] as const,
  stockLedger: (filters: ReportFilters) => [...reportKeys.all, 'stock-ledger', filters] as const,
  shopSummary: (filters: ReportFilters) => [...reportKeys.all, 'shop-summary', filters] as const,
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeInventoryRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    id: String(row.product_id ?? row.id ?? ''),
    productCode: String(row.product_code ?? row.productCode ?? ''),
    description: String(row.description ?? ''),
    category: String(row.category ?? 'General'),
    openingStock: toNumber(row.opening_stock ?? row.openingStock),
    currentStock: toNumber(row.current_stock ?? row.currentStock),
    minStockLevel: toNumber(row.min_stock_level ?? row.minStockLevel),
    value: toNumber(row.value),
  }));
}

function normalizeLowStockRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    id: String(row.product_id ?? row.id ?? ''),
    productCode: String(row.product_code ?? row.productCode ?? ''),
    description: String(row.description ?? ''),
    category: String(row.category ?? 'General'),
    currentStock: toNumber(row.current_stock ?? row.currentStock),
    minStockLevel: toNumber(row.min_stock_level ?? row.minStockLevel),
  }));
}

function normalizeGrRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const items = Array.isArray(row.items) ? row.items : [];
    const totalValue = items.reduce((sum, item) => sum + toNumber((item as Record<string, unknown>).lineValue), 0);
    return {
      id: String(row.id ?? ''),
      grNumber: String(row.grNumber ?? row.gr_number ?? ''),
      grDate: String(row.grDate ?? row.gr_date ?? new Date().toISOString()),
      supplier: String(row.supplierName ?? row.supplier ?? ''),
      itemCount: items.length,
      totalValue,
      status: String(row.status ?? ''),
    };
  });
}

function normalizeGiRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => {
    const items = Array.isArray(row.items) ? row.items : [];
    return {
      id: String(row.id ?? ''),
      giNumber: String(row.giNumber ?? row.gi_number ?? ''),
      giDate: String(row.giDate ?? row.gi_date ?? new Date().toISOString()),
      issueReason: String(row.issueReason ?? row.issue_reason ?? ''),
      itemCount: items.length,
      status: String(row.status ?? ''),
    };
  });
}

function normalizeStockLedgerRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    date: String(row.transactionDate ?? row.transaction_date ?? new Date().toISOString()),
    productCode: String(row.productCode ?? row.product_code ?? ''),
    description: String(row.description ?? ''),
    type: String(row.transactionType ?? row.transaction_type ?? ''),
    inQty: toNumber(row.inQty ?? row.in_qty),
    outQty: toNumber(row.outQty ?? row.out_qty),
    balance: toNumber(row.balanceQty ?? row.balance_qty),
    reference: String(row.referenceNumber ?? row.reference_number ?? row.referenceId ?? ''),
  }));
}

function normalizeShopSummaryRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    shopId: String(row.shop_id ?? row.shopId ?? ''),
    shopName: String(row.shop_name ?? row.shopName ?? ''),
    totalProducts: toNumber(row.sku_count ?? row.totalProducts),
    totalStockValue: toNumber(row.stock_value ?? row.totalStockValue),
    lowStockCount: toNumber(row.low_stock_count ?? row.lowStockCount),
    totalGR: toNumber(row.total_gr ?? row.totalGR),
    totalGI: toNumber(row.total_gi ?? row.totalGI),
  }));
}

function buildParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.shopId) params.set('shop_id', filters.shopId);
  if (filters.productId) params.set('product_id', filters.productId);
  if (filters.category) params.set('category', filters.category);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return params;
}

export function useInventoryReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.inventory(filters),
    queryFn: async () => {
      const res = await api.get(`/reports/inventory?${buildParams(filters)}`);
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      return normalizeInventoryRows(rows);
    },
  });
}

export function useLowStockReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.lowStock(filters),
    queryFn: async () => {
      const res = await api.get(`/reports/low-stock?${buildParams(filters)}`);
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      return normalizeLowStockRows(rows);
    },
  });
}

export function useFastMovingReport(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.fastMoving(filters),
    queryFn: async () => {
      const res = await api.get(`/reports/fast-moving?${buildParams(filters)}`);
      return res.data.data;
    },
  });
}

export function useGrRegister(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.grRegister(filters),
    queryFn: async () => {
      const res = await api.get(`/reports/gr-register?${buildParams(filters)}`);
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      return normalizeGrRows(rows);
    },
  });
}

export function useGiRegister(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.giRegister(filters),
    queryFn: async () => {
      const res = await api.get(`/reports/gi-register?${buildParams(filters)}`);
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      return normalizeGiRows(rows);
    },
  });
}

export function useStockLedger(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.stockLedger(filters),
    queryFn: async () => {
      const res = await api.get(`/reports/stock-ledger?${buildParams(filters)}`);
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      return normalizeStockLedgerRows(rows);
    },
  });
}

export function useShopSummary(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.shopSummary(filters),
    queryFn: async () => {
      const res = await api.get(`/reports/shop-summary?${buildParams(filters)}`);
      const rows = Array.isArray(res.data.data) ? res.data.data : [];
      return normalizeShopSummaryRows(rows);
    },
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: async (payload: ExportReportPayload) => {
      const res = await api.post('/reports/export', payload, { responseType: 'blob' });
      return res.data;
    },
  });
}
