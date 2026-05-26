import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';

export type WarehouseInventoryRow = {
  key: string;
  productId: string;
  shopId: string;
  storageLocationId: string | null;
  expiryDate: string;
  batchNumber: string | null;
};

const keys = {
  all: ['warehouse-inventory'] as const,
  list: (shopId?: string) => [...keys.all, 'list', shopId ?? 'all'] as const,
};

export function useWarehouseInventory(shopId?: string) {
  return useQuery({
    queryKey: keys.list(shopId),
    queryFn: async () => {
      const res = await api.get('/warehouse/inventory', {
        params: shopId ? { shop_id: shopId } : undefined,
      });
      const payload = res.data?.data ?? res.data;
      const rows = Array.isArray(payload) ? payload : (payload?.data ?? []);
      return rows as WarehouseInventoryRow[];
    },
    enabled: shopId !== '',
  });
}

/** Map expiry (and batch) by productId:shopId:storageLocationId (empty location → `default`). */
export function buildWarehouseExpiryMap(rows: WarehouseInventoryRow[]) {
  const expiry = new Map<string, string>();
  const batch = new Map<string, string>();
  for (const row of rows) {
    const locationKey = row.storageLocationId ?? 'default';
    const key = `${row.productId}:${row.shopId}:${locationKey}`;
    expiry.set(key, row.expiryDate);
    if (row.batchNumber) batch.set(key, row.batchNumber);
  }
  return { expiry, batch };
}
