import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DocumentStatus, Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { assertNotFuture } from '../../common/utils/date-guards';
import { runSerializableTxWithRetry } from '../../common/utils/serializable-tx';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
import { DocumentAlreadyPostedException, InsufficientStockException } from '../../common/exceptions/domain.exceptions';
import { AuditService } from '../audit/audit.service';
import { buildTransferStockAudit } from '../../common/state-machines/inventory-audit';
import type { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import type { ListStockTransfersDto } from './dto/list-stock-transfers.dto';

type StockTransferListRow = Prisma.StockTransferHeaderGetPayload<{
  include: {
    fromShop: true;
    toShop: true;
    _count: { select: { items: true } };
  };
}>;

@Injectable()
export class StockTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  private serializeListRow(row: StockTransferListRow) {
    return {
      id: row.id,
      transferNumber: row.transferNumber,
      transferDate: row.transferDate.toISOString().slice(0, 10),
      fromShopId: row.fromShopId,
      toShopId: row.toShopId,
      fromStorageLocationId: row.fromStorageLocationId,
      toStorageLocationId: row.toStorageLocationId,
      status: row.status,
      notes: row.notes,
      postedAt: row.postedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      itemCount: row._count.items,
      fromShop: row.fromShop
        ? {
            id: row.fromShop.id,
            shopName: row.fromShop.shopName,
            shopNumber: row.fromShop.shopNumber,
          }
        : undefined,
      toShop: row.toShop
        ? {
            id: row.toShop.id,
            shopName: row.toShop.shopName,
            shopNumber: row.toShop.shopNumber,
          }
        : undefined,
    };
  }

  private async available(tx: Prisma.TransactionClient, shopId: string, productId: string) {
    return this.stock.resolveBalance(tx, shopId, productId);
  }

  private userCanAccessShop(user: RequestUser, shopId: string): boolean {
    try {
      assertShopScope(user, shopId);
      return true;
    } catch {
      return false;
    }
  }

  private assertTransferReadable(user: RequestUser, fromShopId: string, toShopId: string) {
    if (!this.userCanAccessShop(user, fromShopId) && !this.userCanAccessShop(user, toShopId)) {
      throw new ForbiddenException('Shop scope mismatch');
    }
  }

  private async assertSameCompanyShops(
    tx: Prisma.TransactionClient,
    fromShopId: string,
    toShopId: string,
  ) {
    const shops = await tx.shop.findMany({
      where: { id: { in: [fromShopId, toShopId] } },
      select: { id: true, companyId: true },
    });
    if (shops.length !== 2) {
      throw new BadRequestException('Invalid shop selection');
    }
    const [fromShop, toShop] = shops.sort((a, b) => a.id.localeCompare(b.id));
    if (fromShop.companyId !== toShop.companyId) {
      throw new BadRequestException('Transfers are only allowed between shops in the same company');
    }
  }

  private async assertStorageLocation(
    tx: Prisma.TransactionClient,
    storageLocationId: string | undefined,
    shopId: string,
    label: 'from' | 'to',
  ) {
    if (!storageLocationId) return;
    const location = await tx.storageLocation.findUnique({ where: { id: storageLocationId } });
    if (!location || location.shopId !== shopId) {
      throw new BadRequestException(`Invalid ${label} storage location`);
    }
  }

  async list(user: RequestUser, query: ListStockTransfersDto) {
    const take = clampTake(query.take);
    if (query.from_shop_id) assertShopScope(user, query.from_shop_id);
    if (query.to_shop_id) assertShopScope(user, query.to_shop_id);

    const shopScope = shopListWhere(user);
    const where: Prisma.StockTransferHeaderWhereInput = {
      OR: [{ fromShop: shopScope }, { toShop: shopScope }],
      ...(query.from_shop_id ? { fromShopId: query.from_shop_id } : {}),
      ...(query.to_shop_id ? { toShopId: query.to_shop_id } : {}),
    };
    if (query.status) where.status = query.status;
    if (query.date_from || query.date_to) {
      where.transferDate = {};
      if (query.date_from) where.transferDate.gte = new Date(query.date_from);
      if (query.date_to) where.transferDate.lte = new Date(query.date_to);
    }

    const rows = await this.prisma.stockTransferHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        fromShop: true,
        toShop: true,
        _count: { select: { items: true } },
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items.map((row) => this.serializeListRow(row)), meta };
  }

  async create(user: RequestUser, dto: CreateStockTransferDto) {
    assertShopScope(user, dto.fromShopId);
    assertShopScope(user, dto.toShopId);
    if (dto.fromShopId === dto.toShopId) {
      throw new BadRequestException('Source and destination shops must differ');
    }

    const transferDate = new Date(dto.transferDate);
    assertNotFuture(transferDate);
    for (const line of dto.items) {
      if (line.quantity <= 0) throw new BadRequestException('Line quantities must be > 0');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.assertSameCompanyShops(tx, dto.fromShopId, dto.toShopId);
      await this.assertStorageLocation(tx, dto.fromStorageLocationId, dto.fromShopId, 'from');
      await this.assertStorageLocation(tx, dto.toStorageLocationId, dto.toShopId, 'to');

      const transferNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: dto.fromShopId,
        docType: 'ST',
        basePrefix: 'ST',
        date: transferDate,
      });

      const lines = dto.items.map((line) => ({
        productId: line.productId,
        quantity: new Prisma.Decimal(line.quantity),
        uom: line.uom,
      }));

      return tx.stockTransferHeader.create({
        data: {
          transferNumber,
          transferDate,
          fromShopId: dto.fromShopId,
          toShopId: dto.toShopId,
          fromStorageLocationId: dto.fromStorageLocationId ?? null,
          toStorageLocationId: dto.toStorageLocationId ?? null,
          notes: dto.notes?.trim(),
          status: DocumentStatus.DRAFT,
          createdById: user.id,
          items: { create: lines },
        },
        include: {
          items: { include: { product: true } },
          fromShop: true,
          toShop: true,
          fromStorageLocation: true,
          toStorageLocation: true,
        },
      });
    });
  }

  async get(user: RequestUser, id: string) {
    const transfer = await this.prisma.stockTransferHeader.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        fromShop: true,
        toShop: true,
        fromStorageLocation: true,
        toStorageLocation: true,
      },
    });
    if (!transfer) throw new NotFoundException('Stock transfer not found');
    this.assertTransferReadable(user, transfer.fromShopId, transfer.toShopId);
    return transfer;
  }

  async post(user: RequestUser, id: string) {
    const header = await this.get(user, id);
    if (header.status === DocumentStatus.POSTED) throw new DocumentAlreadyPostedException();
    assertShopScope(user, header.fromShopId);
    assertShopScope(user, header.toShopId);
    assertNotFuture(header.transferDate);

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const fresh = await tx.stockTransferHeader.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!fresh || fresh.status !== DocumentStatus.DRAFT) {
        throw new DocumentAlreadyPostedException();
      }

      await this.assertSameCompanyShops(tx, fresh.fromShopId, fresh.toShopId);

      const failures: { productId: string; productCode: string; available: string; requested: string }[] = [];
      for (const line of fresh.items) {
        const avail = await this.available(tx, fresh.fromShopId, line.productId);
        if (avail.lt(line.quantity)) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          failures.push({
            productId: line.productId,
            productCode: product?.productCode ?? line.productId,
            available: avail.toString(),
            requested: line.quantity.toString(),
          });
        }
      }
      if (failures.length) {
        throw new InsufficientStockException('Insufficient stock for posting', failures);
      }

      // Capture before quantities for both shops
      const beforeQtyMapFrom = new Map<string, number>();
      const beforeQtyMapTo = new Map<string, number>();
      for (const line of fresh.items) {
        const fromSummary = await tx.stockSummary.findUnique({
          where: { shopId_productId: { shopId: fresh.fromShopId, productId: line.productId } },
        });
        const toSummary = await tx.stockSummary.findUnique({
          where: { shopId_productId: { shopId: fresh.toShopId, productId: line.productId } },
        });
        beforeQtyMapFrom.set(line.productId, Number(fromSummary?.currentStock ?? 0));
        beforeQtyMapTo.set(line.productId, Number(toSummary?.currentStock ?? 0));
      }

      const transitioned = await tx.stockTransferHeader.updateMany({
        where: { id, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new DocumentAlreadyPostedException();
      }

      const shops = await tx.shop.findMany({
        where: { id: { in: [fresh.fromShopId, fresh.toShopId] } },
        select: { id: true, companyId: true },
      });
      const companyId = shops[0]?.companyId;

      for (const line of fresh.items) {
        await this.stock.postMovementOnce(tx, {
          type: TransactionType.STOCK_TRANSFER_OUT,
          ref: fresh.transferNumber,
          date: fresh.transferDate,
          shopId: fresh.fromShopId,
          productId: line.productId,
          inQty: 0,
          outQty: line.quantity,
          sourceType: 'STOCK_TRANSFER',
          sourceId: fresh.id,
          sourceLineId: line.id,
          idempotencyKey: `st:out:${fresh.id}:${line.id}`,
          userId: user.id,
        });
        await this.stock.postMovementOnce(tx, {
          type: TransactionType.STOCK_TRANSFER_IN,
          ref: fresh.transferNumber,
          date: fresh.transferDate,
          shopId: fresh.toShopId,
          productId: line.productId,
          inQty: line.quantity,
          outQty: 0,
          sourceType: 'STOCK_TRANSFER',
          sourceId: fresh.id,
          sourceLineId: line.id,
          idempotencyKey: `st:in:${fresh.id}:${line.id}`,
          userId: user.id,
        });

        // Capture after quantities for audit
        const afterFromSummary = await tx.stockSummary.findUnique({
          where: { shopId_productId: { shopId: fresh.fromShopId, productId: line.productId } },
        });
        const afterToSummary = await tx.stockSummary.findUnique({
          where: { shopId_productId: { shopId: fresh.toShopId, productId: line.productId } },
        });
        const beforeFromQty = beforeQtyMapFrom.get(line.productId) ?? 0;
        const afterFromQty = Number(afterFromSummary?.currentStock ?? 0);
        const beforeToQty = beforeQtyMapTo.get(line.productId) ?? 0;
        const afterToQty = Number(afterToSummary?.currentStock ?? 0);

        // Log transfer stock audit
        if (companyId) {
          await this.audit.log(
            buildTransferStockAudit({
              companyId,
              userId: user.id,
              productId: line.productId,
              fromWarehouse: fresh.fromShopId,
              toWarehouse: fresh.toShopId,
              qty: Number(line.quantity),
              beforeFromQty,
              afterFromQty,
              beforeToQty,
              afterToQty,
              referenceNo: fresh.transferNumber,
            }),
            tx,
          );
        }
      }

      const posted = await tx.stockTransferHeader.findUniqueOrThrow({
        where: { id },
        include: {
          items: { include: { product: true } },
          fromShop: true,
          toShop: true,
          fromStorageLocation: true,
          toStorageLocation: true,
        },
      });
      await this.audit.logTenant(
        user,
        {
          action: AuditAction.POST,
          entityType: 'STOCK_TRANSFER',
          entityId: posted.id,
          newValues: {
            transferNumber: posted.transferNumber,
            status: posted.status,
            itemCount: posted.items.length,
            fromShopId: posted.fromShopId,
            toShopId: posted.toShopId,
          },
        },
        tx,
      );
      return posted;
    });
  }
}
