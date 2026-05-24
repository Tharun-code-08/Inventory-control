import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, PurchaseOrderStatus } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { DocumentNumberService } from '../stock/document-number.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../billing/subscription.service';
import { getIdempotentResult, setIdempotentResult } from '../../common/utils/idempotency';
import { assertFuture } from '../../common/utils/date-guards';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import type { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';

const RECEIPT_INCLUDE = {
  select: {
    status: true,
    items: { select: { productId: true, quantity: true } },
  },
} as const;

const ITEM_WITH_PRODUCT = {
  include: {
    product: { select: { id: true, productCode: true, description: true } },
  },
} as const;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  private idempotencyScope(user: RequestUser): string {
    if (user.companyId) return `company:${user.companyId}`;
    if (user.shopId) return `shop:${user.shopId}`;
    return 'global';
  }

  private withLifecycle(
    po: {
      status: PurchaseOrderStatus;
      items: Array<{ productId: string; orderQty: Prisma.Decimal | number }>;
      goodsReceipts?: Array<{ status: string; items?: Array<{ productId: string; quantity: Prisma.Decimal | number }> }>;
    },
  ) {
    if (po.status === PurchaseOrderStatus.CANCELLED) {
      return { ...po, lifecycleStatus: 'CANCELLED', receiptProgress: [] };
    }
    if (po.status === PurchaseOrderStatus.DRAFT) {
      return { ...po, lifecycleStatus: 'DRAFT', receiptProgress: [] };
    }

    const postedReceipts = (po.goodsReceipts ?? []).filter((gr) => gr.status === 'POSTED');
    const receivedByProduct = new Map<string, Prisma.Decimal>();
    for (const gr of postedReceipts) {
      for (const line of gr.items ?? []) {
        const curr = receivedByProduct.get(line.productId) ?? new Prisma.Decimal(0);
        const qty = line.quantity instanceof Prisma.Decimal ? line.quantity : new Prisma.Decimal(line.quantity);
        receivedByProduct.set(line.productId, curr.add(qty));
      }
    }

    const receiptProgress = po.items.map((line) => {
      const ordered = line.orderQty instanceof Prisma.Decimal ? line.orderQty : new Prisma.Decimal(line.orderQty);
      const receivedQty = receivedByProduct.get(line.productId) ?? new Prisma.Decimal(0);
      const remainingQty = ordered.sub(receivedQty);
      return {
        productId: line.productId,
        orderedQty: ordered,
        receivedQty,
        remainingQty: remainingQty.lt(0) ? new Prisma.Decimal(0) : remainingQty,
      };
    });

    const hasAnyReceipt = receiptProgress.some((line) => line.receivedQty.gt(0));
    const fullyReceived = receiptProgress.every((line) => line.remainingQty.eq(0));
    const lifecycleStatus = fullyReceived
      ? 'FULLY_RECEIVED'
      : hasAnyReceipt
        ? 'PARTIALLY_RECEIVED'
        : 'CONFIRMED';

    return { ...po, lifecycleStatus, receiptProgress };
  }

  private serialize(po: ReturnType<PurchaseOrdersService['withLifecycle']>) {
    const base = po as unknown as {
      id: string;
      poNumber: string;
      poDate: Date | string;
      shopId: string;
      contractId?: string | null;
      supplier: string;
      status: PurchaseOrderStatus;
      lifecycleStatus?: string;
      remarks?: string | null;
      currency?: string | null;
      totalValue?: Prisma.Decimal | number | null;
      createdAt: Date | string;
      updatedAt: Date | string;
      shop?: { id: string; shopName?: string; shopNumber?: string; name?: string };
      items: Array<
        {
          id?: string;
          productId: string;
          currentStock: Prisma.Decimal | number;
          minStock: Prisma.Decimal | number;
          suggestedQty: Prisma.Decimal | number;
          orderQty: Prisma.Decimal | number;
          rate: Prisma.Decimal | number;
          lineValue: Prisma.Decimal | number;
          product?: { id: string; productCode: string; description: string };
        }
      >;
    };
    const receiptProgress =
      (po as {
        receiptProgress?: Array<{
          productId: string;
          orderedQty: Prisma.Decimal;
          receivedQty: Prisma.Decimal;
          remainingQty: Prisma.Decimal;
        }>;
      }).receiptProgress ?? [];

    return {
      id: base.id,
      poNumber: base.poNumber,
      poDate: base.poDate instanceof Date ? base.poDate.toISOString() : base.poDate,
      shopId: base.shopId,
      contractId: base.contractId,
      supplier: base.supplier,
      status: base.status,
      lifecycleStatus: (base as { lifecycleStatus?: string }).lifecycleStatus,
      remarks: base.remarks ?? null,
      currency: base.currency,
      totalValue: base.totalValue == null ? null : Number(base.totalValue),
      createdAt: base.createdAt instanceof Date ? base.createdAt.toISOString() : base.createdAt,
      updatedAt: base.updatedAt instanceof Date ? base.updatedAt.toISOString() : base.updatedAt,
      shop: base.shop
        ? {
            id: base.shop.id,
            shopName: base.shop.shopName ?? base.shop.name,
            shopNumber: base.shop.shopNumber ?? undefined,
          }
        : undefined,
      items: base.items.map((item) => ({
        id: item.id ?? `${item.productId}:${String(item.orderQty)}`,
        productId: item.productId,
        currentStock: Number(item.currentStock),
        minStock: Number(item.minStock),
        suggestedQty: Number(item.suggestedQty),
        orderQty: Number(item.orderQty),
        rate: Number(item.rate),
        lineValue: Number(item.lineValue),
        product: item.product
          ? {
              id: item.product.id,
              productCode: item.product.productCode,
              description: item.product.description,
            }
          : undefined,
      })),
      receiptProgress: receiptProgress.map((row) => ({
        productId: row.productId,
        orderedQty: Number(row.orderedQty),
        receivedQty: Number(row.receivedQty),
        remainingQty: Number(row.remainingQty),
      })),
    };
  }

  async list(user: RequestUser, query: ListPurchaseOrdersDto) {
    const take = clampTake(query.limit ?? query.take);
    const page = query.page && query.page > 0 ? query.page : 1;
    const skip = (page - 1) * take;
    const useCursor = Boolean(query.cursor);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.PurchaseOrderHeaderWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { poNumber: { contains: query.search.trim(), mode: 'insensitive' } },
              { supplier: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.PurchaseOrderHeaderOrderByWithRelationInput = useCursor
      ? { id: 'asc' }
      : { poDate: 'desc' };

    const findArgs: Prisma.PurchaseOrderHeaderFindManyArgs = {
      where,
      orderBy,
      include: { items: ITEM_WITH_PRODUCT, goodsReceipts: RECEIPT_INCLUDE },
      take: useCursor ? take + 1 : take,
      ...(useCursor
        ? {
            cursor: query.cursor ? { id: query.cursor } : undefined,
            skip: query.cursor ? 1 : undefined,
          }
        : { skip }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrderHeader.findMany(findArgs),
      this.prisma.purchaseOrderHeader.count({ where }),
    ]);

    const cursorMeta = buildMeta(rows, take);
    const items = useCursor ? cursorMeta.items : rows;
    const nextCursor = useCursor ? cursorMeta.meta.nextCursor : null;
    const totalPages = Math.max(1, Math.ceil(total / take));
    return {
      data: items.map((po) => this.serialize(this.withLifecycle(po as any))),
      meta: {
        nextCursor,
        limit: take,
        total,
        page,
        totalPages,
        hasMore: useCursor ? cursorMeta.meta.hasMore : page < totalPages,
      },
    };
  }

  async create(user: RequestUser, dto: CreatePurchaseOrderDto) {
    assertShopScope(user, dto.shopId);
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { companyId: true },
    });
    if (shop?.companyId) {
      await this.subscriptions.assertFeature(shop.companyId, 'purchase_orders');
    }
    const poDate = new Date(dto.poDate);
    assertFuture(poDate);
    const idempotencyScope = this.idempotencyScope(user);

    return this.prisma.$transaction(async (tx) => {
      const existing = await getIdempotentResult<{ poId: string }>(
        tx,
        dto.idempotencyKey ? `po:create:${dto.idempotencyKey}` : undefined,
        idempotencyScope,
      );
      if (existing?.poId) {
        const prior = await tx.purchaseOrderHeader.findUnique({
          where: { id: existing.poId },
          include: { items: ITEM_WITH_PRODUCT, shop: true },
        });
        if (prior) return this.serialize(this.withLifecycle(prior as any));
      }

      const poNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: dto.shopId,
        docType: 'PO',
        basePrefix: 'PO',
        date: poDate,
      });

      const productIds = dto.items.map((line) => line.productId);
      // We need to know each product is assigned to dto.shopId before we
      // accept it on the PO, and we need that plant's minStockLevel for
      // suggested-qty math. Fetch the product master + the matching plant
      // assignment in a single round-trip per product.
      const [products, summaries] = await Promise.all([
        tx.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            plants: {
              where: { shopId: dto.shopId, isActive: true },
              select: { minStockLevel: true },
              take: 1,
            },
          },
        }),
        tx.stockSummary.findMany({
          where: { shopId: dto.shopId, productId: { in: productIds } },
          select: { productId: true, currentStock: true },
        }),
      ]);
      const productMap = new Map(products.map((p) => [p.id, p]));
      const summaryMap = new Map(summaries.map((s) => [s.productId, s.currentStock]));

      let total = new Prisma.Decimal(0);
      const lines = [];
      for (const line of dto.items) {
        if (line.orderQty <= 0) throw new BadRequestException('Order qty must be > 0');
        const product = productMap.get(line.productId);
        if (!product) throw new BadRequestException('Invalid product');
        if (product.plants.length === 0) {
          throw new BadRequestException(
            'Product is not assigned (or is deactivated) for this plant',
          );
        }
        const currentStock = summaryMap.get(line.productId) ?? new Prisma.Decimal(0);
        const minStock = product.plants[0]!.minStockLevel;
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

      const created = await tx.purchaseOrderHeader.create({
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
        include: { items: ITEM_WITH_PRODUCT, shop: true },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'PURCHASE_ORDER',
          entityId: created.id,
          newValues: {
            poNumber: created.poNumber,
            shopId: created.shopId,
            supplier: created.supplier,
            totalValue: created.totalValue?.toString() ?? null,
            itemCount: created.items.length,
          },
        },
        tx,
      );
      await setIdempotentResult(
        tx,
        dto.idempotencyKey,
        { poId: created.id },
        user.id,
        idempotencyScope,
      );
      return this.serialize(this.withLifecycle(created as any));
    });
  }

  async get(user: RequestUser, id: string) {
    const po = await this.prisma.purchaseOrderHeader.findUnique({
      where: { id },
      include: {
        items: ITEM_WITH_PRODUCT,
        shop: { select: { id: true, shopName: true, shopNumber: true } },
        goodsReceipts: { ...RECEIPT_INCLUDE, orderBy: { grDate: 'asc' } },
      },
    });
    if (!po) throw new NotFoundException('Not found');
    assertShopScope(user, po.shopId);
    return this.serialize(this.withLifecycle(po as any));
  }

  async update(user: RequestUser, id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.get(user, id);
    if (existing.status !== PurchaseOrderStatus.DRAFT) throw new BadRequestException('Only DRAFT can be edited');
    if (dto.shopId) assertShopScope(user, dto.shopId);

    const poDate = dto.poDate ? new Date(dto.poDate) : new Date(existing.poDate);
    assertFuture(poDate);

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { poHeaderId: id } });
        const shopId = dto.shopId ?? existing.shopId;
        const productIds = dto.items.map((line) => line.productId);
        const [products, summaries] = await Promise.all([
          tx.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              plants: {
                where: { shopId, isActive: true },
                select: { minStockLevel: true },
                take: 1,
              },
            },
          }),
          tx.stockSummary.findMany({
            where: { shopId, productId: { in: productIds } },
            select: { productId: true, currentStock: true },
          }),
        ]);
        const productMap = new Map(products.map((p) => [p.id, p]));
        const summaryMap = new Map(summaries.map((s) => [s.productId, s.currentStock]));

        let total = new Prisma.Decimal(0);
        const creates = [];
        for (const line of dto.items) {
          if (line.orderQty <= 0) throw new BadRequestException('Order qty must be > 0');
          const product = productMap.get(line.productId);
          if (!product) throw new BadRequestException('Invalid product');
          if (product.plants.length === 0) {
            throw new BadRequestException(
              'Product is not assigned (or is deactivated) for this plant',
            );
          }
          const currentStock = summaryMap.get(line.productId) ?? new Prisma.Decimal(0);
          const minStock = product.plants[0]!.minStockLevel;
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

      const updated = await tx.purchaseOrderHeader.update({
        where: { id },
        data: {
          poDate,
          shopId: dto.shopId ?? undefined,
          supplier: dto.supplier?.trim(),
          remarks: dto.remarks?.trim(),
          updatedById: user.id,
        },
        include: { items: ITEM_WITH_PRODUCT },
      });
      return this.serialize(this.withLifecycle(updated as any));
    });
  }

  async confirm(user: RequestUser, id: string, idempotencyKey?: string) {
    const po = await this.get(user, id);
    if (po.status === PurchaseOrderStatus.CONFIRMED) return po;
    if (po.status !== PurchaseOrderStatus.DRAFT) throw new BadRequestException('Invalid status');
    const idempotencyScope = this.idempotencyScope(user);
    return this.prisma.$transaction(async (tx) => {
      const cacheKey = idempotencyKey ? `${id}:${idempotencyKey}` : undefined;
      const existing = await getIdempotentResult<{ poId: string }>(tx, cacheKey, idempotencyScope);
      if (existing?.poId) {
        const prior = await tx.purchaseOrderHeader.findUnique({
          where: { id: existing.poId },
          include: { items: ITEM_WITH_PRODUCT },
        });
        if (prior) return this.serialize(this.withLifecycle(prior as any));
      }

      // Atomic transition: only one confirm can win.
      const transitioned = await tx.purchaseOrderHeader.updateMany({
        where: { id, status: PurchaseOrderStatus.DRAFT },
        data: { status: PurchaseOrderStatus.CONFIRMED, updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new BadRequestException('Purchase order is not in DRAFT state');
      }

      const updated = await tx.purchaseOrderHeader.findUniqueOrThrow({
        where: { id },
        include: { items: ITEM_WITH_PRODUCT },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'PURCHASE_ORDER',
          entityId: updated.id,
          oldValues: { status: po.status },
          newValues: { status: updated.status },
        },
        tx,
      );
      await setIdempotentResult(tx, cacheKey, { poId: updated.id }, user.id, idempotencyScope);
      return this.serialize(this.withLifecycle(updated as any));
    });
  }

  async cancel(user: RequestUser, id: string, idempotencyKey?: string) {
    const po = await this.get(user, id);
    if (po.status === PurchaseOrderStatus.CANCELLED) return po;
    const idempotencyScope = this.idempotencyScope(user);
    return this.prisma.$transaction(async (tx) => {
      const cacheKey = idempotencyKey ? `${id}:${idempotencyKey}` : undefined;
      const existing = await getIdempotentResult<{ poId: string }>(tx, cacheKey, idempotencyScope);
      if (existing?.poId) {
        const prior = await tx.purchaseOrderHeader.findUnique({
          where: { id: existing.poId },
          include: { items: ITEM_WITH_PRODUCT },
        });
        if (prior) return this.serialize(this.withLifecycle(prior as any));
      }

      const transitioned = await tx.purchaseOrderHeader.updateMany({
        where: { id, status: { not: PurchaseOrderStatus.CANCELLED } },
        data: { status: PurchaseOrderStatus.CANCELLED, updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new BadRequestException('Purchase order is already cancelled');
      }

      const updated = await tx.purchaseOrderHeader.findUniqueOrThrow({
        where: { id },
        include: { items: ITEM_WITH_PRODUCT },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'PURCHASE_ORDER',
          entityId: updated.id,
          oldValues: { status: po.status },
          newValues: { status: updated.status },
        },
        tx,
      );
      await setIdempotentResult(tx, cacheKey, { poId: updated.id }, user.id, idempotencyScope);
      return this.serialize(this.withLifecycle(updated as any));
    });
  }

  async printHtml(user: RequestUser, id: string) {
    const po = await this.get(user, id);
    const poDate = new Date(po.poDate);
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
      d: poDate.toISOString().slice(0, 10),
      shop: po.shop?.shopName ?? '',
      supplier: po.supplier,
      lines: po.items.map((i) => ({
        code: i.product?.productCode ?? i.productId,
        qty: String(i.orderQty),
        rate: String(i.rate),
        value: String(i.lineValue),
      })),
    });
  }
}

