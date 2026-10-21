#!/usr/bin/env node

/**
 * Deployment gate: Verify stock_summary integrity before/after production release.
 *
 * Usage:
 *   npx ts-node scripts/verify-inventory.ts [--shop-id=<uuid>]
 *
 * Exit codes:
 *   0 = success (no discrepancies)
 *   1 = discrepancies found
 *   2 = error during verification
 */

import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { createPgAdapter } from '../src/prisma/pg-adapter';

const prisma = new PrismaClient({ adapter: createPgAdapter() });

async function main() {
  const shopId = process.argv
    .find((arg) => arg.startsWith('--shop-id='))
    ?.split('=')[1];

  console.log('🔍 Stock Inventory Reconciliation Verification\n');
  console.log(`Target: ${shopId ? `Shop ${shopId}` : 'All shops'}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  const result = await verifyStockIntegrity(shopId);

  const durationMs = Date.now() - startTime;
  const durationS = (durationMs / 1000).toFixed(2);

  console.log('═════════════════════════════════════════════════════');
  console.log('RECONCILIATION REPORT');
  console.log('═════════════════════════════════════════════════════\n');
  console.log(`✓ Products checked:        ${result.checked.toLocaleString()}`);
  console.log(`✓ Shops involved:          ${result.shopsChecked}`);
  console.log(`✓ Ledger entries scanned:  ${result.ledgerEntriesScanned.toLocaleString()}`);
  console.log(`✓ Duration:                ${durationS}s\n`);

  if (result.discrepanciesCount === 0) {
    console.log('STATUS: ✅ PASS');
    console.log('─────────────────────────────────────────────────────');
    console.log('No discrepancies found between stock_summary and ledger');
    console.log('═════════════════════════════════════════════════════\n');
    process.exit(0);
  }

  console.log(`STATUS: ❌ FAIL — ${result.discrepanciesCount} discrepancy(ies)\n`);
  console.log('DETAILS:');
  console.log('─────────────────────────────────────────────────────');
  result.discrepancies.forEach((d, i) => {
    console.log(`${i + 1}. Shop:    ${d.shopId}`);
    console.log(`   Product: ${d.productCode} (${d.productId})`);
    console.log(`   Summary: ${d.summaryQty} | Ledger: ${d.ledgerQty} | Delta: ${d.delta}\n`);
  });
  console.log('═════════════════════════════════════════════════════\n');
  console.log('ACTION: Deploy blocked. Investigate discrepancies before retry.\n');

  process.exit(1);
}

async function verifyStockIntegrity(shopId?: string) {
  // Page through every summary row: a fixed cap silently skipped rows and
  // still reported PASS.
  const rows: Array<Prisma.StockSummaryGetPayload<{ include: { product: true } }>> = [];
  for (let cursor: string | undefined; ; ) {
    const page = await prisma.stockSummary.findMany({
      where: shopId ? { shopId } : undefined,
      include: { product: true },
      orderBy: { id: 'asc' },
      take: 5000,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    rows.push(...page);
    if (page.length < 5000) break;
    cursor = page[page.length - 1].id;
  }

  const ledgerSums = await prisma.stockLedger.groupBy({
    by: ['shopId', 'productId'],
    where: shopId ? { shopId } : undefined,
    _sum: { inQty: true, outQty: true },
  });

  // Compare as Decimals: float arithmetic on fractional quantities (e.g. 0.1 +
  // 0.2) would report false discrepancies.
  const zero = new Prisma.Decimal(0);
  const ledgerMap = new Map<string, Prisma.Decimal>();
  for (const sum of ledgerSums) {
    const key = `${sum.shopId}:${sum.productId}`;
    ledgerMap.set(key, (sum._sum.inQty ?? zero).sub(sum._sum.outQty ?? zero));
  }

  const discrepancies: Array<{
    shopId: string;
    productId: string;
    productCode: string;
    summaryQty: string;
    ledgerQty: string;
    delta: string;
  }> = [];

  // Ledger movements with no summary row at all are discrepancies too.
  const summaryKeys = new Set(rows.map((r) => `${r.shopId}:${r.productId}`));
  for (const [key, ledgerQty] of ledgerMap) {
    if (summaryKeys.has(key) || ledgerQty.isZero()) continue;
    const [missingShopId, missingProductId] = key.split(':');
    discrepancies.push({
      shopId: missingShopId,
      productId: missingProductId,
      productCode: '(no stock summary row)',
      summaryQty: '0',
      ledgerQty: ledgerQty.toString(),
      delta: ledgerQty.neg().toString(),
    });
  }

  for (const row of rows) {
    const ledgerQty = ledgerMap.get(`${row.shopId}:${row.productId}`) ?? zero;
    const summaryQty = row.currentStock;
    const delta = summaryQty.sub(ledgerQty);

    if (!delta.isZero()) {
      discrepancies.push({
        shopId: row.shopId,
        productId: row.productId,
        productCode: row.product.productCode,
        summaryQty: summaryQty.toString(),
        ledgerQty: ledgerQty.toString(),
        delta: delta.toString(),
      });
    }
  }

  const shopsInData = new Set(rows.map((r) => r.shopId)).size;

  return {
    checked: rows.length,
    shopsChecked: shopsInData,
    ledgerEntriesScanned: ledgerSums.length,
    discrepanciesCount: discrepancies.length,
    discrepancies,
  };
}

main()
  .catch((err) => {
    console.error('❌ ERROR:', err.message);
    process.exit(2);
  })
  .finally(() => prisma.$disconnect());
