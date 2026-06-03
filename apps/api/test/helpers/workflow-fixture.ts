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

/**
 * Creates an isolated master-data slice for one workflow test run:
 * tenant company → plant (shop) → product → supplier → customer.
 */
export async function seedWorkflowMasterData(app: INestApplication): Promise<WorkflowContext> {
  const { accessToken: token, user } = await login(app);
  const api = authed(app, token);
  const suffix = uniqueCode('E2E');
  const companyId = await resolveWorkflowCompanyId(app, token);

  const shopRes = await api.post('/api/v1/shops').send({
    shopNumber: `PL-${suffix}`.slice(0, 20),
    shopName: `E2E Plant ${suffix}`,
    address: '2 Warehouse Road',
    contactPerson: 'Ops Lead',
    mobile: '+94771234567',
    email: `plant-${suffix.toLowerCase()}@e2e.local`,
    companyId,
  });
  expect(shopRes.status).toBe(201);
  const shop = unwrap<{ id: string }>(shopRes.body);

  const productRes = await api.post('/api/v1/products').send({
    productCode: `SKU-${suffix}`.slice(0, 40),
    description: `E2E Widget ${suffix}`,
    uom: 'PCS',
    category: 'e2e',
    purchasePrice: 10,
    sellingPrice: 19.99,
    plants: [{ shopId: shop.id, openingStock: 0, minStockLevel: 5 }],
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
    shopId: shop.id,
  });
  expect(customerRes.status).toBe(201);
  const customer = unwrap<{ id: string }>(customerRes.body);

  return {
    token,
    user,
    companyId,
    shopId: shop.id,
    productId: product.id,
    supplierId: supplier.id,
    customerId: customer.id,
  };
}
