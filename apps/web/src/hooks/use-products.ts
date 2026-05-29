import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type TaxPreference = 'TAXABLE' | 'NON_TAXABLE';

export const TAX_PREFERENCE_OPTIONS: Array<{ value: TaxPreference; label: string }> = [
  { value: 'TAXABLE', label: 'Taxable' },
  { value: 'NON_TAXABLE', label: 'Non-Taxable' },
];

export function formatTaxPreference(value?: TaxPreference | null): string {
  return TAX_PREFERENCE_OPTIONS.find((opt) => opt.value === value)?.label ?? 'Taxable';
}

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
  hsnCode?: string | null;
  materialGroup?: string | null;
  drawingReference?: string | null;
  brand?: string | null;
  taxPreference?: TaxPreference;
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
  /** List all company products (not restricted to a single plant assignment). */
  companyCatalog?: boolean;
};

/** Payload shape accepted by `POST /products`. Mirrors `CreateProductDto`. */
export type CreateProductPayload = {
  productCode: string;
  description: string;
  uom: string;
  category: string;
  hsnCode?: string;
  materialGroup?: string;
  drawingReference?: string;
  brand?: string;
  taxPreference?: TaxPreference;
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
    hsnCode: (product.hsnCode as string | null | undefined) ?? null,
    materialGroup: (product.materialGroup as string | null | undefined) ?? null,
    drawingReference: (product.drawingReference as string | null | undefined) ?? null,
    brand: (product.brand as string | null | undefined) ?? null,
    taxPreference:
      product.taxPreference === 'NON_TAXABLE' ? 'NON_TAXABLE' : 'TAXABLE',
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
      if (filters.companyCatalog) params.set('company_catalog', 'true');
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
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: productKeys.lists() });
      const tempId = `optimistic-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic = normalizeProduct({
        id: tempId,
        productCode: payload.productCode || '…',
        description: payload.description,
        uom: payload.uom,
        category: payload.category,
        hsnCode: payload.hsnCode ?? null,
        materialGroup: payload.materialGroup ?? null,
        drawingReference: payload.drawingReference ?? null,
        brand: payload.brand ?? null,
        taxPreference: payload.taxPreference ?? 'TAXABLE',
        purchasePrice: payload.purchasePrice,
        sellingPrice: payload.sellingPrice,
        isActive: payload.isActive !== false,
        plants: payload.plants,
        specifications: payload.specifications ?? [],
        createdAt: now,
        updatedAt: now,
      });
      const snapshots = qc.getQueriesData<ProductListResult>({ queryKey: productKeys.lists() });
      snapshots.forEach(([queryKey, old]) => {
        if (!old || !Array.isArray(old.items)) return;
        const limit = old.meta?.limit ?? 10;
        const items = [optimistic, ...old.items].slice(0, limit);
        const total = (old.meta?.total ?? old.items.length) + 1;
        qc.setQueryData<ProductListResult>(queryKey, {
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
        });
      });
      return { snapshots, tempId };
    },
    onError: (_err, _payload, context) => {
      context?.snapshots?.forEach(([queryKey, data]) => {
        qc.setQueryData(queryKey, data);
      });
    },
    onSuccess: async (product) => {
      qc.setQueriesData(
        { queryKey: productKeys.lists() },
        (old) => {
          if (!old || !Array.isArray(old.items)) return old;
          if (old.items.some((row) => row.id === product.id)) return old;
          const limit = old.meta?.limit ?? 10;
          const items = [product, ...old.items.filter((row) => !row.id.startsWith('optimistic-'))].slice(0, limit);
          const total = old.meta?.total ?? old.items.length;
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
    onSuccess: (_product, variables) => {
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
    onSuccess: () => {
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
      qc.invalidateQueries({ queryKey: productKeys.lists() });
      qc.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export type ProductDeletionImpact = {
  canDelete: boolean;
  reason: string;
  suggestedAction?: 'deactivate' | null;
  currentStock: number;
  historyCount: number;
  history: {
    goodsReceipts: number;
    goodsIssues: number;
    purchaseOrders: number;
    damaged: number;
    stockLedger: number;
  };
  plants: Array<{
    shopId: string;
    shopNumber: string;
    shopName?: string | null;
    isActive: boolean;
    currentStock: number;
  }>;
};

export function useProductDeletionImpact(id?: string) {
  return useQuery({
    queryKey: [...productKeys.detail(id ?? 'unknown'), 'deletion-impact'] as const,
    queryFn: async (): Promise<ProductDeletionImpact> => {
      const res = await api.get(`/products/${id}/deletion-impact`);
      return (res.data?.data ?? res.data) as ProductDeletionImpact;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

export type BulkInventoryRow = {
  productCode: string;
  shopNumber: string;
  storageLocationCode?: string;
  minStock?: number;
  maxStock?: number;
  reorderQty?: number;
};

export type BulkInventoryResult = {
  updated: number;
  total: number;
  errors: Array<{ row: number; message: string }>;
};

export type BulkProductImportRow = {
  productCode?: string;
  shopNumber?: string;
  storageLocationCode?: string;
  description: string;
  category: string;
  hsnCode?: string;
  materialGroup?: string;
  drawingReference?: string;
  brand?: string;
  taxPreference?: TaxPreference;
  purchasePrice: number;
  sellingPrice: number;
  openingStock: number;
  minStockLevel: number;
  maxStockLevel?: number;
  reorderQty?: number;
  uom: string;
  isActive?: boolean;
};

export type BulkProductImportResult = {
  validateOnly: boolean;
  total: number;
  created: number;
  updated: number;
  validated: number;
  failed: number;
  results: Array<{
    row: number;
    status: 'created' | 'updated' | 'validated' | 'failed';
    action: 'create' | 'update';
    productCode: string;
    shopNumber: string;
    message: string;
    warnings: string[];
  }>;
  errors: Array<{ row: number; message: string }>;
};

export function useBulkProductImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rows,
      validateOnly,
    }: {
      rows: BulkProductImportRow[];
      validateOnly: boolean;
    }): Promise<BulkProductImportResult> => {
      const res = await api.post('/products/bulk-upsert', { rows, validateOnly });
      return (res.data?.data ?? res.data) as BulkProductImportResult;
    },
    onSuccess: async (result) => {
      if (!result.validateOnly) {
        await qc.invalidateQueries({ queryKey: productKeys.lists() });
        await qc.invalidateQueries({ queryKey: ['dashboard'] });
      }
    },
  });
}

export function useBulkInventoryUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: BulkInventoryRow[]): Promise<BulkInventoryResult> => {
      const res = await api.post('/products/bulk-inventory', { rows });
      const data = (res.data?.data ?? res.data) as Partial<BulkInventoryResult>;
      return {
        updated: Number(data?.updated ?? 0),
        total: Number(data?.total ?? rows.length),
        errors: Array.isArray(data?.errors) ? data.errors : [],
      };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: productKeys.lists() });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
