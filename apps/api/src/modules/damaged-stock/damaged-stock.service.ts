import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DocumentStatus, Prisma, TransactionType } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { assertNotFuture } from '../../common/utils/date-guards';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
import { DocumentAlreadyPostedException, InsufficientStockException } from '../../common/exceptions/domain.exceptions';
import { AuditService } from '../audit/audit.service';
import { buildStockAdjustmentAudit } from '../../common/state-machines/inventory-audit';
import { assertCompanyId } from '../../common/utils/assert-company-id';

@Injectable()
export class DamagedStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
  ) {}

  private async available(tx: Prisma.TransactionClient, shopId: string, productId: string) {
    const s = await tx.stockSummary.findUnique({ where: { shopId_productId: { shopId, productId } } });
    return s?.currentStock ?? new Prisma.Decimal(0);
  }

  async list(user: RequestUser, query: { shop_id?: string; cursor?: string; take?: number }) {
    const take = clampTake(query.take);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.DamagedStockWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
    };

    const rows = await this.prisma.damagedStock.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      include: { shop: true, product: true },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async create(
    user: RequestUser,
    dto: { damageDate: string; shopId: string; productId: string; damagedQuantity: number; reason: string; remarks?: string },
  ) {
    assertShopScope(user, dto.shopId);
    const damageDate = new Date(dto.damageDate);
    assertNotFuture(damageDate);
    if (dto.damagedQuantity <= 0) throw new BadRequestException('Quantity must be > 0');

    return this.prisma.$transaction(async (tx) => {
      const avail = await this.available(tx, dto.shopId, dto.productId);
      if (avail.lt(new Prisma.Decimal(dto.damagedQuantity))) {
        const product = await tx.product.findUnique({ where: { id: dto.productId } });
        throw new InsufficientStockException('Insufficient stock', [
          {
            productId: dto.productId,
            productCode: product?.productCode ?? dto.productId,
            available: avail.toString(),
            requested: String(dto.damagedQuantity),
          },
        ]);
      }

      const damageNumber = await this.numbers.nextNumber(tx, {
        shopId: dto.shopId,
        docType: 'DM',
        prefix: 'DM',
        date: damageDate,
      });

      return tx.damagedStock.create({
        data: {
          damageNumber,
          damageDate,
          shopId: dto.shopId,
          productId: dto.productId,
          damagedQuantity: new Prisma.Decimal(dto.damagedQuantity),
          reason: dto.reason.trim(),
          remarks: dto.remarks?.trim(),
          status: DocumentStatus.DRAFT,
          createdById: user.id,
        },
        include: { product: true, shop: true },
      });
    });
  }

  async get(user: RequestUser, id: string) {
    const row = await this.prisma.damagedStock.findUnique({
      where: { id },
      include: { product: true, shop: true },
    });
    if (!row) throw new NotFoundException('Not found');
    assertShopScope(user, row.shopId);
    return row;
  }

  async update(
    user: RequestUser,
    id: string,
    dto: Partial<{ damageDate: string; shopId: string; productId: string; damagedQuantity: number; reason: string; remarks?: string }>,
  ) {
    const existing = await this.get(user, id);
    if (existing.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only DRAFT can be edited');
    if (dto.shopId) assertShopScope(user, dto.shopId);

    const damageDate = dto.damageDate ? new Date(dto.damageDate) : existing.damageDate;
    assertNotFuture(damageDate);

    return this.prisma.$transaction(async (tx) => {
      const qty = dto.damagedQuantity ?? Number(existing.damagedQuantity);
      const shopId = dto.shopId ?? existing.shopId;
      const productId = dto.productId ?? existing.productId;
      if (qty <= 0) throw new BadRequestException('Quantity must be > 0');

      const avail = await this.available(tx, shopId, productId);
      if (avail.lt(new Prisma.Decimal(qty))) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        throw new InsufficientStockException('Insufficient stock', [
          {
            productId,
            productCode: product?.productCode ?? productId,
            available: avail.toString(),
            requested: String(qty),
          },
        ]);
      }

      return tx.damagedStock.update({
        where: { id },
        data: {
          damageDate,
          shopId: dto.shopId ?? undefined,
          productId: dto.productId ?? undefined,
          damagedQuantity: dto.damagedQuantity !== undefined ? new Prisma.Decimal(dto.damagedQuantity) : undefined,
          reason: dto.reason?.trim(),
          remarks: dto.remarks?.trim(),
          updatedById: user.id,
        },
        include: { product: true, shop: true },
      });
    });
  }

  async post(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    if (row.status === DocumentStatus.POSTED) throw new DocumentAlreadyPostedException();
    assertNotFuture(row.damageDate);

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.damagedStock.findUnique({ where: { id } });
      if (!fresh || fresh.status !== DocumentStatus.DRAFT) throw new DocumentAlreadyPostedException();

      const avail = await this.available(tx, fresh.shopId, fresh.productId);
      if (avail.lt(fresh.damagedQuantity)) {
        const product = await tx.product.findUnique({ where: { id: fresh.productId } });
        throw new InsufficientStockException('Insufficient stock for posting', [
          {
            productId: fresh.productId,
            productCode: product?.productCode ?? fresh.productId,
            available: avail.toString(),
            requested: fresh.damagedQuantity.toString(),
          },
        ]);
      }

      const beforeQty = Number(avail);

      const transitioned = await tx.damagedStock.updateMany({
        where: { id, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new DocumentAlreadyPostedException();
      }

      await this.stock.postMovementOnce(tx, {
        type: TransactionType.DAMAGE,
        ref: fresh.damageNumber,
        date: fresh.damageDate,
        shopId: fresh.shopId,
        productId: fresh.productId,
        inQty: 0,
        outQty: fresh.damagedQuantity,
        sourceType: 'GOODS_RETURN',
        sourceId: fresh.id,
        idempotencyKey: `dm:${fresh.id}`,
        userId: user.id,
      });

      // Capture after quantity for audit
      const afterSummary = await tx.stockSummary.findUnique({
        where: { shopId_productId: { shopId: fresh.shopId, productId: fresh.productId } },
      });
      const afterQty = Number(afterSummary?.currentStock ?? 0);
      const delta = -Number(fresh.damagedQuantity);

      const posted = await tx.damagedStock.findUniqueOrThrow({
        where: { id },
        include: { product: true, shop: true },
      });

      // Log stock adjustment audit
      const shop = await tx.shop.findUnique({ where: { id: posted.shopId }, select: { companyId: true } });
      if (shop?.companyId) {
        await this.audit.log(
          buildStockAdjustmentAudit({
            companyId: shop.companyId,
            userId: user.id,
            productId: fresh.productId,
            warehouseId: fresh.shopId,
            adjustmentType: 'LOSS',
            reason: fresh.reason,
            beforeQty,
            delta,
            afterQty,
            referenceNo: fresh.damageNumber,
          }),
          tx,
        );
      }

      await this.audit.logTenant(
        user,
        {
          action: AuditAction.POST,
          entityType: 'DAMAGED_STOCK',
          entityId: posted.id,
          newValues: {
            damageNumber: posted.damageNumber,
            status: posted.status,
            damagedQuantity: posted.damagedQuantity.toString(),
          },
        },
        tx,
      );
      return posted;
    });
  }

  async print(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{no}}</title>
      <style>body{font-family:Arial;padding:24px}</style></head><body>
      <h2>Damaged Stock {{no}}</h2>
      <p>Date: {{d}} | Shop: {{shop}} | Product: {{code}} | Qty: {{qty}}</p>
      <p>Reason: {{reason}}</p>
      </body></html>`);
    return tpl({
      no: row.damageNumber,
      d: row.damageDate.toISOString().slice(0, 10),
      shop: row.shop.shopName,
      code: row.product.productCode,
      qty: row.damagedQuantity.toString(),
      reason: row.reason,
    });
  }
}

