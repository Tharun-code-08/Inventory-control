import type { INestApplication } from '@nestjs/common';
import { E2E_DB_ENABLED, getSharedE2eApp } from '../helpers/e2e-bootstrap';
import { authed, grLineItem, todayDateString, unwrap } from '../helpers/e2e-http';
import { seedWorkflowMasterData } from '../helpers/workflow-fixture';

/**
 * Phase 9 — Real business scenarios (production-readiness simulations).
 */
describe('Phase 9 — Business scenario simulations (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(120_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await getSharedE2eApp();
  });

  it('Scenario 1: supplier partial delivery — two GRNs complete the PO', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const today = todayDateString();

    const poRes = await api.post('/api/v1/purchase-orders').send({
      poDate: today,
      shopId: ctx.shopId,
      supplier: 'Partial Delivery Inc',
      items: [{ productId: ctx.productId, orderQty: 100, rate: 2 }],
    });
    if (poRes.status !== 201) console.error('PO 400:', JSON.stringify(poRes.body));
    expect(poRes.status).toBe(201);
    const po = unwrap<{ id: string }>(poRes.body);
    await api.post(`/api/v1/purchase-orders/${po.id}/confirm`).expect(201);

    for (const qty of [40, 60]) {
      const gr = unwrap<{ id: string }>(
        (
          await api.post('/api/v1/goods-receipts').send({
            grDate: today,
            shopId: ctx.shopId,
            purchaseOrderId: po.id,
            supplierName: 'Partial Delivery Inc',
            items: [
              grLineItem({
                productId: ctx.productId,
                storageLocationId: ctx.storageLocationId,
                quantity: qty,
                purchaseRate: 2,
              }),
            ],
          })
        ).body,
      );
      await api.post(`/api/v1/goods-receipts/${gr.id}/post`);
    }

    const poState = unwrap<{ lifecycleStatus: string }>(
      (await api.get(`/api/v1/purchase-orders/${po.id}`)).body,
    );
    expect(poState.lifecycleStatus).toBe('FULLY_RECEIVED');

    const report = unwrap<Array<{ product_id: string; current_stock: string | number }>>(
      (await api.get('/api/v1/reports/inventory').query({ shop_id: ctx.shopId })).body,
    );
    const row = report.find((r) => r.product_id === ctx.productId);
    expect(Number(row?.current_stock ?? 0)).toBe(100);
  });

  it('Scenario 2: customer sale blocked without stock (oversell guard)', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const today = todayDateString();

    await api.post('/api/v1/sales-orders').send({
      shopId: ctx.shopId,
      orderDate: today,
      customerId: ctx.customerId,
      items: [{ productId: ctx.productId, quantity: 1, unitPrice: 10 }],
    });

    await api
      .post('/api/v1/goods-issues')
      .send({
        giDate: today,
        shopId: ctx.shopId,
        issueReason: 'Attempt oversell',
        items: [{ productId: ctx.productId, quantity: 50, uom: 'PCS' }],
      })
      .expect((res) => expect([400, 409, 422]).toContain(res.status));
  });
});
