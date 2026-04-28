import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
  ) {}

  private assertNotFuture(date: Date) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date.getTime() > today.getTime()) {
      throw new BadRequestException('Document date cannot be in the future');
    }
  }

  async list(user: RequestUser, query: { shop_id?: string; cursor?: string; take?: number }) {
    const take = clampTake(query.take);
    const shopScope = defaultShopFilter(user);
    const shopId = shopScope ?? query.shop_id;
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.PurchaseOrderHeaderWhereInput = {};
    if (shopId) where.shopId = shopId;

    const rows = await this.prisma.purchaseOrderHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      include: { shop: true },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async create(user: RequestUser, dto: CreatePurchaseOrderDto) {
    assertShopScope(user, dto.shopId);
    const poDate = new Date(dto.poDate);
    this.assertNotFuture(poDate);

    return this.prisma.$transaction(async (tx) => {
      const poNumber = await this.numbers.nextNumber(tx, {
        shopId: dto.shopId,
        docType: 'PO',
        prefix: 'PO',
        date: poDate,
      });

      let total = new Prisma.Decimal(0);
      const lines = [];
      for (const line of dto.items) {
        if (line.orderQty <= 0) throw new BadRequestException('Order qty must be > 0');
        const product = await tx.product.findUnique({ where: { id: line.productId } });
        if (!product || product.shopId !== dto.shopId) throw new BadRequestException('Invalid product');
        const summary = await tx.stockSummary.findUnique({
          where: { shopId_productId: { shopId: dto.shopId, productId: line.productId } },
        });
        const currentStock = summary?.currentStock ?? new Prisma.Decimal(0);
        const minStock = product.minStockLevel;
        const rawSuggested = minStock.mul(new Prisma.Decimal(2)).sub(currentStock);
        const suggested = rawSuggested.lt(0) ? new Prisma.Decimal(0) : rawSuggested;
        const lineValue = new Prisma.Decimal(line.orderQty).mul(new Prisma.Decimal(line.rate));
        total = total.add(lineValue);
        lines.push({
          productId: line.productId,
          currentStock,
          minStock,
          suggestedQty: suggested,
          orderQty: new Prisma.Decimal(line.orderQty),
          rate: new Prisma.Decimal(line.rate),
          lineValue,
          createdById: user.id,
        });
      }

      return tx.purchaseOrderHeader.create({
        data: {
          poNumber,
          poDate,
          shopId: dto.shopId,
          contractId: dto.contractId ?? null,
          supplier: dto.supplier.trim(),
          remarks: dto.remarks?.trim(),
          status: PurchaseOrderStatus.DRAFT,
          totalValue: total,
          createdById: user.id,
          items: { create: lines },
        },
        include: { items: { include: { product: true } }, shop: true },
      });
    });
  }

  async get(user: RequestUser, id: string) {
    const po = await this.prisma.purchaseOrderHeader.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, shop: true },
    });
    if (!po) throw new NotFoundException('Not found');
    assertShopScope(user, po.shopId);
    return po;
  }

  async update(user: RequestUser, id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.get(user, id);
    if (existing.status !== PurchaseOrderStatus.DRAFT) throw new BadRequestException('Only DRAFT can be edited');
    if (dto.shopId) assertShopScope(user, dto.shopId);

    const poDate = dto.poDate ? new Date(dto.poDate) : existing.poDate;
    this.assertNotFuture(poDate);

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { poHeaderId: id } });
        let total = new Prisma.Decimal(0);
        const creates = [];
        for (const line of dto.items) {
          if (line.orderQty <= 0) throw new BadRequestException('Order qty must be > 0');
          const shopId = dto.shopId ?? existing.shopId;
          const product = await tx.product.findUnique({ where: { id: line.productId } });
          if (!product || product.shopId !== shopId) throw new BadRequestException('Invalid product');
          const summary = await tx.stockSummary.findUnique({
            where: { shopId_productId: { shopId, productId: line.productId } },
          });
          const currentStock = summary?.currentStock ?? new Prisma.Decimal(0);
          const minStock = product.minStockLevel;
          const rawSuggested = minStock.mul(new Prisma.Decimal(2)).sub(currentStock);
          const suggested = rawSuggested.lt(0) ? new Prisma.Decimal(0) : rawSuggested;
          const lineValue = new Prisma.Decimal(line.orderQty).mul(new Prisma.Decimal(line.rate));
          total = total.add(lineValue);
          creates.push({
            poHeaderId: id,
            productId: line.productId,
            currentStock,
            minStock,
            suggestedQty: suggested,
            orderQty: new Prisma.Decimal(line.orderQty),
            rate: new Prisma.Decimal(line.rate),
            lineValue,
            createdById: user.id,
          });
        }
        await tx.purchaseOrderItem.createMany({ data: creates });
        await tx.purchaseOrderHeader.update({ where: { id }, data: { totalValue: total } });
      }

      return tx.purchaseOrderHeader.update({
        where: { id },
        data: {
          poDate,
          shopId: dto.shopId ?? undefined,
          supplier: dto.supplier?.trim(),
          remarks: dto.remarks?.trim(),
          updatedById: user.id,
        },
        include: { items: { include: { product: true } }, shop: true },
      });
    });
  }

  async confirm(user: RequestUser, id: string) {
    const po = await this.get(user, id);
    if (po.status !== PurchaseOrderStatus.DRAFT) throw new BadRequestException('Invalid status');
    return this.prisma.purchaseOrderHeader.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CONFIRMED, updatedById: user.id },
      include: { items: { include: { product: true } }, shop: true },
    });
  }

  async cancel(user: RequestUser, id: string) {
    const po = await this.get(user, id);
    if (po.status === PurchaseOrderStatus.CANCELLED) throw new BadRequestException('Already cancelled');
    return this.prisma.purchaseOrderHeader.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED, updatedById: user.id },
      include: { items: { include: { product: true } }, shop: true },
    });
  }

  async printHtml(user: RequestUser, id: string) {
    const po = await this.get(user, id);
    const tpl = Handlebars.compile(`<!doctype html><html><head><meta charset="utf-8"><title>{{no}}</title>
      <style>body{font-family:Arial;padding:24px} table{width:100%;border-collapse:collapse} td,th{border:1px solid #ccc;padding:8px}</style>
      </head><body>
      <h2>Purchase Order {{no}}</h2>
      <p>Date: {{d}} | Shop: {{shop}} | Supplier: {{supplier}}</p>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Value</th></tr></thead><tbody>
      {{#each lines}}<tr><td>{{code}}</td><td>{{qty}}</td><td>{{rate}}</td><td>{{value}}</td></tr>{{/each}}
      </tbody></table>
      </body></html>`);
    return tpl({
      no: po.poNumber,
      d: po.poDate.toISOString().slice(0, 10),
      shop: po.shop.shopName,
      supplier: po.supplier,
      lines: po.items.map((i) => ({
        code: i.product.productCode,
        qty: i.orderQty.toString(),
        rate: i.rate.toString(),
        value: i.lineValue.toString(),
      })),
    });
  }
}
