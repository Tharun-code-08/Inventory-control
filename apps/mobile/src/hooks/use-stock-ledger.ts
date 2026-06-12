import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { unwrapData } from '@/lib/envelope';

export type StockMovement = {
  id: string;
  transactionDate: string;
  transactionType: string;
  productCode: string;
  description: string;
  inQty: number;
  outQty: number;
  balanceQty: number;
  referenceNumber: string | null;
};

type LedgerFilters = {
  productId?: string;
  shopId?: string;
  dateFrom?: string;
  dateTo?: string;
};

/** Stock movements from GET /reports/stock-ledger (requires report:view). */
export function useStockLedger(filters: LedgerFilters) {
  return useQuery({
    queryKey: ['reports', 'stock-ledger', filters],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.productId) params.product_id = filters.productId;
      if (filters.shopId) params.shop_id = filters.shopId;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo) params.date_to = filters.dateTo;
      const res = await api.get('/reports/stock-ledger', { params });
      const rows = unwrapData(res.data);
      return (Array.isArray(rows) ? rows : []).map(
        (r: Record<string, unknown>): StockMovement => ({
          id: String(r.id ?? ''),
          transactionDate: String(r.transaction_date ?? ''),
          transactionType: String(r.transaction_type ?? ''),
          productCode: String(r.product_code ?? ''),
          description: String(r.description ?? ''),
          inQty: Number(r.in_qty ?? 0),
          outQty: Number(r.out_qty ?? 0),
          balanceQty: Number(r.balance_qty ?? 0),
          referenceNumber: (r.reference_number as string) ?? null,
        }),
      );
    },
    enabled: !!(filters.productId || filters.shopId),
  });
}
