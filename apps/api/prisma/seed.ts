/* eslint-disable no-console */
import { PrismaClient, RoleName, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Idempotent seed used for local development AND fresh production bootstraps.
 * Creates system roles, a default shop, and an owner user.
 */
const ALL_PERMISSIONS = [
  'user:manage',
  'shop:read',
  'shop:write',
  'company:read',
  'company:write',
  'contract:read',
  'contract:write',
  'product:read',
  'product:write',
  'storage_location:read',
  'storage_location:write',
  'supplier:read',
  'supplier:write',
  'rfq:read',
  'rfq:write',
  'quote:read',
  'quote:write',
  'purchase_order:read',
  'purchase_order:create',
  'purchase_order:approve',
  'goods_receipt:read',
  'goods_receipt:create',
  'goods_issue:read',
  'goods_issue:create',
  'stock_transfer:read',
  'stock_transfer:create',
  'damage:read',
  'damage:create',
  'report:view',
  'report:export',
  'audit_log:read',
  'api:manage',
  'billing:manage',
  'vendor_portal:access',
];

const OWNER_PERMISSIONS = [...ALL_PERMISSIONS];

const ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter((p) => p !== 'billing:manage');

const INVENTORY_MANAGER_PERMISSIONS = ALL_PERMISSIONS.filter(
  (p) =>
    p !== 'user:manage' &&
    p !== 'billing:manage' &&
    p !== 'purchase_order:approve' &&
    p !== 'audit_log:read' &&
    p !== 'api:manage',
);

const WAREHOUSE_STAFF_PERMISSIONS = [
  'shop:read',
  'company:read',
  'contract:read',
  'product:read',
  'storage_location:read',
  'supplier:read',
  'rfq:read',
  'quote:read',
  'purchase_order:read',
  'goods_receipt:read',
  'goods_receipt:create',
  'goods_issue:read',
  'goods_issue:create',
  'stock_transfer:read',
  'stock_transfer:create',
  'damage:read',
  'damage:create',
  'report:view',
];

const VIEWER_PERMISSIONS = [
  'shop:read',
  'company:read',
  'contract:read',
  'product:read',
  'storage_location:read',
  'supplier:read',
  'rfq:read',
  'quote:read',
  'purchase_order:read',
  'goods_receipt:read',
  'goods_issue:read',
  'stock_transfer:read',
  'damage:read',
  'report:view',
];

const VENDOR_PERMISSIONS = ['vendor_portal:access'];

const PURCHASE_MANAGER_PERMISSIONS = [
  'shop:read',
  'company:read',
  'product:read',
  'supplier:read',
  'supplier:write',
  'rfq:read',
  'rfq:write',
  'contract:read',
  'contract:write',
  'purchase_order:read',
  'purchase_order:create',
  'purchase_order:approve',
  'goods_receipt:read',
  'report:view',
  'report:export',
];

const SALES_PERMISSIONS = [
  'shop:read',
  'company:read',
  'product:read',
  'quote:read',
  'quote:write',
  'goods_issue:read',
  'goods_issue:create',
  'report:view',
];

const EMPLOYEE_PERMISSIONS = ['shop:read', 'company:read', 'product:read'];

const ROLE_DEFINITIONS: Array<{ name: RoleName; permissions: string[] }> = [
  { name: RoleName.OWNER, permissions: OWNER_PERMISSIONS },
  { name: RoleName.ADMIN, permissions: ADMIN_PERMISSIONS },
  { name: RoleName.INVENTORY_MANAGER, permissions: INVENTORY_MANAGER_PERMISSIONS },
  { name: RoleName.PURCHASE_MANAGER, permissions: PURCHASE_MANAGER_PERMISSIONS },
  { name: RoleName.SALES, permissions: SALES_PERMISSIONS },
  { name: RoleName.EMPLOYEE, permissions: EMPLOYEE_PERMISSIONS },
  { name: RoleName.WAREHOUSE_STAFF, permissions: WAREHOUSE_STAFF_PERMISSIONS },
  { name: RoleName.VIEWER, permissions: VIEWER_PERMISSIONS },
  { name: RoleName.VENDOR, permissions: VENDOR_PERMISSIONS },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_SEED !== 'true') {
      console.warn('[seed] Skipping production seed: set ALLOW_PROD_SEED=true to override.');
      return;
    }

    for (const role of ROLE_DEFINITIONS) {
      await prisma.role.upsert({
        where: { name: role.name },
        update: { permissions: role.permissions },
        create: { name: role.name, permissions: role.permissions },
      });
    }
    console.log('[seed] Roles upserted');

    const e2eSubscription =
      process.env.NODE_ENV === 'test' || process.env.CI === 'true'
        ? {
            subscriptionPlan: SubscriptionPlan.PRO,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            trialEndsAt: new Date('2099-12-31T23:59:59.999Z'),
            subscriptionEndsAt: new Date('2099-12-31T23:59:59.999Z'),
          }
        : {};

    const defaultCompany = await prisma.company.upsert({
      where: { companyCode: 'HQ-CO' },
      update: { isActive: true, ...e2eSubscription },
      create: {
        companyCode: 'HQ-CO',
        companyName: 'SoftdigitIMS HQ',
        address: '1 Main Street',
        isActive: true,
        ...e2eSubscription,
      },
    });
    console.log(`[seed] Default company: ${defaultCompany.companyCode}`);

    const defaultShop = await prisma.shop.upsert({
      where: { shopNumber: 'HQ-001' },
      update: { companyId: defaultCompany.id },
      create: {
        shopNumber: 'HQ-001',
        shopName: 'Headquarters',
        address: '1 Main Street',
        contactPerson: 'System Admin',
        mobile: '+0000000000',
        email: 'hq@retailims.local',
        companyId: defaultCompany.id,
      },
    });
    console.log(`[seed] Default shop: ${defaultShop.shopNumber}`);

    await prisma.storageLocation.upsert({
      where: { shopId_code: { shopId: defaultShop.id, code: 'MAIN' } },
      update: { isActive: true, name: 'Main storage' },
      create: {
        shopId: defaultShop.id,
        code: 'MAIN',
        name: 'Main storage',
        description: 'Default receiving location for workflow tests',
        isActive: true,
      },
    });
    console.log('[seed] Default storage location: MAIN');

    const ownerRole = await prisma.role.findFirstOrThrow({ where: { name: RoleName.OWNER } });

    const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@retailims.com').toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'Owner',
        passwordHash,
        roleId: ownerRole.id,
        shopId: defaultShop.id,
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
        refreshTokenHash: null,
      },
      create: {
        name: 'Owner',
        email: adminEmail,
        passwordHash,
        roleId: ownerRole.id,
        shopId: defaultShop.id,
        isActive: true,
      },
    });
    console.log(`[seed] Owner user ready: ${adminEmail}`);
    console.log('[seed] Done');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
