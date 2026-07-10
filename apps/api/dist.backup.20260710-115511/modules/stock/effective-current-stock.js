"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EFFECTIVE_CURRENT_STOCK_SQL = void 0;
exports.effectiveCurrentStockExpr = effectiveCurrentStockExpr;
function effectiveCurrentStockExpr(summaryAlias = 's') {
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
exports.EFFECTIVE_CURRENT_STOCK_SQL = effectiveCurrentStockExpr('s');
//# sourceMappingURL=effective-current-stock.js.map