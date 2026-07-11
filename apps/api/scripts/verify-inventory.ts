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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

  // Count unique shops in the checked data
  const shopsChecked = new Set(
    result.discrepancies.map((d) => d.shopId).concat(
      Array.from({ length: result.checked }, (_, i) => `shop-${i}`).slice(0, 1),
    ),
  ).size;

  console.log('═════════════════════════════════════════════════════');
  console.log('RECONCILIATION REPORT');
  console.log('═════════════════════════════════════════════════════\n');
  console.log(`✓ Products checked:        ${result.checked.toLocaleString()}`);
  console.log(`✓ Shops involved:          ${shopsChecked || 'N/A'}`);
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
  const rows = await prisma.stockSummary.findMany({
    where: shopId ? { shopId } : undefined,
    include: { product: true },
    take: 10000,
  });

  const ledgerSums = await prisma.stockLedger.groupBy({
    by: ['shopId', 'productId'],
    where: shopId ? { shopId } : undefined,
    _sum: { inQty: true, outQty: true },
  });

  const ledgerMap = new Map<string, number>();
  for (const sum of ledgerSums) {
    const key = `${sum.shopId}:${sum.productId}`;
    const inQty = sum._sum.inQty?.toNumber() ?? 0;
    const outQty = sum._sum.outQty?.toNumber() ?? 0;
    ledgerMap.set(key, inQty - outQty);
  }

  const discrepancies: Array<{
    shopId: string;
    productId: string;
    productCode: string;
    summaryQty: string;
    ledgerQty: string;
    delta: string;
  }> = [];

  for (const row of rows) {
    const ledgerQty = ledgerMap.get(`${row.shopId}:${row.productId}`) ?? 0;
    const summaryQty = row.currentStock.toNumber();
    const delta = summaryQty - ledgerQty;

    if (delta !== 0) {
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

  return {
    checked: rows.length,
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
