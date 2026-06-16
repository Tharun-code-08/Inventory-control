import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { productKeys } from '@/lib/query-keys';

/** Product shape returned by GET /barcodes/lookup (LOOKUP_PRODUCT_SELECT on the API). */
export type ScannedProduct = {
  id: string;
  productCode: string;
  description: string;
  uom: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  isActive: boolean;
};

export type BarcodeLookupResult =
  | { found: true; barcode: string; duplicate: boolean; product: ScannedProduct }
  | { found: false; barcode: string; duplicate: boolean; policy?: 'AUTO_CREATE' | 'ASK' | 'REJECT' };

/**
 * Resolve a scanned code to a product. The server normalizes the code, logs
 * the scan, flags duplicate fires (same user + code within its window), and
 * falls back to a productCode match for products without registered barcodes.
 */
export async function lookupBarcode(code: string, shopId?: string): Promise<BarcodeLookupResult> {
  const res = await api.get('/barcodes/lookup', {
    params: { code, source: 'CAMERA', ...(shopId ? { shopId } : {}) },
  });
  const data = unwrapData<Record<string, unknown>>(res.data) as unknown as BarcodeLookupResult;
  return data;
}

/** Attach an additional barcode to an existing product (multi-barcode support). */
export function useLinkBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, barcode, supplierId }: { productId: string; barcode: string; supplierId?: string }) => {
      const res = await api.post(`/barcodes/products/${productId}`, {
        barcodeValue: barcode,
        supplierId,
      });
      return unwrapData(res.data);
    },
    onSuccess: (_data, { productId }) => {
      qc.invalidateQueries({ queryKey: productKeys.detail(productId) });
      qc.invalidateQueries({ queryKey: ['barcodes'] });
    },
  });
}

export type QuickCreateProductPayload = {
  productCode: string;
  description: string;
  uom: string;
  category: string;
  purchasePrice: number;
  sellingPrice: number;
  shopId: string;
};

/** Minimal product creation for the scan-intake flow (no opening stock). */
export function useQuickCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: QuickCreateProductPayload) => {
      const res = await api.post('/products', {
        productCode: payload.productCode,
        description: payload.description,
        uom: payload.uom,
        category: payload.category,
        purchasePrice: payload.purchasePrice,
        sellingPrice: payload.sellingPrice,
        isActive: true,
        plants: [{ shopId: payload.shopId, openingStock: 0, minStockLevel: 0 }],
      });
      return unwrapData(res.data) as ScannedProduct;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useBarcodeList(params: {
  search?: string;
  barcodeType?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['barcodes', 'list', params],
    queryFn: async () => {
      const res = await api.get('/barcodes', { params });
      return unwrapData(res.data) as {
        items: Array<{
          id: string;
          barcode: string;
          barcodeType: string;
          isPrimary: boolean;
          createdAt: string;
          product: { id: string; productCode: string; description: string };
          supplier?: { id: string; supplierName: string };
        }>;
        total: number;
        page: number;
        limit: number;
      };
    },
  });
}

export type ProductBarcodeRow = {
  id: string;
  barcode: string;
  barcodeType: string;
  isPrimary: boolean;
  supplier?: { id: string; supplierName: string } | null;
};

/** All barcodes registered to one product (primary first). */
export function useProductBarcodes(productId: string) {
  return useQuery({
    queryKey: ['barcodes', 'product', productId],
    queryFn: async () => {
      const res = await api.get(`/barcodes/products/${productId}`);
      const rows = unwrapData(res.data);
      return (Array.isArray(rows) ? rows : []) as ProductBarcodeRow[];
    },
    enabled: !!productId,
  });
}

export function useDeleteBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/barcodes/${id}`);
      return unwrapData(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['barcodes'] });
    },
  });
}

export function useMarkInvalid() {
  return useMutation({
    mutationFn: async ({ code, shopId }: { code: string; shopId?: string }) => {
      const res = await api.post('/barcodes/mark-invalid', {
        code,
        source: 'CAMERA',
        ...(shopId ? { shopId } : {}),
      });
      return unwrapData(res.data);
    },
  });
}
