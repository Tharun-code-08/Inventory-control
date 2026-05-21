/* eslint-disable no-console */
import { PrismaClient, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Idempotent seed used for local development AND fresh production bootstraps.
 * Creates the three baseline roles, a default shop, and an admin user.
 *
 * Production safety: refuses to run if `NODE_ENV=production` AND
 * `ALLOW_PROD_SEED` is not explicitly set, so accidentally running
 * `prisma migrate deploy --seed` against prod won't reset credentials.
 */
// Master list of every permission referenced by `@RequirePermission(...)` in
// the API controllers. Keep this in sync with the controllers — any string a
// controller checks for must exist here, or the corresponding endpoint is
// unreachable for every role (the PermissionsGuard rejects with
// "Missing permission").
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
  'goods_receipt:read',
  'goods_receipt:create',
  'goods_issue:read',
  'goods_issue:create',
  'damage:read',
  'damage:create',
  'report:view',
  'report:export',
];

const ADMIN_ROLE_PERMISSIONS = [...ALL_PERMISSIONS];

// Inventory managers do everything an admin does *except* manage user
// accounts (creating/disabling users, role changes).
const INVENTORY_MANAGER_PERMISSIONS = ALL_PERMISSIONS.filter((p) => p !== 'user:manage');

// Shop users can read everything in their scope and perform day-to-day
// floor operations (receive/issue goods, log damaged stock) but can't edit
// master data (products, suppliers, plants, contracts, etc.).
const SHOP_USER_PERMISSIONS = [
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
  'damage:read',
  'damage:create',
  'report:view',
];

const ROLE_DEFINITIONS: Array<{ name: RoleName; permissions: string[] }> = [
  { name: RoleName.ADMIN, permissions: ADMIN_ROLE_PERMISSIONS },
  { name: RoleName.INVENTORY_MANAGER, permissions: INVENTORY_MANAGER_PERMISSIONS },
  { name: RoleName.SHOP_USER, permissions: SHOP_USER_PERMISSIONS },
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

    const defaultShop = await prisma.shop.upsert({
      where: { shopNumber: 'HQ-001' },
      update: {},
      create: {
        shopNumber: 'HQ-001',
        shopName: 'Headquarters',
        address: '1 Main Street',
        contactPerson: 'System Admin',
        mobile: '+0000000000',
        email: 'hq@retailims.local',
      },
    });
    console.log(`[seed] Default shop: ${defaultShop.shopNumber}`);

    const adminRole = await prisma.role.findFirstOrThrow({ where: { name: RoleName.ADMIN } });

    const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? 'admin@retailims.com').toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'Administrator',
        passwordHash,
        roleId: adminRole.id,
        shopId: defaultShop.id,
        isActive: true,
        failedLoginCount: 0,
        lockedUntil: null,
        refreshTokenHash: null,
      },
      create: {
        name: 'Administrator',
        email: adminEmail,
        passwordHash,
        roleId: adminRole.id,
        shopId: defaultShop.id,
        isActive: true,
      },
    });
    console.log(`[seed] Admin user ready: ${adminEmail}`);
    console.log('[seed] Done');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
