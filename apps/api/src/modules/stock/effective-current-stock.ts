/**
 * Live on-hand quantity for a product_plants row.
 * Requires SQL aliases: product_plants pp, stock_summary {summaryAlias} (LEFT JOIN).
 * When stock_ledger rows exist, net movement wins (matches Products / warehouse display).
 */
export function effectiveCurrentStockExpr(summaryAlias = 's'): string {
  return `
COALESCE(
  (
    SELECT CASE
      WHEN COUNT(*) > 0 THEN COALESCE(SUM(sl.in_qty), 0) - COALESCE(SUM(sl.out_qty), 0)
      ELSE NULL
    END
    FROM stock_ledger sl
    WHERE sl.shop_id = pp.shop_id AND sl.product_id = pp.product_id
  ),
  ${summaryAlias}.current_stock,
  0
)`;
}

/** Default alias `s` — use with `LEFT JOIN stock_summary s`. */
export const EFFECTIVE_CURRENT_STOCK_SQL = effectiveCurrentStockExpr('s');
