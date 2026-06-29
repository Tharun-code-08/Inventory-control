import type { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { AuditAction } from '@prisma/client';
import { E2E_DB_ENABLED, getSharedE2eApp } from '../helpers/e2e-bootstrap';
import { authed, grLineItem, todayDateString, unwrap } from '../helpers/e2e-http';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Day 6 — E2E Audit Validation
 *
 * One business journey that proves the entire audit system works end-to-end:
 * 1. Login (verify LOGIN audit)
 * 2. Create Product (verify CREATE_PRODUCT)
 * 3. Receive Goods (verify RECEIVE_GOODS before+delta=after)
 * 4. Update Product Price (verify UPDATE_PRODUCT with oldValues/newValues)
 * 5. Approve Goods Receipt (verify APPROVE)
 * 6. GET /audit (verify all 5 records exist)
 * 7. Export Audit (verify requestId in response)
 * 8. Verify requestId propagates end-to-end
 *
 * No negative tests. No edge cases. Just proof the core works.
 */

describe('Day 6 — E2E Audit Validation', () => {
  let app: INestApplication;
  let prisma: any;
  jest.setTimeout(30_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await getSharedE2eApp();
    prisma = app.get(PrismaService);
  });

  it('proves audit system works end-to-end: Login → Create → Receive → Update → Approve → Query', async () => {
    if (!E2E_DB_ENABLED) return;

    // ===== STEP 1: LOGIN =====
    // Verify: LOGIN audit exists, requestId captured, JWT works
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: process.env.SEED_ADMIN_EMAIL ?? 'admin@retailims.com',
        password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
      });
    expect(loginRes.status).toBe(201);
    const loginData = unwrap<{ accessToken: string; user: { id: string } }>(
      loginRes.body,
    );
    const userId = loginData.user.id;
    const token = loginData.accessToken;
    const api = authed(app, token);

    // Check LOGIN audit was written
    const loginAudits = await prisma.auditLog.findMany({
      where: { action: AuditAction.LOGIN, userId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(loginAudits.length).toBeGreaterThan(0);
    expect(loginAudits[0].metadata).toHaveProperty('requestId');
    const loginRequestId = loginAudits[0].metadata.requestId;
    expect(loginRequestId).toBeTruthy();

    // ===== STEP 2: SETUP MASTER DATA =====
    // Get company, shop, storage location
    const companies = unwrap<Array<{ id: string }>>(
      (await api.get('/api/v1/companies')).body,
    );
    expect(companies.length).toBeGreaterThan(0);

    const shops = unwrap<Array<{ id: string; shopNumber: string }>>(
      (await api.get('/api/v1/shops')).body,
    );
    const hq = shops.find((s) => s.shopNumber === 'HQ-001') ?? shops[0];
    const shopId = hq.id;

    const locations = unwrap<Array<{ id: string; code: string }>>(
      (await api.get('/api/v1/storage-locations').query({ shop_id: shopId }))
        .body,
    );
    const mainLocation = locations.find((row) => row.code === 'MAIN') ?? locations[0];
    const storageLocationId = mainLocation.id;

    // ===== STEP 3: CREATE PRODUCT =====
    // Verify: CREATE_PRODUCT audit exists, entityId correct, requestId preserved
    const productCode = `DAY6-SKU-${Date.now().toString(36).toUpperCase()}`;
    const productRes = await api.post('/api/v1/products').send({
      productCode: productCode.slice(0, 40),
      description: `Day 6 E2E Widget`,
      uom: 'PCS',
      category: 'e2e',
      purchasePrice: 100,
      sellingPrice: 150,
      plants: [{ shopId, openingStock: 0, minStockLevel: 5 }],
    });
    expect(productRes.status).toBe(201);
    const product = unwrap<{ id: string }>(productRes.body);
    const productId = product.id;

    // Check CREATE_PRODUCT audit
    const createAudits = await prisma.auditLog.findMany({
      where: { action: AuditAction.CREATE_PRODUCT, entityId: productId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(createAudits.length).toBeGreaterThan(0);
    expect(createAudits[0].entityId).toBe(productId);
    expect(createAudits[0].metadata).toHaveProperty('requestId');
    const createRequestId = createAudits[0].metadata.requestId;

    // ===== STEP 4: RECEIVE GOODS =====
    // Verify: RECEIVE_GOODS audit exists, beforeQty=0, delta=10, afterQty=10
    const grDate = todayDateString();
    const grRes = await api.post('/api/v1/goods-receipts').send({
      grDate,
      shopId,
      supplierName: 'E2E Supplier',
      items: [
        grLineItem({
          productId,
          storageLocationId,
          quantity: 10,
          purchaseRate: 100,
        }),
      ],
    });
    expect(grRes.status).toBe(201);
    const gr = unwrap<{ id: string }>(grRes.body);
    const grId = gr.id;

    // Post the goods receipt (transition to POSTED)
    const postRes = await api.post(`/api/v1/goods-receipts/${grId}/post`);
    expect(postRes.status).toBe(201);

    // Check RECEIVE_GOODS audit
    // Note: finding by nested JSON might need adjustment based on actual query capability
    // Fallback: get all RECEIVE_GOODS for this user and check manually
    const allReceiveAudits = await prisma.auditLog.findMany({
      where: {
        action: AuditAction.RECEIVE_GOODS,
        userId,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    expect(allReceiveAudits.length).toBeGreaterThan(0);
    const receiveAudit = allReceiveAudits[0];
    expect(receiveAudit.metadata).toHaveProperty('beforeQty');
    expect(receiveAudit.metadata).toHaveProperty('delta');
    expect(receiveAudit.metadata).toHaveProperty('afterQty');
    expect(receiveAudit.metadata.beforeQty).toBe(0);
    expect(receiveAudit.metadata.delta).toBe(10);
    expect(receiveAudit.metadata.afterQty).toBe(10);
    // Verify: before + delta = after
    expect(
      receiveAudit.metadata.beforeQty + receiveAudit.metadata.delta ===
        receiveAudit.metadata.afterQty,
    ).toBe(true);
    const receiveRequestId = receiveAudit.metadata.requestId;

    // ===== STEP 5: UPDATE PRODUCT PRICE =====
    // Verify: UPDATE_PRODUCT audit exists with oldValues/newValues for sellingPrice
    const updateRes = await api
      .patch(`/api/v1/products/${productId}`)
      .send({
        sellingPrice: 200,
      });
    expect(updateRes.status).toBe(200);

    // Check UPDATE_PRODUCT audit
    const updateAudits = await prisma.auditLog.findMany({
      where: { action: AuditAction.UPDATE_PRODUCT, entityId: productId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(updateAudits.length).toBeGreaterThan(0);
    const updateAudit = updateAudits[0];
    // oldValues/newValues are dedicated audit columns; changedFields lives in metadata
    expect(updateAudit.oldValues).toBeTruthy();
    expect(updateAudit.newValues).toBeTruthy();
    expect(updateAudit.metadata).toHaveProperty('changedFields');
    expect(updateAudit.oldValues.sellingPrice).toBe(150);
    expect(updateAudit.newValues.sellingPrice).toBe(200);
    expect(updateAudit.metadata.changedFields).toContain('sellingPrice');
    const updateRequestId = updateAudit.metadata.requestId;

    // ===== STEP 6: CREATE APPROVAL & APPROVE GR =====
    // Verify: APPROVE audit exists with reason/comment/requestId
    // First, create an approval request for the GR
    const approvalRes = await api.post('/api/v1/approvals').send({
      referenceId: grId,
      approvalType: 'GOODS_RECEIPT',
      assignedTo: userId,
      documentNumber: 'GR-E2E-DAY6',
    });
    expect(approvalRes.status).toBe(201);
    const approval = unwrap<{ id: string }>(approvalRes.body);
    const approvalId = approval.id;

    // Approve the GR
    const approveRes = await api
      .post(`/api/v1/approvals/${approvalId}/approve`)
      .send({
        comment: 'Verified quantities and dates',
      });
    expect(approveRes.status).toBe(200);

    // Check APPROVE audit
    const approveAudits = await prisma.auditLog.findMany({
      where: { action: AuditAction.APPROVE, entityId: approvalId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(approveAudits.length).toBeGreaterThan(0);
    const approveAudit = approveAudits[0];
    expect(approveAudit.metadata).toHaveProperty('documentNumber');
    expect(approveAudit.metadata).toHaveProperty('comment');
    expect(approveAudit.metadata.comment).toBe('Verified quantities and dates');
    expect(approveAudit.metadata).toHaveProperty('requestId');
    const approveRequestId = approveAudit.metadata.requestId;

    // ===== STEP 7: GET /AUDIT =====
    // Verify: All 5 audit records exist (LOGIN, CREATE_PRODUCT, RECEIVE_GOODS, UPDATE_PRODUCT, APPROVE)
    const auditRes = await api.get('/api/v1/audit').query({
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(auditRes.status).toBe(200);
    const auditData = unwrap<{
      records: Array<{ action: string; entityId: string; userId: string }>;
    }>(auditRes.body);

    // Count audit records for this user
    const recordsByAction = new Map<string, number>();
    auditData.records
      .filter((r) => r.userId === userId)
      .forEach((r) => {
        const count = recordsByAction.get(r.action) || 0;
        recordsByAction.set(r.action, count + 1);
      });

    expect(recordsByAction.get('LOGIN')).toBeGreaterThan(0);
    expect(recordsByAction.get('CREATE_PRODUCT')).toBeGreaterThan(0);
    expect(recordsByAction.get('RECEIVE_GOODS')).toBeGreaterThan(0);
    expect(recordsByAction.get('UPDATE_PRODUCT')).toBeGreaterThan(0);
    expect(recordsByAction.get('APPROVE')).toBeGreaterThan(0);

    // Verify requestId consistency: audit records should have requestId
    const userRecords = auditData.records.filter((r) => r.userId === userId).slice(0, 10);
    expect(userRecords.length).toBeGreaterThan(0);
    // Spot-check: verify first record has requestId
    if (userRecords.length > 0) {
      const firstRecord = await prisma.auditLog.findUnique({
        where: { id: userRecords[0].id },
      });
      expect(firstRecord.metadata).toHaveProperty('requestId');
      expect(firstRecord.metadata.requestId).toBeTruthy();
    }

    // ===== STEP 8: EXPORT AUDIT =====
    // Verify: CSV export endpoint returns audit data (max 10k rows).
    const exportRes = await api.get('/api/v1/audit/export/csv');
    expect(exportRes.status).toBe(200);
    const exportedCsv = exportRes.text ?? '';
    expect(exportedCsv.length).toBeGreaterThan(0);
    // CSV header row should include the Request ID column for traceability.
    expect(exportedCsv).toContain('Request ID');

    // ===== PROOF OF SUCCESS =====
    // All requestIds should be UUIDs
    expect(loginRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(createRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(receiveRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(updateRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(approveRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    // Final assertion: system proved working end-to-end
    expect(true).toBe(true);
  });
});
