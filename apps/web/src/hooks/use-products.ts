import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export type ProductPlantAssignment = {
  id?: string;
  shopId: string;
  storageLocationId?: string | null;
  storageLocation?: { id: string; code: string; name: string } | null;
  openingStock: number;
  minStockLevel: number;
  maxStockLevel?: number | null;
  reorderQty?: number | null;
  isActive: boolean;
};

export type ProductSpec = {
  id?: string;
  label: string;
  value: string;
};

/**
 * Frontend Product is a master row plus N plant assignments. `currentStock`
 * resolves to the filtered shop's stock when a `shopId` filter is active on
 * the list call, otherwise the sum across all assignments.
 */
export type Product = {
  id: string;
  productCode: string;
  description: string;
  uom: string;
  category: string;
  materialGroup?: string | null;
  drawingReference?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
  plants: ProductPlantAssignment[];
  specifications: ProductSpec[];
  stockByShop?: Record<string, number>;
  totalStock?: number;
  currentStock?: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductFilters = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  shopId?: string;
};

/** Payload shape accepted by `POST /products`. Mirrors `CreateProductDto`. */
export type CreateProductPayload = {
  productCode: string;
  description: string;
  uom: string;
  category: string;
  materialGroup?: string;
  drawingReference?: string;
  purchasePrice: number;
  sellingPrice: number;
  isActive?: boolean;
  plants: Array<{
    shopId: string;
    storageLocationId?: string;
    openingStock: number;
    minStockLevel: number;
    maxStockLevel?: number;
    reorderQty?: number;
    isActive?: boolean;
  }>;
  specifications?: Array<{ label: string; value: string }>;
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

export type ProductListMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductListResult = {
  items: Product[];
  data: Product[];
  meta: ProductListMeta;
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

function normalizeNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  return normalizeNumber(value);
}

function normalizePlant(raw: unknown): ProductPlantAssignment {
  const plant = raw as Partial<ProductPlantAssignment> & { [key: string]: unknown };
  return {
    id: typeof plant.id === 'string' ? plant.id : undefined,
    shopId: String(plant.shopId ?? ''),
    storageLocationId:
      plant.storageLocationId == null ? null : String(plant.storageLocationId),
    storageLocation:
      (plant.storageLocation as ProductPlantAssignment['storageLocation']) ?? null,
    openingStock: normalizeNumber(plant.openingStock),
    minStockLevel: normalizeNumber(plant.minStockLevel),
    maxStockLevel: normalizeNullableNumber(plant.maxStockLevel),
    reorderQty: normalizeNullableNumber(plant.reorderQty),
    isActive: plant.isActive !== false,
  };
}

function normalizeSpec(raw: unknown): ProductSpec {
  const spec = raw as Partial<ProductSpec>;
  return {
    id: typeof spec.id === 'string' ? spec.id : undefined,
    label: String(spec.label ?? ''),
    value: String(spec.value ?? ''),
  };
}

export function normalizeProduct(payload: unknown): Product {
  const product = payload as Partial<Product> & { [key: string]: unknown };
  const plants = Array.isArray(product.plants) ? product.plants.map(normalizePlant) : [];
  const specifications = Array.isArray(product.specifications)
    ? product.specifications.map(normalizeSpec)
    : [];
  const stockByShopRaw = product.stockByShop as Record<string, unknown> | undefined;
  const stockByShop: Record<string, number> | undefined = stockByShopRaw
    ? Object.fromEntries(
        Object.entries(stockByShopRaw).map(([k, v]) => [k, normalizeNumber(v)]),
      )
    : undefined;

  return {
    id: String(product.id ?? ''),
    productCode: String(product.productCode ?? ''),
    description: String(product.description ?? ''),
    uom: String(product.uom ?? ''),
    category: String(product.category ?? ''),
    materialGroup: (product.materialGroup as string | null | undefined) ?? null,
    drawingReference: (product.drawingReference as string | null | undefined) ?? null,
    purchasePrice: normalizeNumber(product.purchasePrice),
    sellingPrice: normalizeNumber(product.sellingPrice),
    isActive: product.isActive !== false,
    plants,
    specifications,
    stockByShop,
    totalStock: product.totalStock == null ? undefined : normalizeNumber(product.totalStock),
    currentStock: product.currentStock == null ? undefined : normalizeNumber(product.currentStock),
    createdAt: String(product.createdAt ?? ''),
    updatedAt: String(product.updatedAt ?? ''),
  };
}

function extractListRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const source = payload as {
    data?: unknown;
    items?: unknown[];
    meta?: Partial<ProductListMeta>;
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
  const source = payload as { meta?: Partial<ProductListMeta>; data?: { meta?: Partial<ProductListMeta> } };
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
  const metaFields = extractListMeta(payload, filters, items.length);

  return {
    items,
    data: items,
    meta: metaFields,
  };
}

function replaceStoredProduct(next: Product) {
  const { user, products, setProducts } = useAuthStore.getState();
  if (!user) return;
  // Shop users only persist products they're assigned to. Without an
  // assignment to their shop, the row is filtered out of their cache so
  // it doesn't leak through other UIs.
  if (
    user.role === 'SHOP_USER' &&
    user.shopId &&
    !next.plants.some((p) => p.shopId === user.shopId)
  ) {
    return;
  }

  const index = products.findIndex((product) => product.id === next.id);
  if (index === -1) {
    setProducts([next, ...products]);
    return;
  }

  const updated = [...products];
  updated[index] = next;
  setProducts(updated);
}

function removeStoredProduct(productId: string) {
  const { setProducts, products } = useAuthStore.getState();
  setProducts(products.filter((product) => product.id !== productId));
}

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.set('page', String(filters.page));
      if (filters.limit) params.set('limit', String(filters.limit));
      if (filters.search) params.set('search', filters.search);
      if (filters.category) params.set('category', filters.category);
      if (filters.isActive !== undefined) params.set('is_active', String(filters.isActive));
      if (filters.shopId) params.set('shop_id', filters.shopId);
      const suffix = params.toString();
      const res = await api.get(`/products${suffix ? `?${suffix}` : ''}`);
      return normalizeProductList(res.data, filters);
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return normalizeProduct(res.data.data);
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateProductPayload) => {
      const res = await api.post('/products', payload);
      return normalizeProduct(res.data.data);
    },
    onSuccess: async (product) => {
      replaceStoredProduct(product);
      qc.setQueriesData(
        { queryKey: productKeys.lists() },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old;
          if (old.items.some((row) => row.id === product.id)) return old;
          const limit = old.meta?.limit ?? 10;
          const items = [product, ...old.items].slice(0, limit);
          const total = (old.meta?.total ?? old.items.length) + 1;
          return {
            ...old,
            items,
            data: items,
            meta: {
              ...old.meta,
              total,
              page: 1,
              limit,
              totalPages: Math.max(1, Math.ceil(total / limit)),
            },
          };
        },
      );
      await qc.invalidateQueries({ queryKey: productKeys.lists() });
      await qc.refetchQueries({ queryKey: productKeys.lists(), type: 'active' });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateProductPayload & { id: string }) => {
      const res = await api.patch(`/products/${id}`, payload);
      return normalizeProduct(res.data.data);
    },
    onSuccess: (product, variables) => {
      replaceStoredProduct(product);
      qc.invalidateQueries({ queryKey: productKeys.lists() });
      qc.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
  });
}

export function useToggleProductStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await api.patch(`/products/${id}`, { isActive });
      return normalizeProduct(res.data.data);
    },
    onSuccess: (product) => {
      replaceStoredProduct(product);
      qc.invalidateQueries({ queryKey: productKeys.lists() });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
      return id;
    },
    onSuccess: (id) => {
      removeStoredProduct(id);
      qc.invalidateQueries({ queryKey: productKeys.lists() });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}
