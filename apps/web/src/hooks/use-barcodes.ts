import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';

export type ScanAction =
  | 'LOOKUP'
  | 'GOODS_RECEIPT'
  | 'GOODS_ISSUE'
  | 'STOCK_COUNT'
  | 'SALES_ORDER'
  | 'PURCHASE_ORDER'
  | 'STOCK_TRANSFER';

export type BarcodeProduct = {
  id: string;
  productCode: string;
  description: string;
  uom: string;
  category: string;
  purchasePrice: number | string;
  sellingPrice: number | string;
  gstRate: number | string;
  isActive: boolean;
  barcodes: Array<{
    id: string;
    barcodeValue: string;
    barcodeType: string;
    isPrimary: boolean;
  }>;
};

export type ScanSource = 'WEB' | 'MOBILE' | 'USB_SCANNER' | 'CAMERA' | 'API';

export type BarcodeLookupResult =
  | { found: true; barcode: string; duplicate: boolean; matchedType: string | null; product: BarcodeProduct }
  | { found: false; barcode: string; duplicate: boolean; policy?: 'AUTO_CREATE' | 'ASK' | 'REJECT' };

export const barcodesKeys = {
  all: ['barcodes'] as const,
  list: (params: Record<string, any>) => [...barcodesKeys.all, 'list', params] as const,
};

export const companySettingsKeys = {
  all: ['company-settings'] as const,
  list: () => [...companySettingsKeys.all, 'list'] as const,
};

export async function lookupBarcode(
  code: string,
  action: ScanAction = 'LOOKUP',
  shopId?: string,
  source: ScanSource = 'WEB',
): Promise<BarcodeLookupResult> {
  const { data } = await api.get<BarcodeLookupResult>('/barcodes/lookup', {
    params: { code, action, source, ...(shopId ? { shopId } : {}) },
  });
  return data;
}

export function useAttachBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { productId: string; barcodeValue: string; barcodeType?: string; supplierId?: string }) => {
      const { data } = await api.post(`/barcodes/products/${input.productId}`, {
        barcodeValue: input.barcodeValue,
        barcodeType: input.barcodeType,
        supplierId: input.supplierId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: barcodesKeys.all });
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
    queryKey: barcodesKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get('/barcodes', { params });
      return data as {
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

export function useUpdateBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { barcodeType?: string; isPrimary?: boolean; supplierId?: string | null } }) => {
      const { data } = await api.patch(`/barcodes/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: barcodesKeys.all });
    },
  });
}

export function useDeleteBarcode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete(`/barcodes/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: barcodesKeys.all });
    },
  });
}

export function useCompanySettings() {
  return useQuery({
    queryKey: companySettingsKeys.list(),
    queryFn: async () => {
      const { data } = await api.get('/company-settings');
      return data as Array<{ key: string; value: string }>;
    },
  });
}

export function useUpdateCompanySetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data } = await api.put(`/company-settings/${key}`, { value });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companySettingsKeys.all });
    },
  });
}

export function useMarkInvalid() {
  return useMutation({
    mutationFn: async ({ code, shopId }: { code: string; shopId?: string }) => {
      const { data } = await api.post('/barcodes/mark-invalid', {
        code,
        source: 'WEB',
        ...(shopId ? { shopId } : {}),
      });
      return data;
    },
  });
}

