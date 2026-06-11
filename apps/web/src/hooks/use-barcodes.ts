import { useMutation } from '@tanstack/react-query';
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
  | { found: false; barcode: string; duplicate: boolean };

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
  return useMutation({
    mutationFn: async (input: { productId: string; barcodeValue: string }) => {
      const { data } = await api.post(`/barcodes/products/${input.productId}`, {
        barcodeValue: input.barcodeValue,
      });
      return data;
    },
  });
}
