import type { INestApplication } from '@nestjs/common';
import { BillingCycle, RoleName, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../src/prisma/prisma.service';
import { authed, login, uniqueCode, unwrap, type AuthSession } from './e2e-http';

export type WorkflowContext = {
  token: string;
  user: AuthSession['user'];
  companyId: string;
  shopId: string;
  productId: string;
  supplierId: string;
  customerId: string;
  storageLocationId: string;
};

const WORKFLOW_OWNER_PASSWORD = 'E2eOwner@123';

/**
 * Creates an isolated master-data slice for one workflow test run:
 * company → plant (shop) → owner user → product → supplier → customer.
 *
 * The tenant workspace (company/shop/owner) is created directly through
 * Prisma, mirroring SignupService.createWorkspaceFromPending — companies
 * are only created during sign-up, so POST /companies intentionally
 * rejects. Business master data is then created through the real API.
 */
export async function seedWorkflowMasterData(app: INestApplication): Promise<WorkflowContext> {
  const prisma = app.get(PrismaService);
  const suffix = uniqueCode('E2E');

  const ownerRole = await prisma.role.findFirst({ where: { name: RoleName.OWNER } });
  if (!ownerRole) {
    throw new Error('OWNER role missing — run migrations/seed before e2e tests.');
  }

  const ownerEmail = `owner-${suffix.toLowerCase()}@e2e.local`;
  const passwordHash = await bcrypt.hash(WORKFLOW_OWNER_PASSWORD, 4);

  const { company, shop } = await prisma.$transaction(async (tx) => {
    // PLUS plan: workflow suites exercise gated features (RFQ, PO, sales,
    // invoices), all of which are blocked on TRIAL by planAllowsFeature().
    const company = await tx.company.create({
      data: {
        companyCode: `CO-${suffix}`,
        companyName: `E2E Company ${suffix}`,
        address: '1 Test Lane',
        isActive: true,
        subscriptionPlan: SubscriptionPlan.PLUS,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.YEARLY,
        subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    const shop = await tx.shop.create({
      data: {
        shopNumber: `PL-${suffix}`.slice(0, 20),
        shopName: `E2E Plant ${suffix}`,
        address: '2 Warehouse Road',
        contactPerson: 'Ops Lead',
        mobile: '+94771234567',
        email: `plant-${suffix.toLowerCase()}@e2e.local`,
        companyId: company.id,
        isActive: true,
      },
    });
    await tx.user.create({
      data: {
        name: `E2E Owner ${suffix}`,
        email: ownerEmail,
        passwordHash,
        roleId: ownerRole.id,
        shopId: shop.id,
        isActive: true,
      },
    });
    return { company, shop };
  });

  const { accessToken: token, user } = await login(app, ownerEmail, WORKFLOW_OWNER_PASSWORD);
  const api = authed(app, token);

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

  const locationRes = await api.post('/api/v1/storage-locations').send({
    shopId: shop.id,
    code: 'MAIN',
    name: 'Main Store',
  });
  expect(locationRes.status).toBe(201);
  const location = unwrap<{ id: string }>(locationRes.body);

  return {
    token,
    user,
    companyId: company.id,
    shopId: shop.id,
    productId: product.id,
    supplierId: supplier.id,
    customerId: customer.id,
    storageLocationId: location.id,
  };
}
