import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';
import { QUERY_STALE_TIME } from '@/lib/constants';

export type WarehouseStockRow = {
  productId: string;
  productCode: string;
  description: string;
  category: string;
  shopId: string;
  currentStock: number;
  minStockLevel: number;
};

/** Per-plant stock rows from GET /reports/inventory (requires report:view). */
export function useWarehouseInventory(shopId?: string, lowStockOnly = false) {
  return useQuery({
    queryKey: ['reports', 'inventory', shopId ?? 'all', lowStockOnly],
    queryFn: async () => {
      const res = await api.get('/reports/inventory', {
        params: {
          ...(shopId ? { shop_id: shopId } : {}),
          ...(lowStockOnly ? { low_stock_only: 'true' } : {}),
        },
      });
      const rows = unwrapData(res.data);
      return (Array.isArray(rows) ? rows : []).map(
        (r: Record<string, unknown>): WarehouseStockRow => ({
          productId: String(r.product_id ?? ''),
          productCode: String(r.product_code ?? ''),
          description: String(r.description ?? ''),
          category: String(r.category ?? ''),
          shopId: String(r.shop_id ?? ''),
          currentStock: Number(r.current_stock ?? 0),
          minStockLevel: Number(r.min_stock_level ?? 0),
        }),
      );
    },
    enabled: !!shopId,
    staleTime: QUERY_STALE_TIME.lists,
  });
}

export type StockTransfer = {
  id: string;
  transferNumber: string;
  transferDate: string;
  status: string;
  fromShop?: { id: string; shopName: string };
  toShop?: { id: string; shopName: string };
};

/** Transfers touching a shop, either direction. */
export function useStockTransfers(shopId?: string, direction: 'from' | 'to' | 'both' = 'both') {
  return useQuery({
    queryKey: ['stock-transfers', shopId ?? 'all', direction],
    queryFn: async () => {
      // The API treats from/to filters as AND, so "both" fetches each
      // direction and merges (transfers are low-volume).
      const fetchDir = async (key: 'from_shop_id' | 'to_shop_id') => {
        const res = await api.get('/stock-transfers', {
          params: shopId ? { [key]: shopId } : {},
        });
        const payload = unwrapData(res.data) as { items?: unknown[] } | unknown[];
        const rows = Array.isArray(payload) ? payload : (payload?.items ?? []);
        return rows as StockTransfer[];
      };
      if (!shopId || direction !== 'both') {
        return fetchDir(direction === 'to' ? 'to_shop_id' : 'from_shop_id');
      }
      const [from, to] = await Promise.all([fetchDir('from_shop_id'), fetchDir('to_shop_id')]);
      const seen = new Set<string>();
      return [...from, ...to].filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });
    },
    enabled: !!shopId,
    staleTime: QUERY_STALE_TIME.lists,
  });
}
