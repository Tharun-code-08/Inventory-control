import { Injectable } from '@nestjs/common';
import { ExceptionRule, ExceptionInput, RuleContext } from '../exception.rule';

/**
 * INVENTORY_INTEGRITY exceptions — data-quality issues that quietly degrade
 * the system: negative balances and stocked products without a storage location.
 */
@Injectable()
export class IntegrityRule extends ExceptionRule {
  name = 'INTEGRITY_RULE';
  type = 'INVENTORY_INTEGRITY';

  async evaluate({ tx, companyId }: RuleContext): Promise<ExceptionInput[]> {
    const [negative, missingLocation] = await Promise.all([
      tx.$queryRaw<
        Array<{ product_id: string; shop_id: string; product_code: string; current_stock: string }>
      >`
        SELECT ss.product_id, ss.shop_id, p.product_code, ss.current_stock::text AS current_stock
        FROM stock_summary ss
        JOIN shops s ON s.id = ss.shop_id AND s.company_id = ${companyId}::uuid
        JOIN products p ON p.id = ss.product_id
        WHERE ss.current_stock < 0
      `,
      tx.$queryRaw<
        Array<{ product_id: string; shop_id: string; product_code: string }>
      >`
        SELECT pp.product_id, pp.shop_id, p.product_code
        FROM product_plants pp
        JOIN shops s ON s.id = pp.shop_id AND s.company_id = ${companyId}::uuid
        JOIN products p ON p.id = pp.product_id
        JOIN stock_summary ss ON ss.shop_id = pp.shop_id AND ss.product_id = pp.product_id
        WHERE pp.is_active = true
          AND pp.storage_location_id IS NULL
          AND ss.current_stock > 0
      `,
    ]);

    const results: ExceptionInput[] = [];

    for (const row of negative) {
      results.push({
        type: 'INVENTORY_INTEGRITY',
        severity: 'CRITICAL',
        entityType: 'PRODUCT',
        entityId: row.product_id,
        title: `${row.product_code} has negative stock (${row.current_stock})`,
        description: 'Ledger balance is below zero — investigate recent movements',
        metadata: {
          schemaVersion: 1,
          issue: 'NEGATIVE_BALANCE',
          shopId: row.shop_id,
          currentStock: row.current_stock,
        },
      });
    }

    for (const row of missingLocation) {
      results.push({
        type: 'INVENTORY_INTEGRITY',
        severity: 'LOW',
        entityType: 'PRODUCT',
        entityId: row.product_id,
        title: `${row.product_code} has stock but no storage location assigned`,
        metadata: {
          schemaVersion: 1,
          issue: 'MISSING_STORAGE_LOCATION',
          shopId: row.shop_id,
        },
      });
    }

    return results;
  }
}
