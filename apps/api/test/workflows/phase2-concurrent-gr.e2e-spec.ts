import type { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { createE2eApp, E2E_DB_ENABLED } from '../helpers/e2e-bootstrap';
import { authed, todayDateString, unwrap } from '../helpers/e2e-http';
import { seedWorkflowMasterData } from '../helpers/workflow-fixture';

/**
 * Phase 2 — Concurrent goods receipt posting on the same PO.
 * Two users post partial receipts in parallel; combined qty must not exceed PO.
 */
describe('Phase 2 — Concurrent GR posting (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(120_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await createE2eApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('allows only one concurrent post when combined qty would exceed the PO', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const token = ctx.token;
    const today = todayDateString();

    const poRes = await authed(app, token).post('/api/v1/purchase-orders').send({
      poDate: today,
      shopId: ctx.shopId,
      supplier: 'Concurrent GR Supplier',
      items: [{ productId: ctx.productId, orderQty: 10, rate: 3 }],
    });
    expect(poRes.status).toBe(201);
    const po = unwrap<{ id: string }>(poRes.body);
    await authed(app, token).post(`/api/v1/purchase-orders/${po.id}/confirm`).expect(201);

    const createPayload = {
      grDate: today,
      shopId: ctx.shopId,
      purchaseOrderId: po.id,
      supplierName: 'Concurrent GR Supplier',
      items: [{ productId: ctx.productId, quantity: 7, uom: 'PCS', purchaseRate: 3 }],
    };

    const [grA, grB] = await Promise.all([
      authed(app, token).post('/api/v1/goods-receipts').send(createPayload),
      authed(app, token).post('/api/v1/goods-receipts').send(createPayload),
    ]);
    expect(grA.status).toBe(201);
    expect(grB.status).toBe(201);

    const idA = unwrap<{ id: string }>(grA.body).id;
    const idB = unwrap<{ id: string }>(grB.body).id;

    const server = app.getHttpServer();
    const [postA, postB] = await Promise.all([
      request(server)
        .post(`/api/v1/goods-receipts/${idA}/post`)
        .set('Authorization', `Bearer ${token}`),
      request(server)
        .post(`/api/v1/goods-receipts/${idB}/post`)
        .set('Authorization', `Bearer ${token}`),
    ]);

    const postStatuses = [postA.status, postB.status];
    expect(postStatuses.filter((s) => s === 201)).toHaveLength(1);
    const failed = postStatuses.find((s) => s !== 201);
    expect(failed).toBeDefined();
    expect([400, 422]).toContain(failed);

    const report = unwrap<Array<{ product_id: string; current_stock: string | number }>>(
      (await authed(app, token).get('/api/v1/reports/inventory').query({ shop_id: ctx.shopId })).body,
    );
    const row = report.find((r) => r.product_id === ctx.productId);
    expect(Number(row?.current_stock ?? 0)).toBe(7);
  });
});
