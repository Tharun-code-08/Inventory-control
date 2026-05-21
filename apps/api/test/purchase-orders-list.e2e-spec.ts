import type { INestApplication } from '@nestjs/common';
import { createE2eApp, E2E_DB_ENABLED } from './helpers/e2e-bootstrap';
import { authed, tomorrowDateString, unwrap } from './helpers/e2e-http';
import { seedWorkflowMasterData } from './helpers/workflow-fixture';

type PoShape = {
  id: string;
  supplier: string;
  status: string;
  lifecycleStatus?: string;
  totalValue?: number;
  items: Array<{ orderQty: number; rate: number }>;
};

describe('Purchase orders listing & filters (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(60_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await createE2eApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('returns paginated results with search/status filters and numeric fields', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const poDate = tomorrowDateString();

    // Confirmed PO
    const confirmedRes = await api.post('/api/v1/purchase-orders').send({
      poDate,
      shopId: ctx.shopId,
      supplier: 'List Supplier A',
      items: [{ productId: ctx.productId, orderQty: 4, rate: 12 }],
    });
    const confirmedPo = unwrap<{ id: string }>(confirmedRes.body);
    await api.post(`/api/v1/purchase-orders/${confirmedPo.id}/confirm`).expect(201);

    // Draft PO
    await api.post('/api/v1/purchase-orders').send({
      poDate,
      shopId: ctx.shopId,
      supplier: 'List Supplier B',
      items: [{ productId: ctx.productId, orderQty: 2, rate: 10 }],
    });

    const listRes = await api
      .get('/api/v1/purchase-orders')
      .query({ shop_id: ctx.shopId, page: 1, limit: 1 });
    expect(listRes.status).toBe(200);
    const listMeta = listRes.body.meta as { total?: number; page?: number; limit?: number; totalPages?: number };
    expect(listMeta.total).toBeGreaterThanOrEqual(2);
    expect(listMeta.page).toBe(1);
    expect(listMeta.limit).toBe(1);
    expect((listMeta.totalPages ?? 1) >= 2).toBe(true);

    const filteredRes = await api
      .get('/api/v1/purchase-orders')
      .query({ shop_id: ctx.shopId, status: 'CONFIRMED', search: 'Supplier A' });
    expect(filteredRes.status).toBe(200);
    const filtered = unwrap<PoShape[]>(filteredRes.body);
    expect(filtered.length).toBe(1);
    expect(filtered[0].status).toBe('CONFIRMED');
    expect(filtered[0].lifecycleStatus).toBeDefined();
    expect(typeof filtered[0].totalValue).toBe('number');
    expect(typeof filtered[0].items[0]?.orderQty).toBe('number');
    expect(typeof filtered[0].items[0]?.rate).toBe('number');
  });
});
