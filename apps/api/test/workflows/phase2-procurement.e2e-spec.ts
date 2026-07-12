import type { INestApplication } from '@nestjs/common';
import { createE2eApp, E2E_DB_ENABLED } from '../helpers/e2e-bootstrap';
import { authed, todayDateString, unwrap } from '../helpers/e2e-http';
import { seedWorkflowMasterData } from '../helpers/workflow-fixture';

/**
 * Phase 2 — Procurement: RFQ → Quotation → Contract → PO → GR.
 * Stock must not move until GR is posted; PO enforces partial receipt caps.
 */
describe('Phase 2 — Procurement workflows (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(90_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await createE2eApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('runs RFQ → quotation → accept-auto-link (contract + confirmed PO + GR draft)', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const today = todayDateString();

    const rfqRes = await api.post('/api/v1/rfqs').send({
      shopId: ctx.shopId,
      rfqDate: today,
      title: 'E2E procurement RFQ',
      suppliers: [ctx.supplierId],
      items: [{ productId: ctx.productId, quantity: 10, uom: 'PCS' }],
    });
    expect(rfqRes.status).toBe(201);
    const rfq = unwrap<{ id: string; items: Array<{ id: string }> }>(rfqRes.body);

    // RFQ must be sent (POSTED) before quotations can be accepted into POs.
    const sentRes = await api.post(`/api/v1/rfqs/${rfq.id}/send`);
    expect([200, 201]).toContain(sentRes.status);

    const quoteRes = await api.post('/api/v1/quotations').send({
      rfqId: rfq.id,
      supplierId: ctx.supplierId,
      items: [
        {
          rfqItemId: rfq.items[0]?.id,
          productId: ctx.productId,
          quantity: 10,
          uom: 'PCS',
          unitPrice: 10,
        },
      ],
    });
    expect(quoteRes.status).toBe(201);
    const quoteId = unwrap<{ id: string }>(quoteRes.body).id;

    await api
      .post('/api/v1/quotations')
      .send({ rfqId: '00000000-0000-4000-8000-000000000000', supplierId: ctx.supplierId, items: [{ quantity: 1, unitPrice: 1 }] })
      .expect((res) => expect([400, 404, 422]).toContain(res.status));

    const linked = await api.post(`/api/v1/quotations/${quoteId}/accept-auto-link`);
    expect([200, 201]).toContain(linked.status);
    const bundle = unwrap<{
      contract: { id: string };
      purchaseOrder: { id: string; status: string };
      goodsReceiptDraft: { id: string; status: string };
    }>(linked.body);

    expect(bundle.contract.id).toBeTruthy();
    expect(bundle.purchaseOrder.status).toBe('CONFIRMED');
    expect(bundle.goodsReceiptDraft.status).toBe('DRAFT');

    const invBefore = await inventoryQty(api, ctx.shopId, ctx.productId);
    expect(Number(invBefore)).toBe(0);
  });

  it('posts partial GR then remainder without over-receiving', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const today = todayDateString();
    const poDate = todayDateString();

    const poRes = await api.post('/api/v1/purchase-orders').send({
      poDate,
      shopId: ctx.shopId,
      supplier: 'E2E Supplier',
      items: [{ productId: ctx.productId, orderQty: 10, rate: 5 }],
    });
    if (poRes.status !== 201) console.error('PO creation failed:', JSON.stringify(poRes.body));
    expect(poRes.status).toBe(201);
    const po = unwrap<{ id: string }>(poRes.body);

    const confirmed = await api.post(`/api/v1/purchase-orders/${po.id}/confirm`);
    expect(confirmed.status).toBe(201);

    const gr1Res = await api.post('/api/v1/goods-receipts').send({
      grDate: today,
      shopId: ctx.shopId,
      purchaseOrderId: po.id,
      supplierName: 'E2E Supplier',
      items: [{ productId: ctx.productId, storageLocationId: ctx.storageLocationId, quantity: 4, uom: 'PCS', purchaseRate: 5 }],
    });
    expect(gr1Res.status).toBe(201);
    const gr1 = unwrap<{ id: string }>(gr1Res.body);
    await api.post(`/api/v1/goods-receipts/${gr1.id}/post`).expect(201);

    let qty = Number(await inventoryQty(api, ctx.shopId, ctx.productId));
    expect(qty).toBe(4);

    const gr2Res = await api.post('/api/v1/goods-receipts').send({
      grDate: today,
      shopId: ctx.shopId,
      purchaseOrderId: po.id,
      supplierName: 'E2E Supplier',
      items: [{ productId: ctx.productId, storageLocationId: ctx.storageLocationId, quantity: 6, uom: 'PCS', purchaseRate: 5 }],
    });
    expect(gr2Res.status).toBe(201);
    const gr2 = unwrap<{ id: string }>(gr2Res.body);
    await api.post(`/api/v1/goods-receipts/${gr2.id}/post`).expect(201);

    qty = Number(await inventoryQty(api, ctx.shopId, ctx.productId));
    expect(qty).toBe(10);

    const poDetail = unwrap<{ lifecycleStatus: string }>(
      (await api.get(`/api/v1/purchase-orders/${po.id}`)).body,
    );
    expect(poDetail.lifecycleStatus).toBe('FULLY_RECEIVED');

    await api
      .post('/api/v1/goods-receipts')
      .send({
        grDate: today,
        shopId: ctx.shopId,
        purchaseOrderId: po.id,
        supplierName: 'E2E Supplier',
        items: [{ productId: ctx.productId, storageLocationId: ctx.storageLocationId, quantity: 1, uom: 'PCS', purchaseRate: 5 }],
      })
      .expect((res) => expect([400, 422]).toContain(res.status));
  });
});

async function inventoryQty(
  api: ReturnType<typeof authed>,
  shopId: string,
  productId: string,
): Promise<string> {
  const report = unwrap<Array<{ product_id: string; current_stock: string | number }>>(
    (await api.get('/api/v1/reports/inventory').query({ shop_id: shopId })).body,
  );
  const row = report.find((r) => r.product_id === productId);
  return String(row?.current_stock ?? 0);
}
