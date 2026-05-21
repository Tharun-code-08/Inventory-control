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

/**
 * Creates an isolated master-data slice for one workflow test run:
 * company → plant (shop) → product → supplier → customer.
 */
export async function seedWorkflowMasterData(app: INestApplication): Promise<WorkflowContext> {
  const { accessToken: token, user } = await login(app);
  const api = authed(app, token);
  const suffix = uniqueCode('E2E');

  const companyRes = await api.post('/api/v1/companies').send({
    companyCode: `CO-${suffix}`,
    companyName: `E2E Company ${suffix}`,
    address: '1 Test Lane',
  });
  expect(companyRes.status).toBe(201);
  const company = unwrap<{ id: string }>(companyRes.body);

  const shopRes = await api.post('/api/v1/shops').send({
    shopNumber: `PL-${suffix}`.slice(0, 20),
    shopName: `E2E Plant ${suffix}`,
    address: '2 Warehouse Road',
    contactPerson: 'Ops Lead',
    mobile: '+94771234567',
    email: `plant-${suffix.toLowerCase()}@e2e.local`,
    companyId: company.id,
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
    companyId: company.id,
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
    companyId: company.id,
    shopId: shop.id,
    productId: product.id,
    supplierId: supplier.id,
    customerId: customer.id,
  };
}
