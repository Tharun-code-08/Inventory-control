import type { INestApplication } from '@nestjs/common';
import { authed, login, uniqueCode, unwrap, type AuthSession } from './e2e-http';

export type WorkflowContext = {
  token: string;
  user: AuthSession['user'];
  companyId: string;
  shopId: string;
  productId: string;
  supplierId: string;
  customerId: string;
};

/** Tenant company from seed/sign-up (POST /companies is signup-only). */
export async function resolveWorkflowCompanyId(
  app: INestApplication,
  token: string,
): Promise<string> {
  const list = unwrap<Array<{ id: string }>>(
    (await authed(app, token).get('/api/v1/companies')).body,
  );
  if (list.length === 0) {
    throw new Error(
      'No tenant company found. Run prisma db seed so HQ-CO and HQ-001 are linked.',
    );
  }
  return list[0].id;
}

/** Reuse the seeded HQ plant — trial plan allows only one warehouse per company. */
export async function resolveWorkflowShopId(
  app: INestApplication,
  token: string,
): Promise<string> {
  const shops = unwrap<Array<{ id: string; shopNumber: string }>>(
    (await authed(app, token).get('/api/v1/shops')).body,
  );
  if (shops.length === 0) {
    throw new Error('No plant found. Run prisma db seed so HQ-001 exists.');
  }
  const hq = shops.find((s) => s.shopNumber === 'HQ-001');
  return (hq ?? shops[0]).id;
}

/**
 * Creates an isolated master-data slice for one workflow test run:
 * tenant company → HQ plant → product → supplier → customer.
 */
export async function seedWorkflowMasterData(app: INestApplication): Promise<WorkflowContext> {
  const { accessToken: token, user } = await login(app);
  const api = authed(app, token);
  const suffix = uniqueCode('E2E');
  const companyId = await resolveWorkflowCompanyId(app, token);
  const shopId = await resolveWorkflowShopId(app, token);

  const productRes = await api.post('/api/v1/products').send({
    productCode: `SKU-${suffix}`.slice(0, 40),
    description: `E2E Widget ${suffix}`,
    uom: 'PCS',
    category: 'e2e',
    purchasePrice: 10,
    sellingPrice: 19.99,
    plants: [{ shopId, openingStock: 0, minStockLevel: 5 }],
  });
  expect(productRes.status).toBe(201);
  const product = unwrap<{ id: string }>(productRes.body);

  const supplierRes = await api.post('/api/v1/suppliers').send({
    supplierCode: `SUP-${suffix}`.slice(0, 30),
    supplierName: `E2E Supplier ${suffix}`,
    email: `supplier-${suffix.toLowerCase()}@e2e.local`,
    phone: '+94771234568',
    companyId,
  });
  expect(supplierRes.status).toBe(201);
  const supplier = unwrap<{ id: string }>(supplierRes.body);

  const customerRes = await api.post('/api/v1/customers').send({
    customerCode: `CUS-${suffix}`.slice(0, 30),
    customerName: `E2E Customer ${suffix}`,
    email: `customer-${suffix.toLowerCase()}@e2e.local`,
    phone: '+94771234569',
    shopId,
  });
  expect(customerRes.status).toBe(201);
  const customer = unwrap<{ id: string }>(customerRes.body);

  return {
    token,
    user,
    companyId,
    shopId,
    productId: product.id,
    supplierId: supplier.id,
    customerId: customer.id,
  };
}
