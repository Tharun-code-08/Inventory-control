import type { INestApplication } from '@nestjs/common';
import { createE2eApp, E2E_DB_ENABLED } from '../helpers/e2e-bootstrap';
import { authed, login, uniqueCode, unwrap } from '../helpers/e2e-http';
import { seedWorkflowMasterData } from '../helpers/workflow-fixture';

/**
 * Phase 1 — Master Data (sidebar: Companies, Plants, Products, Suppliers, Customers).
 * Validates foundation CRUD + validation gates before procurement/sales flows run.
 */
describe('Phase 1 — Master Data workflows (e2e)', () => {
  let app: INestApplication;
  jest.setTimeout(60_000);

  beforeAll(async () => {
    if (!E2E_DB_ENABLED) return;
    app = await createE2eApp();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('blocks duplicate org creation and updates the tenant company profile', async () => {
    if (!E2E_DB_ENABLED) return;
    const { accessToken: token } = await login(app);
    const api = authed(app, token);

    const blocked = await api.post('/api/v1/companies').send({
      companyCode: uniqueCode('COMP'),
      companyName: 'Workflow Test Co',
    });
    expect(blocked.status).toBe(400);

    const companies = unwrap<Array<{ id: string; companyName: string }>>(
      (await api.get('/api/v1/companies')).body,
    );
    expect(companies.length).toBeGreaterThan(0);
    const company = companies[0];
    const originalName = company.companyName;

    const updated = await api.patch(`/api/v1/companies/${company.id}`).send({
      companyName: 'Workflow Test Co (Updated)',
    });
    expect(updated.status).toBe(200);
    expect(unwrap<{ companyName: string }>(updated.body).companyName).toContain('Updated');

    await api.patch(`/api/v1/companies/${company.id}`).send({ companyName: originalName }).expect(200);

    const removed = await api.delete(`/api/v1/companies/${company.id}`);
    expect(removed.status).toBe(400);
  });

  it('rejects invalid company payloads', async () => {
    if (!E2E_DB_ENABLED) return;
    const { accessToken: token } = await login(app);
    await authed(app, token)
      .post('/api/v1/companies')
      .send({ companyName: 'X' })
      .expect((res) => expect([400, 422]).toContain(res.status));
  });

  it('links plants to companies and rejects invalid companyId', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);

    const linked = unwrap<{ id: string; companyId?: string | null }>(
      (await api.get(`/api/v1/shops/${ctx.shopId}`)).body,
    );
    expect(linked.companyId).toBe(ctx.companyId);

    await api
      .post('/api/v1/shops')
      .send({
        shopNumber: uniqueCode('BAD').slice(0, 20),
        shopName: 'Invalid Plant',
        address: 'Nowhere',
        contactPerson: 'Nobody',
        mobile: '+94770000001',
        email: 'bad@e2e.local',
        companyId: '00000000-0000-4000-8000-000000000000',
      })
      .expect((res) => expect([400, 404, 409, 422]).toContain(res.status));
  });

  it('enforces unique product SKU codes', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);
    const sku = uniqueCode('DUPSKU');

    const first = await api.post('/api/v1/products').send({
      productCode: sku,
      description: 'Duplicate probe A',
      uom: 'PCS',
      category: 'e2e',
      purchasePrice: 1,
      sellingPrice: 2,
      plants: [{ shopId: ctx.shopId, openingStock: 0, minStockLevel: 1 }],
    });
    expect(first.status).toBe(201);

    const second = await api.post('/api/v1/products').send({
      productCode: sku,
      description: 'Duplicate probe B',
      uom: 'PCS',
      category: 'e2e',
      purchasePrice: 1,
      sellingPrice: 2,
      plants: [{ shopId: ctx.shopId, openingStock: 0, minStockLevel: 1 }],
    });
    expect([400, 409, 422]).toContain(second.status);
  });

  it('onboards supplier and customer with contact validation', async () => {
    if (!E2E_DB_ENABLED) return;
    const ctx = await seedWorkflowMasterData(app);
    const api = authed(app, ctx.token);

    const supplier = unwrap<{ id: string }>(
      (await api.get(`/api/v1/suppliers/${ctx.supplierId}`)).body,
    );
    expect(supplier.id).toBe(ctx.supplierId);

    await api
      .post('/api/v1/customers')
      .send({ customerName: 'No Email Customer', email: 'not-an-email' })
      .expect((res) => expect([400, 422]).toContain(res.status));
  });
});
