import type { INestApplication } from '@nestjs/common';
import { createE2eApp, E2E_DB_ENABLED } from '../helpers/e2e-bootstrap';
import { authed, tomorrowDateString, todayDateString, unwrap } from '../helpers/e2e-http';
import { seedWorkflowMasterData } from '../helpers/workflow-fixture';

/**
 * Phase 3 — Sales & Finance: customer → sales order, goods issue stock guard.
 */
describe('Phase 3 — Sales & Finance workflows (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(90_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await createE2eApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('creates a sales order for a customer with line tax/discount fields', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const today = todayDateString();

    const soRes = await api.post('/api/v1/sales-orders').send({
      shopId: ctx.shopId,
      orderDate: today,
      customerId: ctx.customerId,
      items: [
        {
          productId: ctx.productId,
          quantity: 2,
          uom: 'PCS',
          unitPrice: 19.99,
          discountAmount: 1,
          taxRate: 0.18,
        },
      ],
    });
    expect(soRes.status).toBe(201);
    const so = unwrap<{ id: string; soNumber: string; totalValue: string | number }>(soRes.body);
    expect(so.soNumber).toBeTruthy();
    expect(Number(so.totalValue)).toBeGreaterThan(0);
  });

  it('blocks goods issue when stock is insufficient (no negative inventory)', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const today = todayDateString();

    await api
      .post('/api/v1/goods-issues')
      .send({
        giDate: today,
        shopId: ctx.shopId,
        issueReason: 'E2E oversell probe',
        items: [{ productId: ctx.productId, quantity: 999, uom: 'PCS' }],
      })
      .expect((res) => expect([400, 409, 422]).toContain(res.status));
  });

  it('allows goods issue after goods receipt posts stock', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const today = todayDateString();
    const poDate = tomorrowDateString();

    const poRes = await api.post('/api/v1/purchase-orders').send({
      poDate,
      shopId: ctx.shopId,
      supplier: 'E2E Supplier',
      items: [{ productId: ctx.productId, orderQty: 5, rate: 4 }],
    });
    const po = unwrap<{ id: string }>(poRes.body);
    await api.post(`/api/v1/purchase-orders/${po.id}/confirm`);

    const grRes = await api.post('/api/v1/goods-receipts').send({
      grDate: today,
      shopId: ctx.shopId,
      purchaseOrderId: po.id,
      supplierName: 'E2E Supplier',
      items: [{ productId: ctx.productId, quantity: 5, uom: 'PCS', purchaseRate: 4 }],
    });
    const gr = unwrap<{ id: string }>(grRes.body);
    await api.post(`/api/v1/goods-receipts/${gr.id}/post`);

    const giRes = await api.post('/api/v1/goods-issues').send({
      giDate: today,
      shopId: ctx.shopId,
      issueReason: 'E2E sale fulfillment',
      items: [{ productId: ctx.productId, quantity: 3, uom: 'PCS' }],
    });
    expect(giRes.status).toBe(201);
    const gi = unwrap<{ id: string }>(giRes.body);
    await api.post(`/api/v1/goods-issues/${gi.id}/post`).expect(201);
  });
});
