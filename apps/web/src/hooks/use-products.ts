import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

export type Product = {
  id: string;
  productCode: string;
  description: string;
  uom: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  openingStock: number;
  reorderQty: number | null;
  isActive: boolean;
  shopId: string;
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

export type CreateProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'currentStock'>;

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

export function normalizeProduct(payload: unknown): Product {
  const product = payload as Product & {
    purchasePrice?: unknown;
    sellingPrice?: unknown;
    minStockLevel?: unknown;
    openingStock?: unknown;
    reorderQty?: unknown;
    currentStock?: unknown;
  };

  return {
    ...product,
    purchasePrice: normalizeNumber(product.purchasePrice),
    sellingPrice: normalizeNumber(product.sellingPrice),
    minStockLevel: normalizeNumber(product.minStockLevel),
    openingStock: normalizeNumber(product.openingStock),
    reorderQty: normalizeNullableNumber(product.reorderQty),
    currentStock: product.currentStock == null ? undefined : normalizeNumber(product.currentStock),
  };
}

function normalizeProductList(payload: unknown, filters: ProductFilters): ProductListResult {
  const source = payload as {
    data?: unknown[];
    items?: unknown[];
    meta?: Partial<ProductListMeta>;
  };
  const rows = Array.isArray(source?.items)
    ? source.items
    : Array.isArray(source?.data)
      ? source.data
      : Array.isArray(payload)
        ? payload
        : [];
  const items = rows.map(normalizeProduct);
  const limit = Math.max(1, source?.meta?.limit ?? filters.limit ?? items.length ?? 1);
  const total = source?.meta?.total ?? items.length;
  const page = source?.meta?.page ?? filters.page ?? 1;

  return {
    items,
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages: source?.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    },
  };
}

function replaceStoredProduct(next: Product) {
  const { user, products, setProducts } = useAuthStore.getState();
  if (!user) return;
  if (user.shopId && user.shopId !== next.shopId) return;

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
    onSuccess: (product) => {
      replaceStoredProduct(product);
      qc.invalidateQueries({ queryKey: productKeys.lists() });
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
