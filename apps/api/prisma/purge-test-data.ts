/* eslint-disable no-console */
import { PrismaClient, RoleName } from '@prisma/client';

/** Only the seed default plant is kept; all E2E / demo plants are removed. */
const KEEP_SHOP_NUMBERS = ['HQ-001'];
const KEEP_ADMIN_EMAILS = ['admin@retailims.com'];

/**
 * Removes all business / demo / e2e data from the database.
 * Keeps roles, the default HQ shop shell, and configured admin user(s).
 */
async function purgeBusinessData(prisma: PrismaClient) {
  await prisma.creditNote.deleteMany();
  await prisma.customerReturnItem.deleteMany();
  await prisma.customerReturn.deleteMany();
  await prisma.supplierReturnItem.deleteMany();
  await prisma.supplierReturn.deleteMany();
  await prisma.paymentReceipt.deleteMany();
  await prisma.invoiceHeader.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrderHeader.deleteMany();
  await prisma.goodsReceiptItem.deleteMany();
  await prisma.goodsReceiptHeader.deleteMany();
  await prisma.goodsIssueItem.deleteMany();
  await prisma.goodsIssueHeader.deleteMany();
  await prisma.damagedStock.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrderHeader.deleteMany();
  await prisma.contractItem.deleteMany();
  await prisma.contractHeader.deleteMany();
  await prisma.supplierQuotationItem.deleteMany();
  await prisma.supplierQuotationHeader.deleteMany();
  await prisma.rfqItem.deleteMany();
  await prisma.rfqSupplier.deleteMany();
  await prisma.rfqHeader.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.stockSummary.deleteMany();
  await prisma.costLayer.deleteMany();
  await prisma.productSpecification.deleteMany();
  await prisma.productPlant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.storageLocation.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.alertEvent.deleteMany();
  await prisma.documentSequence.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.jobFailure.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.fxRate.deleteMany();
  await prisma.company.deleteMany();

  const keepShops = await prisma.shop.findMany({
    where: { shopNumber: { in: KEEP_SHOP_NUMBERS } },
    select: { id: true, shopNumber: true },
  });
  const keepShopIds = keepShops.map((s) => s.id);

  if (keepShopIds.length > 0) {
    await prisma.shop.deleteMany({ where: { id: { notIn: keepShopIds } } });
    // Admins see all plants — do not tie them to HQ after purge.
    await prisma.user.updateMany({
      where: { role: { name: { in: [RoleName.ADMIN, RoleName.INVENTORY_MANAGER] } } },
      data: { shopId: null },
    });
    // Remaining shop users must point at a surviving plant.
    await prisma.user.updateMany({
      where: {
        role: { name: RoleName.SHOP_USER },
        OR: [{ shopId: null }, { shopId: { notIn: keepShopIds } }],
      },
      data: { shopId: keepShopIds[0] },
    });
  } else {
    await prisma.shop.deleteMany();
  }

  const adminEmails = (
    process.env.SEED_ADMIN_EMAIL ? [process.env.SEED_ADMIN_EMAIL] : KEEP_ADMIN_EMAILS
  ).map((e) => e.toLowerCase());

  const removedUsers = await prisma.user.deleteMany({
    where: {
      email: { notIn: adminEmails },
    },
  });

  await prisma.session.deleteMany({
    where: {
      user: { email: { notIn: adminEmails } },
    },
  });

  console.log(`[purge] Removed ${removedUsers.count} demo/seed user(s) (shop1, shop2, inventory@, etc.)`);
  console.log(`[purge] Kept plant(s): ${keepShops.map((s) => s.shopNumber).join(', ') || '(none)'}`);
  console.log(`[purge] Kept admin login(s): ${adminEmails.join(', ')}`);
  console.log('[purge] All products, suppliers, E2E data, and transaction history cleared');
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DB_PURGE !== 'true') {
      console.error('[purge] Refusing production purge. Set ALLOW_DB_PURGE=true to override.');
      process.exit(1);
    }
    await purgeBusinessData(prisma);
    console.log('[purge] Done');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[purge] Failed:', err);
  process.exit(1);
});
