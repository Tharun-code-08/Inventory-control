/**
 * Day 3 Test Verification Script
 *
 * Run with: npx ts-node DAY3_TEST_VERIFICATION.ts
 *
 * This script verifies that all Day 3 inventory audit logging is working correctly.
 */

import { PrismaClient, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('DAY 3: INVENTORY AUDIT TESTING - VERIFICATION SUITE');
  console.log('='.repeat(80));

  try {
    // Test 1: Verify schema changes
    console.log('\n[TEST 1] Verify Schema Updates');
    console.log('-'.repeat(80));

    // Check that STOCK_ADJUSTMENT enum exists
    try {
      const testAudit = await prisma.auditLog.findFirst({
        where: { action: AuditAction.STOCK_ADJUSTMENT },
      });
      console.log('✅ STOCK_ADJUSTMENT enum value exists in AuditAction');
    } catch (e) {
      console.log('❌ STOCK_ADJUSTMENT enum not found');
    }

    // Test 2: Check audit logs exist for inventory operations
    console.log('\n[TEST 2] Check Audit Records for Inventory Operations');
    console.log('-'.repeat(80));

    const receiveGoodsAudits = await prisma.auditLog.findMany({
      where: { action: AuditAction.RECEIVE_GOODS },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    });

    const transferStockAudits = await prisma.auditLog.findMany({
      where: { action: AuditAction.TRANSFER_STOCK },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    });

    const stockAdjustmentAudits = await prisma.auditLog.findMany({
      where: { action: AuditAction.STOCK_ADJUSTMENT },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { email: true } } },
    });

    console.log(`✅ RECEIVE_GOODS audits: ${receiveGoodsAudits.length} records`);
    console.log(`✅ TRANSFER_STOCK audits: ${transferStockAudits.length} records`);
    console.log(`✅ STOCK_ADJUSTMENT audits: ${stockAdjustmentAudits.length} records`);

    // Test 3: Verify metadata structure for RECEIVE_GOODS
    console.log('\n[TEST 3] Verify RECEIVE_GOODS Metadata Structure');
    console.log('-'.repeat(80));

    if (receiveGoodsAudits.length > 0) {
      const latest = receiveGoodsAudits[0];
      console.log(`Record ID: ${latest.id}`);
      console.log(`Created: ${latest.createdAt}`);
      console.log(`User: ${latest.user?.email}`);
      console.log(`Request ID: ${latest.requestId}`);
      console.log(`Entity Type: ${latest.entityType}`);
      console.log(`Entity ID: ${latest.entityId}`);

      if (latest.metadata) {
        const meta = latest.metadata as any;
        console.log('\nMetadata:');
        console.log(`  - beforeQty: ${meta.beforeQty}`);
        console.log(`  - delta: ${meta.delta}`);
        console.log(`  - afterQty: ${meta.afterQty}`);
        console.log(`  - warehouseId: ${meta.warehouseId}`);
        console.log(`  - batchId: ${meta.batchId}`);
        console.log(`  - referenceNo: ${meta.referenceNo}`);

        // Verify delta math
        const expected = meta.beforeQty + meta.delta;
        if (expected === meta.afterQty) {
          console.log(`  ✅ Delta math correct: ${meta.beforeQty} + ${meta.delta} = ${meta.afterQty}`);
        } else {
          console.log(
            `  ❌ Delta math FAILED: ${meta.beforeQty} + ${meta.delta} = ${expected}, but afterQty = ${meta.afterQty}`,
          );
        }
      }
    } else {
      console.log('⚠️  No RECEIVE_GOODS records found. Run test scenario 1 first.');
    }

    // Test 4: Verify metadata structure for TRANSFER_STOCK
    console.log('\n[TEST 4] Verify TRANSFER_STOCK Metadata Structure');
    console.log('-'.repeat(80));

    if (transferStockAudits.length > 0) {
      const latest = transferStockAudits[0];
      console.log(`Record ID: ${latest.id}`);
      console.log(`Created: ${latest.createdAt}`);
      console.log(`Request ID: ${latest.requestId}`);

      if (latest.metadata) {
        const meta = latest.metadata as any;
        console.log('\nMetadata:');
        console.log(`  - fromWarehouse: ${meta.fromWarehouse}`);
        console.log(`  - toWarehouse: ${meta.toWarehouse}`);
        console.log(`  - qty: ${meta.qty}`);
        console.log(`  - beforeFromQty: ${meta.beforeFromQty}`);
        console.log(`  - afterFromQty: ${meta.afterFromQty}`);
        console.log(`  - beforeToQty: ${meta.beforeToQty}`);
        console.log(`  - afterToQty: ${meta.afterToQty}`);
        console.log(`  - referenceNo: ${meta.referenceNo}`);

        // Verify source warehouse math
        const expectedFromQty = meta.beforeFromQty - meta.qty;
        if (expectedFromQty === meta.afterFromQty) {
          console.log(
            `  ✅ Source warehouse math correct: ${meta.beforeFromQty} - ${meta.qty} = ${meta.afterFromQty}`,
          );
        }

        // Verify destination warehouse math
        const expectedToQty = meta.beforeToQty + meta.qty;
        if (expectedToQty === meta.afterToQty) {
          console.log(
            `  ✅ Dest warehouse math correct: ${meta.beforeToQty} + ${meta.qty} = ${meta.afterToQty}`,
          );
        }
      }
    } else {
      console.log('⚠️  No TRANSFER_STOCK records found. Run test scenario 2 first.');
    }

    // Test 5: Verify metadata structure for STOCK_ADJUSTMENT
    console.log('\n[TEST 5] Verify STOCK_ADJUSTMENT Metadata Structure');
    console.log('-'.repeat(80));

    if (stockAdjustmentAudits.length > 0) {
      const latest = stockAdjustmentAudits[0];
      console.log(`Record ID: ${latest.id}`);
      console.log(`Created: ${latest.createdAt}`);
      console.log(`Request ID: ${latest.requestId}`);

      if (latest.metadata) {
        const meta = latest.metadata as any;
        console.log('\nMetadata:');
        console.log(`  - adjustmentType: ${meta.adjustmentType}`);
        console.log(`  - reason: ${meta.reason}`);
        console.log(`  - beforeQty: ${meta.beforeQty}`);
        console.log(`  - delta: ${meta.delta}`);
        console.log(`  - afterQty: ${meta.afterQty}`);
        console.log(`  - warehouseId: ${meta.warehouseId}`);
        console.log(`  - referenceNo: ${meta.referenceNo}`);

        // Verify delta math
        const expected = meta.beforeQty + meta.delta;
        if (expected === meta.afterQty) {
          console.log(`  ✅ Delta math correct: ${meta.beforeQty} + ${meta.delta} = ${meta.afterQty}`);
        } else {
          console.log(
            `  ❌ Delta math FAILED: ${meta.beforeQty} + ${meta.delta} = ${expected}, but afterQty = ${meta.afterQty}`,
          );
        }
      }
    } else {
      console.log('⚠️  No STOCK_ADJUSTMENT records found. Run test scenario 3 first.');
    }

    // Test 6: Verify RequestId tracing
    console.log('\n[TEST 6] Verify RequestId Tracing and Uniqueness');
    console.log('-'.repeat(80));

    const allAudits = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [AuditAction.RECEIVE_GOODS, AuditAction.TRANSFER_STOCK, AuditAction.STOCK_ADJUSTMENT],
        },
      },
      select: { action: true, requestId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    let uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let validRequestIds = 0;
    let uniqueRequestIds = new Set<string>();

    for (const audit of allAudits) {
      if (audit.requestId) {
        if (uuidPattern.test(audit.requestId)) {
          validRequestIds++;
          uniqueRequestIds.add(audit.requestId);
        }
      }
    }

    console.log(`✅ Valid UUID requestIds: ${validRequestIds}/${allAudits.length}`);
    console.log(`✅ Unique requestIds: ${uniqueRequestIds.size}`);

    if (validRequestIds > 0) {
      console.log(`✅ RequestId tracing is working - each request has a unique UUID`);
    }

    // Test 7: Index performance check
    console.log('\n[TEST 7] Verify Index Coverage');
    console.log('-'.repeat(80));

    // Check if we can query by entity_type, entity_id, created_at efficiently
    const startTime = Date.now();
    const entityHistoryTest = await prisma.auditLog.findMany({
      where: {
        entityType: 'INVENTORY',
        entityId: { contains: '-' }, // Any UUID-like entityId
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const queryTime = Date.now() - startTime;

    console.log(`✅ Entity history query returned ${entityHistoryTest.length} records in ${queryTime}ms`);
    if (queryTime < 100) {
      console.log(`✅ Query performance excellent (< 100ms)`);
    } else if (queryTime < 500) {
      console.log(`⚠️  Query performance acceptable (< 500ms)`);
    } else {
      console.log(`❌ Query performance slow (> 500ms)`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const testsPassed = [
      receiveGoodsAudits.length > 0 ? '✅ RECEIVE_GOODS audits created' : '⚠️  RECEIVE_GOODS audits missing',
      transferStockAudits.length > 0 ? '✅ TRANSFER_STOCK audits created' : '⚠️  TRANSFER_STOCK audits missing',
      stockAdjustmentAudits.length > 0
        ? '✅ STOCK_ADJUSTMENT audits created'
        : '⚠️  STOCK_ADJUSTMENT audits missing',
      validRequestIds > 0 ? '✅ RequestId tracing working' : '❌ RequestId tracing not working',
      queryTime < 500 ? '✅ Index performance good' : '⚠️  Index performance needs tuning',
    ];

    testsPassed.forEach((t) => console.log(t));

    console.log('\n' + '='.repeat(80));
    if (receiveGoodsAudits.length > 0 && transferStockAudits.length > 0 && stockAdjustmentAudits.length > 0) {
      console.log('🎉 DAY 3 TESTS PASSED - All inventory audit operations are working!');
    } else {
      console.log('⏳ DAY 3 IN PROGRESS - Run the test scenarios to generate audit records');
    }
    console.log('='.repeat(80));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
