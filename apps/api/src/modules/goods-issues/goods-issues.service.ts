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
import { InventoryLotService } from '../stock/inventory-lot.service';
import { DocumentAlreadyPostedException, InsufficientStockException } from '../../common/exceptions/domain.exceptions';
import { AuditService } from '../audit/audit.service';

type Line = { productId: string; quantity: number; uom: string };

type GoodsIssueListRow = Prisma.GoodsIssueHeaderGetPayload<{
  include: {
    shop: true;
    _count: { select: { items: true } };
  };
}>;

@Injectable()
export class GoodsIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly inventoryLots: InventoryLotService,
  ) {}

  private serializeListRow(row: GoodsIssueListRow) {
    return {
      id: row.id,
      giNumber: row.giNumber,
      giDate: row.giDate.toISOString().slice(0, 10),
      shopId: row.shopId,
      issueReason: row.issueReason,
      issueType: row.issueType ?? row.issueReason,
      otherReason: row.otherReason ?? null,
      remarks: row.remarks,
      status: row.status,
      postedAt: row.postedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      itemCount: row._count.items,
      shop: row.shop
        ? {
            id: row.shop.id,
            shopName: row.shop.shopName,
            shopNumber: row.shop.shopNumber,
          }
        : undefined,
    };
  }

  private async available(tx: Prisma.TransactionClient, shopId: string, productId: string) {
    return this.stock.resolveBalance(tx, shopId, productId);
  }

  async list(
    user: RequestUser,
    query: { shop_id?: string; date_from?: string; date_to?: string; status?: DocumentStatus; cursor?: string; take?: number },
  ) {
    const take = clampTake(query.take);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.GoodsIssueHeaderWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
    };
    if (query.status) where.status = query.status;
    if (query.date_from || query.date_to) {
      where.giDate = {};
      if (query.date_from) where.giDate.gte = new Date(query.date_from);
      if (query.date_to) where.giDate.lte = new Date(query.date_to);
    }

    const rows = await this.prisma.goodsIssueHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        shop: true,
        _count: { select: { items: true } },
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items.map((row) => this.serializeListRow(row)), meta };
  }

  async create(user: RequestUser, params: { giDate: string; shopId: string; issueType?: string; issueReason?: string; otherReason?: string; remarks?: string; items: Line[] }) {
    assertShopScope(user, params.shopId);
    const giDate = new Date(params.giDate);
    assertNotFuture(giDate);
    for (const line of params.items) {
      if (line.quantity <= 0) throw new BadRequestException('Line quantities must be > 0');
    }

    const issueType = params.issueType?.trim() || params.issueReason?.trim();
    if (!issueType) {
      throw new BadRequestException('Issue type is required');
    }
    if (issueType === 'Others' && !params.otherReason?.trim()) {
      throw new BadRequestException('Please provide a reason for Others');
    }

    return this.prisma.$transaction(async (tx) => {
      const giNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId: params.shopId,
        docType: 'GI',
        date: giDate,
      });

      const lines = [];
      for (const line of params.items) {
        const avail = await this.available(tx, params.shopId, line.productId);
        if (avail.lt(new Prisma.Decimal(line.quantity))) {
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          throw new InsufficientStockException('Insufficient stock at creation', [
            {
              productId: line.productId,
              productCode: product?.productCode ?? line.productId,
              available: avail.toString(),
              requested: String(line.quantity),
            },
          ]);
        }
        lines.push({
          productId: line.productId,
          quantity: new Prisma.Decimal(line.quantity),
          uom: line.uom,
          availableStockSnapshot: avail,
          createdById: user.id,
        });
      }

      return tx.goodsIssueHeader.create({
        data: {
          giNumber,
          giDate,
          shopId: params.shopId,
          issueType,
          issueReason: issueType,
          otherReason: params.otherReason?.trim() || null,
          remarks: params.remarks?.trim(),
          status: DocumentStatus.DRAFT,
          createdById: user.id,
          items: { create: lines },
        },
        include: { items: { include: { product: true } }, shop: true },
      });
    });
  }

  async get(user: RequestUser, id: string) {
    const gi = await this.prisma.goodsIssueHeader.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, shop: true },
    });
    if (!gi) throw new NotFoundException('Goods issue not found');
    assertShopScope(user, gi.shopId);
    return gi;
  }

  async update(user: RequestUser, id: string, dto: Partial<{ giDate: string; shopId: string; issueType: string; issueReason: string; otherReason?: string; remarks?: string; items: Line[] }>) {
    const existing = await this.get(user, id);
    if (existing.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only DRAFT can be edited');
    if (dto.shopId) assertShopScope(user, dto.shopId);

    const giDate = dto.giDate ? new Date(dto.giDate) : existing.giDate;
    assertNotFuture(giDate);

    const nextIssueType = dto.issueType?.trim() || dto.issueReason?.trim() || existing.issueType || existing.issueReason;
    const nextOtherReason = dto.otherReason?.trim() ?? existing.otherReason;
    if (!nextIssueType) {
      throw new BadRequestException('Issue type is required');
    }
    if (nextIssueType === 'Others' && !nextOtherReason) {
      throw new BadRequestException('Please provide a reason for Others');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.goodsIssueItem.deleteMany({ where: { giHeaderId: id } });
        const creates = [];
        for (const line of dto.items) {
          if (line.quantity <= 0) throw new BadRequestException('Line quantities must be > 0');
          const avail = await this.available(tx, dto.shopId ?? existing.shopId, line.productId);
          if (avail.lt(new Prisma.Decimal(line.quantity))) {
            throw new InsufficientStockException('Insufficient stock', [
              {
                productId: line.productId,
                productCode: line.productId,
                available: avail.toString(),
                requested: String(line.quantity),
              },
            ]);
          }
          creates.push({
            productId: line.productId,
            quantity: new Prisma.Decimal(line.quantity),
            uom: line.uom,
            availableStockSnapshot: avail,
            createdById: user.id,
          });
        }
        await tx.goodsIssueItem.createMany({ data: creates.map((c) => ({ ...c, giHeaderId: id })) });
      }

      return tx.goodsIssueHeader.update({
        where: { id },
        data: {
          giDate,
          shopId: dto.shopId ?? undefined,
          issueType: nextIssueType,
          issueReason: nextIssueType,
          otherReason: nextOtherReason ?? null,
          remarks: dto.remarks?.trim(),
          updatedById: user.id,
        },
        include: { items: { include: { product: true } }, shop: true },
      });
    });
  }

  async post(user: RequestUser, id: string) {
    const header = await this.get(user, id);
    if (header.status === DocumentStatus.POSTED) throw new DocumentAlreadyPostedException();
    assertNotFuture(header.giDate);

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.goodsIssueHeader.findUnique({ where: { id }, include: { items: true } });
      if (!fresh || fresh.status !== DocumentStatus.DRAFT) throw new DocumentAlreadyPostedException();

      const failures: { productId: string; productCode: string; available: string; requested: string }[] = [];
      for (const line of fresh.items) {
        const avail = await this.available(tx, fresh.shopId, line.productId);
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

      const transitioned = await tx.goodsIssueHeader.updateMany({
        where: { id, status: DocumentStatus.DRAFT },
        data: { status: DocumentStatus.POSTED, postedAt: new Date(), updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new DocumentAlreadyPostedException();
      }

      for (const line of fresh.items) {
        await this.stock.postMovementOnce(tx, {
          type: TransactionType.GOODS_ISSUE,
          ref: fresh.giNumber,
          date: fresh.giDate,
          shopId: fresh.shopId,
          productId: line.productId,
          inQty: 0,
          outQty: line.quantity,
          sourceType: 'GOODS_ISSUE',
          sourceId: fresh.id,
          sourceLineId: line.id,
          idempotencyKey: `gi:${fresh.id}:${line.id}`,
          userId: user.id,
        });
        await this.inventoryLots.consumeFifo(
          tx,
          fresh.shopId,
          line.productId,
          new Prisma.Decimal(line.quantity),
        );
      }

      const posted = await tx.goodsIssueHeader.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { product: true } }, shop: true },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'GOODS_ISSUE',
          entityId: posted.id,
          newValues: {
            giNumber: posted.giNumber,
            status: posted.status,
            itemCount: posted.items.length,
          },
        },
        tx,
      );
      return posted;
    });
  }

  async print(user: RequestUser, id: string) {
    const gi = await this.get(user, id);
    const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{giNumber}}</title>
      <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
      </head><body>
      <h2>Goods Issue {{giNumber}}</h2>
      <p>Date: {{giDate}} | Shop: {{shopName}}</p>
      <p>Reason: {{issueReason}}</p>
      <table><thead><tr><th>Product</th><th>Qty</th></tr></thead><tbody>
      {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td></tr>{{/each}}
      </tbody></table>
      </body></html>`);
    return tpl({
      giNumber: gi.giNumber,
      giDate: gi.giDate.toISOString().slice(0, 10),
      shopName: gi.shop.shopName,
      issueReason: gi.issueReason,
      lines: gi.items.map((i) => ({ code: i.product.productCode, qty: i.quantity.toString() })),
    });
  }

  async remove(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    if (existing.status !== DocumentStatus.DRAFT) throw new BadRequestException('Only DRAFT can be deleted');
    await this.prisma.goodsIssueHeader.delete({ where: { id } });
    return { ok: true };
  }
}

