import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { RequestUser } from '../../common/types/request-user';
import { PrismaService } from '../../prisma/prisma.service';
import { assertShopScope } from '../../common/utils/shop-scope';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import { StockService } from './stock.service';
import { Prisma } from '@prisma/client';

@ApiTags('inventory-lots')
@ApiBearerAuth()
@Controller('inventory-lots')
export class InventoryLotsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  @Get('reconcile')
  @RequirePermission('report:view')
  @HttpCode(HttpStatus.OK)
  async reconcile(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId: string,
  ) {
    assertCompanyId(user);
    assertShopScope(user, shopId);

    // Get ledger balance per product
    const ledgerBalances = await this.prisma.$queryRaw<
      Array<{ product_id: string; balance: string }>
    >`
      SELECT product_id, SUM(in_qty - out_qty)::numeric AS balance
      FROM stock_ledger
      WHERE shop_id = ${shopId}
      GROUP BY product_id
      HAVING SUM(in_qty - out_qty) > 0
    `;

    // Get lot balances per product
    const lotBalances = await this.prisma.$queryRaw<
      Array<{ product_id: string; balance: string }>
    >`
      SELECT product_id, SUM(qty_on_hand)::numeric AS balance
      FROM inventory_lots
      WHERE shop_id = ${shopId} AND status IN ('ACTIVE', 'BLOCKED', 'CONSUMED')
      GROUP BY product_id
    `;

    // Compare
    const ledgerMap = new Map<string, Prisma.Decimal>();
    const lotMap = new Map<string, Prisma.Decimal>();

    for (const row of ledgerBalances) {
      ledgerMap.set(row.product_id, new Prisma.Decimal(row.balance));
    }

    for (const row of lotBalances) {
      lotMap.set(row.product_id, new Prisma.Decimal(row.balance));
    }

    const allProductIds = new Set([...ledgerMap.keys(), ...lotMap.keys()]);
    const drift = [];

    for (const productId of allProductIds) {
      const ledger = ledgerMap.get(productId) ?? new Prisma.Decimal(0);
      const lots = lotMap.get(productId) ?? new Prisma.Decimal(0);

      if (!ledger.equals(lots)) {
        drift.push({
          productId,
          ledgerBalance: ledger.toString(),
          lotsBalance: lots.toString(),
          difference: ledger.minus(lots).toString(),
        });
      }
    }

    return {
      shopId,
      reconciled: drift.length === 0,
      driftCount: drift.length,
      drift,
    };
  }

  @Get('fefo-suggestion')
  @RequirePermission('goods_issue:read')
  @HttpCode(HttpStatus.OK)
  async fefoSuggestion(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId: string,
    @Query('product_id') productId: string,
    @Query('quantity') quantity: string,
    @Query('as_of') asOf?: string,
  ) {
    assertCompanyId(user);
    assertShopScope(user, shopId);

    const qty = new Prisma.Decimal(quantity);
    const asOfDate = asOf ? new Date(asOf) : new Date();

    // Dry-run allocateFefo (no locks, read-only)
    const lots = await this.prisma.$queryRaw<
      Array<{
        id: string;
        lot_number: string;
        expiry_date: Date | null;
        qty_on_hand: string;
      }>
    >`
      SELECT id, lot_number, expiry_date, qty_on_hand
      FROM inventory_lots
      WHERE shop_id = ${shopId}
        AND product_id = ${productId}
        AND status = 'ACTIVE'
        AND qty_on_hand > 0
        AND (expiry_date IS NULL OR expiry_date >= ${asOfDate})
      ORDER BY expiry_date ASC NULLS LAST, created_at ASC
    `;

    const allocations = [];
    let remaining = qty;

    for (const lot of lots) {
      const available = new Prisma.Decimal(lot.qty_on_hand);
      const toAllocate = remaining.lessThanOrEqualTo(available)
        ? remaining
        : available;

      allocations.push({
        lotId: lot.id,
        lotNumber: lot.lot_number,
        expiryDate: lot.expiry_date,
        quantity: toAllocate.toString(),
      });

      remaining = remaining.minus(toAllocate);

      if (remaining.isZero()) break;
    }

    return {
      productId,
      shopId,
      requestedQuantity: qty.toString(),
      allocations,
      isFullyAllocated: remaining.isZero(),
      shortfall: remaining.greaterThan(0) ? remaining.toString() : null,
    };
  }

  @Get('expiry-summary')
  @RequirePermission('report:view')
  @HttpCode(HttpStatus.OK)
  async expirySummary(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId: string,
  ) {
    assertCompanyId(user);
    assertShopScope(user, shopId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiring7d = new Date(today);
    expiring7d.setDate(expiring7d.getDate() + 7);

    const expiring3d = new Date(today);
    expiring3d.setDate(expiring3d.getDate() + 3);

    const expiring1d = new Date(today);
    expiring1d.setDate(expiring1d.getDate() + 1);

    // Query: expiring in 7 days, expired, loss value
    const [expiringInSevenDays, expired, lossValue] = await Promise.all([
      this.prisma.inventoryLot.findMany({
        where: {
          shopId,
          status: 'ACTIVE',
          qtyOnHand: { gt: 0 },
          expiryDate: { gte: today, lte: expiring7d },
        },
        select: {
          id: true,
          lotNumber: true,
          product: { select: { productCode: true, description: true } },
          expiryDate: true,
          qtyOnHand: true,
          unitCost: true,
        },
      }),
      this.prisma.inventoryLot.findMany({
        where: {
          shopId,
          status: 'BLOCKED',
          blockedReason: 'EXPIRED',
          qtyOnHand: { gt: 0 },
        },
        select: {
          id: true,
          lotNumber: true,
          product: { select: { productCode: true, description: true } },
          expiryDate: true,
          qtyOnHand: true,
          unitCost: true,
          blockedAt: true,
        },
      }),
      this.prisma.$queryRaw<
        Array<{ loss_value: string }>
      >`
        SELECT SUM(qty_on_hand * COALESCE(unit_cost, 0))::numeric AS loss_value
        FROM inventory_lots
        WHERE shop_id = ${shopId}
          AND status IN ('BLOCKED', 'CONSUMED', 'SCRAPPED')
          AND COALESCE(unit_cost, 0) > 0
      `,
    ]);

    return {
      shopId,
      expiringIn7Days: {
        count: expiringInSevenDays.length,
        items: expiringInSevenDays,
        totalQuantity: expiringInSevenDays
          .reduce((sum, lot) => sum.plus(lot.qtyOnHand), new Prisma.Decimal(0))
          .toString(),
      },
      expiredNotScrapped: {
        count: expired.length,
        items: expired,
        totalQuantity: expired
          .reduce((sum, lot) => sum.plus(lot.qtyOnHand), new Prisma.Decimal(0))
          .toString(),
      },
      lossValue: lossValue[0]?.loss_value ?? '0',
    };
  }

  @Get()
  @RequirePermission('product:read')
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: RequestUser,
    @Query('shop_id') shopId: string,
    @Query('product_id') productId?: string,
    @Query('status') status?: string,
    @Query('expiring_within_days') expiringWithinDays?: string,
    @Query('expired') expired?: string,
  ) {
    assertCompanyId(user);
    assertShopScope(user, shopId);

    let where: Prisma.InventoryLotWhereInput = { shopId };

    if (productId) {
      where.productId = productId;
    }

    if (status) {
      where.status = status as any;
    }

    if (expired === 'true') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.expiryDate = { lt: today };
    } else if (expiringWithinDays) {
      const days = parseInt(expiringWithinDays);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + days);
      where.expiryDate = { gte: today, lte: futureDate };
    }

    const lots = await this.prisma.inventoryLot.findMany({
      where,
      include: {
        product: { select: { productCode: true, description: true } },
        shop: { select: { shopName: true } },
      },
      orderBy: { expiryDate: 'asc' },
      take: 1000,
    });

    return { shopId, count: lots.length, lots };
  }

  private async getScopedLot(user: RequestUser, id: string) {
    const lot = await this.prisma.inventoryLot.findUnique({ where: { id } });
    if (!lot) throw new NotFoundException('Inventory lot not found');
    assertShopScope(user, lot.shopId);
    return lot;
  }

  @Post(':id/block')
  @RequirePermission('inventory_lot:manage')
  @HttpCode(HttpStatus.OK)
  async block(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    assertCompanyId(user);
    const lot = await this.getScopedLot(user, id);
    if (lot.status !== 'ACTIVE') {
      throw new BadRequestException(`Only ACTIVE lots can be blocked (current: ${lot.status})`);
    }
    const updated = await this.prisma.inventoryLot.updateMany({
      where: { id, status: 'ACTIVE' },
      data: {
        status: 'BLOCKED',
        blockedReason: body?.reason?.trim() || 'QUALITY_HOLD',
        blockedAt: new Date(),
        updatedById: user.id,
      },
    });
    if (updated.count === 0) throw new BadRequestException('Lot state changed, retry');
    return { success: true };
  }

  @Post(':id/unblock')
  @RequirePermission('inventory_lot:manage')
  @HttpCode(HttpStatus.OK)
  async unblock(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    assertCompanyId(user);
    const lot = await this.getScopedLot(user, id);
    if (lot.status !== 'BLOCKED') {
      throw new BadRequestException(`Only BLOCKED lots can be unblocked (current: ${lot.status})`);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (lot.blockedReason === 'EXPIRED' && lot.expiryDate && lot.expiryDate < today) {
      throw new BadRequestException(
        'Lot is expired; extend its expiry date instead of unblocking',
      );
    }
    await this.prisma.inventoryLot.updateMany({
      where: { id, status: 'BLOCKED' },
      data: { status: 'ACTIVE', blockedReason: null, blockedAt: null, updatedById: user.id },
    });
    return { success: true };
  }

  @Post(':id/scrap')
  @RequirePermission('inventory_lot:manage')
  @HttpCode(HttpStatus.OK)
  async scrap(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    assertCompanyId(user);
    const lot = await this.getScopedLot(user, id);
    if (lot.status === 'SCRAPPED') throw new BadRequestException('Lot is already scrapped');
    if (lot.qtyOnHand.lte(0)) throw new BadRequestException('Lot has no quantity to scrap');

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.inventoryLot.updateMany({
        where: { id, status: lot.status, qtyOnHand: lot.qtyOnHand },
        data: {
          status: 'SCRAPPED',
          qtyOnHand: 0,
          scrappedAt: new Date(),
          updatedById: user.id,
        },
      });
      if (transitioned.count === 0) throw new BadRequestException('Lot state changed, retry');

      await this.stock.postMovementOnce(tx, {
        type: TransactionType.DAMAGE,
        ref: `LOT-SCRAP:${lot.lotNumber}`,
        date: new Date(),
        shopId: lot.shopId,
        productId: lot.productId,
        inQty: 0,
        outQty: lot.qtyOnHand,
        sourceType: 'INVENTORY_LOT',
        sourceId: lot.id,
        idempotencyKey: `lot-scrap:${lot.id}`,
        userId: user.id,
      });

      return { success: true, scrappedQuantity: lot.qtyOnHand.toString() };
    });
  }

  @Post(':id/extend-expiry')
  @RequirePermission('inventory_lot:manage')
  @HttpCode(HttpStatus.OK)
  async extendExpiry(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { newExpiryDate: string; reason?: string },
  ) {
    assertCompanyId(user);
    const lot = await this.getScopedLot(user, id);
    if (lot.status === 'SCRAPPED' || lot.status === 'CONSUMED') {
      throw new BadRequestException(`Cannot extend expiry of a ${lot.status} lot`);
    }

    const newDate = new Date(body?.newExpiryDate);
    if (Number.isNaN(newDate.getTime())) {
      throw new BadRequestException('newExpiryDate must be a valid date');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) throw new BadRequestException('New expiry date must not be in the past');

    return this.prisma.$transaction(async (tx) => {
      const unblockExpired = lot.status === 'BLOCKED' && lot.blockedReason === 'EXPIRED';
      await tx.inventoryLot.update({
        where: { id },
        data: {
          expiryDate: newDate,
          updatedById: user.id,
          ...(unblockExpired
            ? { status: 'ACTIVE', blockedReason: null, blockedAt: null }
            : {}),
        },
      });

      // Re-arm expiry alerts for the new date
      await tx.inventoryLotAlert.deleteMany({ where: { lotId: id } });

      return {
        success: true,
        previousExpiryDate: lot.expiryDate?.toISOString().slice(0, 10) ?? null,
        newExpiryDate: newDate.toISOString().slice(0, 10),
        reason: body?.reason?.trim() || null,
        unblocked: unblockExpired,
      };
    });
  }
}
