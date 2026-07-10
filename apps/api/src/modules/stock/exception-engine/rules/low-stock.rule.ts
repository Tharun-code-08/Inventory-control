import { Injectable } from '@nestjs/common';
import { ExceptionRule, ExceptionInput, RuleContext } from '../exception.rule';

/**
 * LOW_STOCK exceptions: one per (product, plant) whose current stock is below
 * the configured minimum stock level.
 */
@Injectable()
export class LowStockRule extends ExceptionRule {
  name = 'LOW_STOCK_RULE';
  type = 'LOW_STOCK';

  async evaluate({ tx, companyId }: RuleContext): Promise<ExceptionInput[]> {
    const rows = await tx.$queryRaw<
      Array<{
        product_id: string;
        shop_id: string;
        product_code: string;
        description: string | null;
        current_stock: string;
        min_stock_level: string;
        reorder_qty: string | null;
      }>
    >`
      SELECT pp.product_id, pp.shop_id, p.product_code, p.description,
             COALESCE(ss.current_stock, 0)::text AS current_stock,
             pp.min_stock_level::text AS min_stock_level,
             pp.reorder_qty::text AS reorder_qty
      FROM product_plants pp
      JOIN shops s ON s.id = pp.shop_id AND s.company_id = ${companyId}::uuid
      JOIN products p ON p.id = pp.product_id
      LEFT JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
      WHERE pp.is_active = true
        AND pp.min_stock_level > 0
        AND COALESCE(ss.current_stock, 0) < pp.min_stock_level
    `;

    return rows.map((row) => {
      const current = Number(row.current_stock);
      const min = Number(row.min_stock_level);
      const severity = current <= 0 ? 'CRITICAL' : current < min / 2 ? 'HIGH' : 'MEDIUM';
      return {
        type: 'LOW_STOCK' as const,
        severity,
        entityType: 'PRODUCT' as const,
        entityId: row.product_id,
        title: `${row.product_code} below minimum stock (${row.current_stock} / ${row.min_stock_level})`,
        description: row.description ?? undefined,
        metadata: {
          schemaVersion: 1,
          shopId: row.shop_id,
          currentStock: row.current_stock,
          minimumStock: row.min_stock_level,
          reorderQty: row.reorder_qty,
        },
      };
    });
  }
}
