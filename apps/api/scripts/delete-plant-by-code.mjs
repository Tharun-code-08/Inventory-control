#!/usr/bin/env node
/**
 * Hard-delete a plant by shop_number (e.g. HQ-002) when it blocks reuse of the code.
 *
 * Usage (on the API server):
 *   node scripts/delete-plant-by-code.mjs HQ-002
 */
import { PrismaClient } from '@prisma/client';

const code = process.argv[2]?.trim().toUpperCase().replace(/\s+/g, '');
if (!code) {
  console.error('Usage: node scripts/delete-plant-by-code.mjs <PLANT_CODE>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function purgeStorageLocations(shopId) {
  const locations = await prisma.storageLocation.findMany({
    where: { shopId },
    select: { id: true, code: true },
  });
  for (const location of locations) {
    const [productPlants, receiptItems, transfersFrom, transfersTo] = await Promise.all([
      prisma.productPlant.count({ where: { storageLocationId: location.id } }),
      prisma.goodsReceiptItem.count({ where: { storageLocationId: location.id } }),
      prisma.stockTransferHeader.count({ where: { fromStorageLocationId: location.id } }),
      prisma.stockTransferHeader.count({ where: { toStorageLocationId: location.id } }),
    ]);
    if (productPlants + receiptItems + transfersFrom + transfersTo > 0) {
      throw new Error(
        `Storage location ${location.code} still has stock or transaction history — delete manually first.`,
      );
    }
    await prisma.storageLocation.delete({ where: { id: location.id } });
    console.log(`[delete-plant] Removed storage location ${location.code}`);
  }
}

async function main() {
  const shop = await prisma.shop.findUnique({
    where: { shopNumber: code },
    select: { id: true, shopNumber: true, shopName: true, companyId: true },
  });
  if (!shop) {
    console.log(`[delete-plant] No plant found with code ${code}`);
    return;
  }

  console.log(`[delete-plant] Found ${shop.shopNumber} (${shop.shopName}) id=${shop.id}`);
  await purgeStorageLocations(shop.id);
  await prisma.shop.delete({ where: { id: shop.id } });
  console.log(`[delete-plant] Deleted plant ${shop.shopNumber}`);
}

main()
  .catch((err) => {
    console.error('[delete-plant] Failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
