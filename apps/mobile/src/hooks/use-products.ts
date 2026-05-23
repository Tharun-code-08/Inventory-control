import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';

export type Product = {
  id: string;
  productCode: string;
  description: string;
  uom: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
  stockByShop?: Record<string, number>;
  totalStock?: number;
  currentStock?: number;
  plants?: Array<{ shopId: string; minStockLevel: number }>;
};

export type ProductFilters = {
  page?: number;
  limit?: number;
  search?: string;
  shopId?: string;
  isActive?: boolean;
};

export type ProductListResult = {
  items: Product[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: ProductFilters) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

function normalizeNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeProduct(raw: unknown): Product {
  const p = raw as Record<string, unknown>;
  return {
    id: String(p.id ?? ''),
    productCode: String(p.productCode ?? ''),
    description: String(p.description ?? ''),
    uom: String(p.uom ?? ''),
    category: String(p.category ?? ''),
    purchasePrice: normalizeNumber(p.purchasePrice),
    sellingPrice: normalizeNumber(p.sellingPrice),
    isActive: Boolean(p.isActive ?? true),
    stockByShop: p.stockByShop as Record<string, number> | undefined,
    totalStock: p.totalStock != null ? normalizeNumber(p.totalStock) : undefined,
    currentStock: p.currentStock != null ? normalizeNumber(p.currentStock) : undefined,
    plants: Array.isArray(p.plants) ? (p.plants as Product['plants']) : [],
  };
}

function extractListRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as {
    data?: unknown;
    items?: unknown[];
    success?: boolean;
  };
  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.data)) return source.data;
  if (source.data && typeof source.data === 'object' && !Array.isArray(source.data)) {
    const nested = source.data as { data?: unknown[]; items?: unknown[] };
    if (Array.isArray(nested.data)) return nested.data;
    if (Array.isArray(nested.items)) return nested.items;
  }
  return [];
}

function extractListMeta(payload: unknown, filters: ProductFilters, rowCount: number) {
  if (!payload || typeof payload !== 'object') {
    return {
      total: rowCount,
      page: filters.page ?? 1,
      limit: filters.limit ?? (rowCount || 1),
      totalPages: 1,
    };
  }
  const source = payload as {
    meta?: Partial<ProductListResult['meta']>;
    data?: { meta?: Partial<ProductListResult['meta']> };
  };
  const meta = source.meta ?? source.data?.meta;
  const limit = Math.max(1, meta?.limit ?? filters.limit ?? (rowCount || 1));
  const total = meta?.total ?? rowCount;
  const page = meta?.page ?? filters.page ?? 1;
  return {
    total,
    page,
    limit,
    totalPages: meta?.totalPages ?? Math.max(1, Math.ceil(total / limit)),
  };
}

function normalizeProductList(payload: unknown, filters: ProductFilters): ProductListResult {
  const rows = extractListRows(payload);
  const items = rows.map(normalizeProduct);
  const meta = extractListMeta(payload, filters, items.length);
  return { items, meta };
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number | boolean> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.search) params.search = filters.search;
      if (filters.shopId) params.shop_id = filters.shopId;
      if (filters.isActive !== undefined) params.is_active = filters.isActive;
      const res = await api.get('/products', { params });
      return normalizeProductList(res.data, filters);
    },
    staleTime: 60_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return normalizeProduct(unwrapData(res.data));
    },
    enabled: !!id,
  });
}

export function resolveProductStock(product: Product, shopId?: string): number {
  if (shopId && product.stockByShop) return product.stockByShop[shopId] ?? 0;
  return product.totalStock ?? product.currentStock ?? 0;
}
