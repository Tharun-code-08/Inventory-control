import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentStatus, Prisma, TransactionType } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
import { DocumentAlreadyPostedException } from '../../common/exceptions/domain.exceptions';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly numbers: DocumentNumberService,
  ) {}

  private assertNotFuture(date: Date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date.getTime() > today.getTime()) {
      throw new BadRequestException('Document date cannot be in the future');
    }
  }

  async list(
    user: RequestUser,
    query: { shop_id?: string; date_from?: string; date_to?: string; status?: DocumentStatus; cursor?: string; take?: number },
  ) {
    const take = clampTake(query.take);
    const shopScope = defaultShopFilter(user);
    const shopId = shopScope ?? query.shop_id;
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.GoodsReceiptHeaderWhereInput = {};
    if (shopId) where.shopId = shopId;
    if (query.status) where.status = query.status;
    if (query.date_from || query.date_to) {
      where.grDate = {};
      if (query.date_from) where.grDate.gte = new Date(query.date_from);
      if (query.date_to) where.grDate.lte = new Date(query.date_to);
    }

    const rows = await this.prisma.goodsReceiptHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      include: { shop: true },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async create(user: RequestUser, dto: CreateGoodsReceiptDto) {
    assertShopScope(user, dto.shopId);
    const grDate = new Date(dto.grDate);
    this.assertNotFuture(grDate);
    for (const line of dto.items) {
      if (line.quantity <= 0) throw new BadRequestException('Line quantities must be > 0');
    }

    return this.prisma.$transaction(async (tx) => {
      const grNumber = await this.numbers.nextNumber(tx, {
        shopId: dto.shopId,
        docType: 'GR',
        prefix: 'GR',
        date: grDate,
      });

      const header = await tx.goodsReceiptHeader.create({
        data: {
          grNumber,
          grDate,
          shopId: dto.shopId,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          supplierName: dto.supplierName.trim(),
          supplierRef: dto.supplierRef?.trim(),
          remarks: dto.remarks?.trim(),
          status: DocumentStatus.DRAFT,
          createdById: user.id,
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              quantity: new Prisma.Decimal(i.quantity),
              uom: i.uom,
              purchaseRate: new Prisma.Decimal(i.purchaseRate),
              lineValue: new Prisma.Decimal(i.quantity).mul(new Prisma.Decimal(i.purchaseRate)),
              createdById: user.id,
            })),
          },
        },
        include: { items: true, shop: true },
      });
      return header;
    });
  }

  async get(user: RequestUser, id: string) {
    const gr = await this.prisma.goodsReceiptHeader.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, shop: true },
    });
    if (!gr) throw new NotFoundException('Goods receipt not found');
    assertShopScope(user, gr.shopId);
    return gr;
  }

  async update(user: RequestUser, id: string, dto: UpdateGoodsReceiptDto) {
    const existing = await this.get(user, id);
    if (existing.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT goods receipts can be edited');
    }
    if (dto.shopId) assertShopScope(user, dto.shopId);

    const grDate = dto.grDate ? new Date(dto.grDate) : existing.grDate;
    this.assertNotFuture(grDate);

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.goodsReceiptItem.deleteMany({ where: { grHeaderId: id } });
        for (const line of dto.items) {
          if (line.quantity <= 0) throw new BadRequestException('Line quantities must be > 0');
        }
      }

      return tx.goodsReceiptHeader.update({
        where: { id },
        data: {
          grDate,
          shopId: dto.shopId ?? undefined,
          supplierName: dto.supplierName?.trim(),
          supplierRef: dto.supplierRef?.trim(),
          remarks: dto.remarks?.trim(),
          updatedById: user.id,
          ...(dto.items
            ? {
                items: {
                  create: dto.items.map((i) => ({
                    productId: i.productId,
                    quantity: new Prisma.Decimal(i.quantity),
                    uom: i.uom,
                    purchaseRate: new Prisma.Decimal(i.purchaseRate),
                    lineValue: new Prisma.Decimal(i.quantity).mul(new Prisma.Decimal(i.purchaseRate)),
                    createdById: user.id,
                  })),
                },
              }
            : {}),
        },
        include: { items: true, shop: true },
      });
    });
  }

  async post(user: RequestUser, id: string) {
    const header = await this.get(user, id);
    if (header.status === DocumentStatus.POSTED) {
      throw new DocumentAlreadyPostedException();
    }
    const grDate = header.grDate;
    this.assertNotFuture(grDate);

    return this.prisma.$transaction(async (tx) => {
      const fresh = await tx.goodsReceiptHeader.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!fresh || fresh.status !== DocumentStatus.DRAFT) {
        throw new DocumentAlreadyPostedException();
      }

      let total = new Prisma.Decimal(0);
      for (const line of fresh.items) {
        await this.stock.postMovement(tx, {
          type: TransactionType.GOODS_RECEIPT,
          ref: fresh.grNumber,
          date: fresh.grDate,
          shopId: fresh.shopId,
          productId: line.productId,
          inQty: Number(line.quantity),
          outQty: 0,
          unitRate: Number(line.purchaseRate),
          userId: user.id,
        });
        total = total.add(line.lineValue);
      }

      return tx.goodsReceiptHeader.update({
        where: { id },
        data: {
          status: DocumentStatus.POSTED,
          postedAt: new Date(),
          totalValue: total,
          updatedById: user.id,
        },
        include: { items: { include: { product: true } }, shop: true },
      });
    });
  }

  async print(user: RequestUser, id: string) {
    const gr = await this.get(user, id);
    const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{grNumber}}</title>
      <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
      </head><body>
      <h2>Goods Receipt {{grNumber}}</h2>
      <p>Date: {{grDate}} | Shop: {{shopName}}</p>
      <p>Supplier: {{supplierName}}</p>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Value</th></tr></thead><tbody>
      {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td><td>{{rate}}</td><td>{{value}}</td></tr>{{/each}}
      </tbody></table>
      </body></html>`);
    return tpl({
      grNumber: gr.grNumber,
      grDate: gr.grDate.toISOString().slice(0, 10),
      shopName: gr.shop.shopName,
      supplierName: gr.supplierName,
      lines: gr.items.map((i) => ({
        code: i.product.productCode,
        qty: i.quantity.toString(),
        rate: i.purchaseRate.toString(),
        value: i.lineValue.toString(),
      })),
    });
  }

  async remove(user: RequestUser, id: string) {
    const existing = await this.get(user, id);
    if (existing.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT goods receipts can be deleted');
    }
    await this.prisma.goodsReceiptHeader.delete({ where: { id } });
    return { ok: true };
  }
}
