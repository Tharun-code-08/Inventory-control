import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface AllocationResult {
  lotId: string;
  lotNumber: string;
  expiryDate: Date | null;
  quantity: Decimal;
}

@Injectable()
export class InventoryLotService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or increment a lot from a goods receipt line
   */
  async createFromGoodsReceipt(
    tx: Prisma.TransactionClient,
    args: {
      grItem: {
        id: string;
        batchNumber?: string;
        expiryDate?: Date;
      };
      shopId: string;
      companyId: string;
      productId: string;
      grNumber: string;
      lineNo: number;
      quantity: Decimal;
      purchaseRate: Decimal;
      storageLocationId?: string;
    },
  ): Promise<any> {
    const lotNumber = args.grItem.batchNumber ?? `${args.grNumber}-${args.lineNo}`;

    return tx.inventoryLot.upsert({
      where: {
        shopId_productId_lotNumber: {
          shopId: args.shopId,
          productId: args.productId,
          lotNumber,
        },
      },
      create: {
        companyId: args.companyId,
        shopId: args.shopId,
        productId: args.productId,
        lotNumber,
        expiryDate: args.grItem.expiryDate,
        qtyReceived: args.quantity,
        qtyOnHand: args.quantity,
        unitCost: args.purchaseRate,
        storageLocationId: args.storageLocationId,
        grItemId: args.grItem.id,
        status: 'ACTIVE',
      },
      update: {
        qtyReceived: { increment: args.quantity },
        qtyOnHand: { increment: args.quantity },
      },
    });
  }

  /**
   * Allocate lots using FEFO (First Expiry, First Out) logic
   * Returns lots sorted by expiry date, earliest first
   * Throws if insufficient usable stock (excludes expired/blocked)
   */
  async allocateFefo(
    tx: Prisma.TransactionClient,
    shopId: string,
    productId: string,
    quantity: Decimal,
    asOf: Date,
  ): Promise<AllocationResult[]> {
    const decimalQty = new Decimal(quantity);

    // Raw SQL to get lots with FOR UPDATE locks
    const lots = await tx.$queryRaw<
      Array<{
        id: string;
        lot_number: string;
        expiry_date: Date | null;
        qty_on_hand: string; // Decimal as string
      }>
    >`
      SELECT id, lot_number, expiry_date, qty_on_hand
      FROM inventory_lots
      WHERE shop_id = ${shopId}
        AND product_id = ${productId}
        AND status = 'ACTIVE'
        AND qty_on_hand > 0
        AND (expiry_date IS NULL OR expiry_date >= ${asOf})
      ORDER BY expiry_date ASC NULLS LAST, created_at ASC
      FOR UPDATE
    `;

    if (lots.length === 0) {
      throw new BadRequestException(
        `No usable stock available for product (shop: ${shopId}, product: ${productId})`,
      );
    }

    const allocations: AllocationResult[] = [];
    let remaining = decimalQty;

    for (const lot of lots) {
      const available = new Decimal(lot.qty_on_hand);
      const toAllocate = remaining.lessThanOrEqualTo(available)
        ? remaining
        : available;

      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lot_number,
        expiryDate: lot.expiry_date,
        quantity: toAllocate,
      });

      remaining = remaining.minus(toAllocate);

      if (remaining.isZero()) break;
    }

    if (remaining.greaterThan(0)) {
      const usableQty = lots
        .reduce((sum, lot) => sum.plus(new Decimal(lot.qty_on_hand)), new Decimal(0))
        .toString();
      throw new BadRequestException(
        `Insufficient stock. Requested: ${quantity}, Available (usable): ${usableQty}`,
      );
    }

    return allocations;
  }

  /**
   * Consume (decrement) allocated lots
   * Uses race guard: updateMany with qtyOnHand check
   * Throws if any allocation fails (qty check failed)
   */
  async consumeAllocations(
    tx: Prisma.TransactionClient,
    allocations: Array<{ lotId: string; quantity: Decimal }>,
    opts?: { userId?: string },
  ): Promise<void> {
    for (const alloc of allocations) {
      const decimalQty = new Decimal(alloc.quantity);

      const result = await tx.inventoryLot.updateMany({
        where: {
          id: alloc.lotId,
          status: 'ACTIVE',
          qtyOnHand: { gte: decimalQty },
        },
        data: {
          qtyOnHand: { decrement: decimalQty },
          updatedById: opts?.userId,
          updatedAt: new Date(),
        },
      });

      if (result.count === 0) {
        throw new InternalServerErrorException(
          `Lot allocation race detected (lot: ${alloc.lotId}, qty: ${alloc.quantity})`,
        );
      }

      // Flip CONSUMED if qty reaches 0
      await tx.inventoryLot.updateMany({
        where: {
          id: alloc.lotId,
          qtyOnHand: 0,
          status: 'ACTIVE',
        },
        data: {
          status: 'CONSUMED',
        },
      });
    }
  }

  /**
   * Implements the existing consumeFifo call signature
   * Remains a no-op for products with expiryTracking === NONE and no lots
   * Returns allocations for caller to persist in GoodsIssueItemLot
   */
  async consumeFifo(
    tx: Prisma.TransactionClient,
    shopId: string,
    productId: string,
    quantity: Prisma.Decimal,
    opts?: { product?: { expiryTracking?: string }; userId?: string },
  ): Promise<AllocationResult[] | void> {
    // Check if product has expiryTracking configured
    const product = opts?.product
      ? opts.product
      : await tx.product.findUnique({ where: { id: productId } });

    if (!product || product.expiryTracking === 'NONE') {
      // Check if any lots exist for this product-shop
      const lotCount = await tx.inventoryLot.count({
        where: { shopId, productId },
      });
      if (lotCount === 0) {
        // No-op: legacy path
        return;
      }
    }

    // Allocate and consume
    const allocations = await this.allocateFefo(
      tx,
      shopId,
      productId,
      quantity,
      new Date(),
    );
    await this.consumeAllocations(tx, allocations, opts);
    return allocations;
  }

  /**
   * Receive transfer lots at destination shop
   * Upserts destination lot: exact (lotNumber, expiryDate) match increments,
   * mismatch creates new lot with suffixed lotNumber
   */
  async receiveTransferLots(
    tx: Prisma.TransactionClient,
    args: {
      transferId: string;
      toShopId: string;
      toCompanyId: string;
      items: Array<{
        lotId: string;
        quantity: Decimal;
      }>;
      userId?: string;
    },
  ): Promise<void> {
    for (const item of args.items) {
      const sourceLot = await tx.inventoryLot.findUniqueOrThrow({
        where: { id: item.lotId },
      });

      // Check for existing destination lot
      const destLot = await tx.inventoryLot.findFirst({
        where: {
          shopId: args.toShopId,
          productId: sourceLot.productId,
          lotNumber: sourceLot.lotNumber,
        },
      });

      if (destLot && destLot.expiryDate?.toISOString() !== sourceLot.expiryDate?.toISOString()) {
        // Expiry mismatch: create new lot with suffix
        let suffix = 1;
        let found = false;
        let newLotNumber: string;

        while (!found) {
          newLotNumber = `${sourceLot.lotNumber}-R${suffix}`;
          const existing = await tx.inventoryLot.findFirst({
            where: {
              shopId: args.toShopId,
              productId: sourceLot.productId,
              lotNumber: newLotNumber,
            },
          });
          if (!existing) {
            found = true;
          } else {
            suffix++;
          }
        }

        // Create new lot
        await tx.inventoryLot.create({
          data: {
            companyId: args.toCompanyId,
            shopId: args.toShopId,
            productId: sourceLot.productId,
            lotNumber: newLotNumber!,
            expiryDate: sourceLot.expiryDate,
            qtyReceived: item.quantity,
            qtyOnHand: item.quantity,
            unitCost: sourceLot.unitCost,
            status: 'ACTIVE',
            updatedById: args.userId,
          },
        });
      } else if (destLot) {
        // Exact match or no existing expiry: increment
        await tx.inventoryLot.update({
          where: { id: destLot.id },
          data: {
            qtyReceived: { increment: item.quantity },
            qtyOnHand: { increment: item.quantity },
            updatedById: args.userId,
            updatedAt: new Date(),
          },
        });
      } else {
        // No destination lot exists: create
        await tx.inventoryLot.create({
          data: {
            companyId: args.toCompanyId,
            shopId: args.toShopId,
            productId: sourceLot.productId,
            lotNumber: sourceLot.lotNumber,
            expiryDate: sourceLot.expiryDate,
            qtyReceived: item.quantity,
            qtyOnHand: item.quantity,
            unitCost: sourceLot.unitCost,
            status: 'ACTIVE',
            updatedById: args.userId,
          },
        });
      }
    }
  }

  /**
   * Query helper for expiry scan job
   */
  async expirySnapshot(
    tx: Prisma.TransactionClient,
    companyId: string,
    thresholds: number[],
  ): Promise<
    Array<{
      id: string;
      lotNumber: string;
      productId: string;
      shopId: string;
      expiryDate: Date;
      qtyOnHand: Decimal;
      unitCost: Decimal | null;
      daysLeft: number;
      threshold: number;
    }>
  > {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const results = [];
    for (const thresh of thresholds) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + thresh);

      const lots = await tx.inventoryLot.findMany({
        where: {
          companyId,
          status: 'ACTIVE',
          qtyOnHand: { gt: 0 },
          expiryDate: thresh === 0 ? { lt: today } : { lte: targetDate },
        },
        select: {
          id: true,
          lotNumber: true,
          productId: true,
          shopId: true,
          expiryDate: true,
          qtyOnHand: true,
          unitCost: true,
        },
      });

      for (const lot of lots) {
        if (!lot.expiryDate) continue;
        const daysLeft = Math.floor(
          (lot.expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        results.push({
          id: lot.id,
          lotNumber: lot.lotNumber,
          productId: lot.productId,
          shopId: lot.shopId,
          expiryDate: lot.expiryDate,
          qtyOnHand: lot.qtyOnHand,
          unitCost: lot.unitCost,
          daysLeft,
          threshold: thresh,
        });
      }
    }

    return results;
  }
}
