import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPoPdfDataFromRecord } from '../../common/pdf/build-po-pdf-data';
import {
  buildPurchaseOrderPrintHtml,
  purchaseOrderPdfFilename,
  renderPurchaseOrderPdfBuffer,
} from '../../common/pdf/purchase-order-pdf';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { DocumentNumberService } from '../stock/document-number.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../billing/subscription.service';
import { RfqsService } from '../rfqs/rfqs.service';
import { getIdempotentResult, setIdempotentResult } from '../../common/utils/idempotency';
import { assertFuture } from '../../common/utils/date-guards';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { MailService } from '../../common/mail/mail.service';
import type { PurchaseOrderEmailContent } from '../../common/mail/purchase-order-supplier.template';
import type { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';

const RECEIPT_INCLUDE = {
  select: {
    status: true,
    items: { select: { productId: true, quantity: true } },
  },
} as const;

const RETURN_INCLUDE = {
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
  private readonly logger = new Logger(PurchaseOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionService,
    private readonly mail: MailService,
    private readonly rfqs: RfqsService,
  ) {}

  private idempotencyScope(user: RequestUser): string {
    if (user.companyId) return `company:${user.companyId}`;
    if (user.shopId) return `shop:${user.shopId}`;
    return 'global';
  }

  private shopScopedServiceCode(shopNumber: string) {
    const safe = shopNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GEN';
    return `SVC-${safe}`;
  }

  private async resolvePoLineProduct(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    line: { productId?: string; lineDescription?: string; lineCategory?: string },
  ) {
    const productId = line.productId?.trim();
    const lineDescription = line.lineDescription?.trim();

    if (productId) {
      return {
        productId,
        lineDescription: lineDescription || null,
        lineCategory: line.lineCategory?.trim() || null,
      };
    }

    if (!lineDescription) {
      throw new BadRequestException('Each line must have a product or a description');
    }

    const shop = await tx.shop.findUnique({
      where: { id: shopId },
      select: { shopNumber: true },
    });
    const serviceCode = this.shopScopedServiceCode(shop?.shopNumber ?? 'GEN');
    let product = await tx.product.findUnique({ where: { productCode: serviceCode } });
    if (!product) {
      product = await tx.product.create({
        data: {
          productCode: serviceCode,
          description: 'Service line (PO)',
          uom: 'EA',
          category: 'Service',
          purchasePrice: new Prisma.Decimal(0),
          sellingPrice: new Prisma.Decimal(0),
          isActive: true,
          createdById: userId,
          plants: {
            create: {
              shopId,
              minStockLevel: new Prisma.Decimal(0),
              isActive: true,
              createdById: userId,
            },
          },
        },
      });
    } else {
      const plant = await tx.productPlant.findFirst({
        where: { productId: product.id, shopId, isActive: true },
      });
      if (!plant) {
        await tx.productPlant.create({
          data: {
            productId: product.id,
            shopId,
            minStockLevel: new Prisma.Decimal(0),
            isActive: true,
            createdById: userId,
          },
        });
      }
    }

    return {
      productId: product.id,
      lineDescription,
      lineCategory: 'Service',
    };
  }

  private async buildPoLineCreates(
    tx: Prisma.TransactionClient,
    shopId: string,
    userId: string,
    items: Array<{
      productId?: string;
      rfqItemId?: string;
      lineDescription?: string;
      lineCategory?: string;
      orderQty: number;
      rate: number;
    }>,
  ) {
    const resolved = [];
    for (const line of items) {
      resolved.push(await this.resolvePoLineProduct(tx, shopId, userId, line));
    }

    const productIds = resolved.map((line) => line.productId);
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
    const lines = [];
    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const meta = resolved[i];
      if (line.orderQty <= 0) throw new BadRequestException('Order qty must be > 0');
      const product = productMap.get(meta.productId);
      if (!product) throw new BadRequestException('Invalid product');
      const currentStock = summaryMap.get(meta.productId) ?? new Prisma.Decimal(0);
      const minStock = product.plants[0]?.minStockLevel ?? new Prisma.Decimal(0);
      const rawSuggested = minStock.mul(new Prisma.Decimal(2)).sub(currentStock);
      const suggested = rawSuggested.lt(0) ? new Prisma.Decimal(0) : rawSuggested;
      const lineValue = new Prisma.Decimal(line.orderQty).mul(new Prisma.Decimal(line.rate));
      total = total.add(lineValue);
      lines.push({
        productId: meta.productId,
        rfqItemId: line.rfqItemId ?? null,
        lineDescription: meta.lineDescription,
        lineCategory: meta.lineCategory,
        currentStock,
        minStock,
        suggestedQty: suggested,
        orderQty: new Prisma.Decimal(line.orderQty),
        rate: new Prisma.Decimal(line.rate),
        lineValue,
        createdById: userId,
      });
    }

    return { lines, total };
  }

  private withLifecycle(
    po: {
      status: PurchaseOrderStatus;
      items: Array<{ productId: string; orderQty: Prisma.Decimal | number }>;
      goodsReceipts?: Array<{ status: string; items?: Array<{ productId: string; quantity: Prisma.Decimal | number }> }>;
      supplierReturns?: Array<{ status: string; items?: Array<{ productId: string; quantity: Prisma.Decimal | number }> }>;
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

    const postedReturns = (po.supplierReturns ?? []).filter((ret) => ret.status === 'POSTED');
    for (const ret of postedReturns) {
      for (const line of ret.items ?? []) {
        const curr = receivedByProduct.get(line.productId) ?? new Prisma.Decimal(0);
        const qty = line.quantity instanceof Prisma.Decimal ? line.quantity : new Prisma.Decimal(line.quantity);
        const next = curr.sub(qty);
        receivedByProduct.set(line.productId, next.lt(0) ? new Prisma.Decimal(0) : next);
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
      rfqId: (base as { rfqId?: string | null }).rfqId ?? null,
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
        rfqItemId: (item as { rfqItemId?: string | null }).rfqItemId ?? null,
        lineDescription: (item as { lineDescription?: string | null }).lineDescription ?? null,
        lineCategory: (item as { lineCategory?: string | null }).lineCategory ?? null,
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
      include: { items: ITEM_WITH_PRODUCT, goodsReceipts: RECEIPT_INCLUDE, supplierReturns: RETURN_INCLUDE },
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
    if (dto.rfqId) {
      const missingRfqItem = dto.items.find((line) => !line.rfqItemId);
      if (missingRfqItem) {
        throw new BadRequestException('rfqItemId is required on each line when rfqId is provided');
      }
      await this.rfqs.assertCanCreatePoFromRfq({
        rfqId: dto.rfqId,
        shopId: dto.shopId,
        items: dto.items.map((line) => ({
          rfqItemId: line.rfqItemId!,
          orderQty: line.orderQty,
        })),
      });
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

      const manualNumber = dto.poNumber?.trim();
      if (manualNumber) {
        const exists = await tx.purchaseOrderHeader.findUnique({ where: { poNumber: manualNumber } });
        if (exists) throw new BadRequestException('PO number already exists');
      }
      const poNumber =
        manualNumber ||
        (await this.numbers.nextShopScopedNumber(tx, {
          shopId: dto.shopId,
          docType: 'PO',
          basePrefix: 'PO',
          date: poDate,
        }));

      const { lines, total } = await this.buildPoLineCreates(tx, dto.shopId, user.id, dto.items);

      const created = await tx.purchaseOrderHeader.create({
        data: {
          poNumber,
          poDate,
          shopId: dto.shopId,
          rfqId: dto.rfqId ?? null,
          contractId: dto.contractId ?? null,
          supplier: dto.supplier.trim(),
          remarks: dto.remarks?.trim(),
          status: dto.confirmOnSend ? PurchaseOrderStatus.CONFIRMED : PurchaseOrderStatus.DRAFT,
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
        supplierReturns: RETURN_INCLUDE,
        supplierBills: { select: { id: true, status: true, totalValue: true, paidValue: true } },
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

    const nextRfqId = dto.rfqId ?? existing.rfqId ?? null;
    if (nextRfqId && dto.items) {
      const missingRfqItem = dto.items.find((line) => !line.rfqItemId);
      if (missingRfqItem) {
        throw new BadRequestException('rfqItemId is required on each line when rfqId is provided');
      }
      await this.rfqs.assertCanCreatePoFromRfq({
        rfqId: nextRfqId,
        shopId: dto.shopId ?? existing.shopId,
        items: dto.items.map((line) => ({
          rfqItemId: line.rfqItemId!,
          orderQty: line.orderQty ?? 0,
        })),
      });
    }

    const poDate = dto.poDate ? new Date(dto.poDate) : new Date(existing.poDate);
    assertFuture(poDate);

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { poHeaderId: id } });
        const shopId = dto.shopId ?? existing.shopId;
        const { lines, total } = await this.buildPoLineCreates(tx, shopId, user.id, dto.items);
        await tx.purchaseOrderItem.createMany({
          data: lines.map((line) => ({ ...line, poHeaderId: id })),
        });
        await tx.purchaseOrderHeader.update({ where: { id }, data: { totalValue: total } });
      }

      const updated = await tx.purchaseOrderHeader.update({
        where: { id },
        data: {
          poDate,
          shopId: dto.shopId ?? undefined,
          rfqId: nextRfqId ?? undefined,
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
    const hasPostedReceipt = (po.receiptProgress ?? []).some((line) => Number(line.receivedQty) > 0);
    if (hasPostedReceipt) {
      throw new BadRequestException('Cannot cancel a purchase order with posted goods receipts');
    }
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
    const shopRow = await this.prisma.shop.findUnique({
      where: { id: po.shopId },
      select: { companyId: true },
    });
    if (!shopRow?.companyId) throw new BadRequestException('Shop not linked to a company');
    return buildPurchaseOrderPrintHtml(await buildPoPdfDataFromRecord(this.prisma, po, shopRow.companyId));
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
      Number.isFinite(value) ? value : 0,
    );
  }

  private buildPoEmailContent(po: ReturnType<PurchaseOrdersService['serialize']> & { shop?: { shopName?: string } }): PurchaseOrderEmailContent {
    const poDate = po.poDate ? new Date(po.poDate) : new Date();
    const lines =
      po.items?.map((line) => ({
        code: line.product?.productCode ?? line.productId,
        description: line.product?.description ?? '',
        quantity: String(line.orderQty),
        uom: line.product?.description ? 'UNIT' : '',
        unitPrice: this.formatMoney(line.rate),
        lineValue: this.formatMoney(line.lineValue),
      })) ?? [];

    const totalValue =
      typeof po.totalValue === 'number'
        ? this.formatMoney(po.totalValue)
        : this.formatMoney(
            lines.reduce((acc, l) => acc + Number.parseFloat(l.lineValue.replace(/[^0-9.-]/g, '') || '0'), 0),
          );

    return {
      supplierName: po.supplier,
      poNumber: po.poNumber,
      poDate: poDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      shopName: po.shop?.shopName ?? '',
      remarks: po.remarks ?? null,
      totalValue,
      companyName: 'Softdigit Consulting',
      lines,
    };
  }

  async sendToSupplier(user: RequestUser, id: string) {
    const po = await this.get(user, id);
    const shopRow = await this.prisma.shop.findUnique({
      where: { id: po.shopId },
      select: { companyId: true },
    });
    if (!shopRow?.companyId) {
      throw new BadRequestException('Shop not linked to a company');
    }
    await this.subscriptions.assertFeature(shopRow.companyId, 'purchase_orders');

    const supplierName = po.supplier.trim();
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        companyId: shopRow.companyId,
        supplierName: { equals: supplierName, mode: 'insensitive' },
      },
      select: { email: true, supplierName: true },
    });
    const email = supplier?.email?.trim();
    if (!email) {
      throw new BadRequestException(
        `Supplier email is missing for "${supplierName}". Open Suppliers, add an email to that supplier, and try again.`,
      );
    }

    const content = this.buildPoEmailContent(po);
    const pdfFilename = purchaseOrderPdfFilename(po.poNumber);
    let attachments: Array<{ filename: string; content: Buffer }> | undefined;
    try {
      const pdfBuffer = await renderPurchaseOrderPdfBuffer(
        await buildPoPdfDataFromRecord(this.prisma, po, shopRow.companyId),
      );
      attachments = [{ filename: pdfFilename, content: pdfBuffer }];
    } catch (err) {
      const message = (err as Error).message ?? 'PDF generation failed';
      this.logger.warn(`PO PDF attachment skipped for ${po.poNumber}: ${message}`);
    }

    if (!this.mail.isConfigured()) {
      throw new BadRequestException(
        'Email is not configured on the server (SMTP_HOST / SMTP_USER / SMTP_PASS). Contact your administrator.',
      );
    }

    await this.mail.sendPurchaseOrderToSupplier({
      to: email,
      content,
      attachments,
    });
    return {
      sent: true,
      to: email,
      attachment: attachments ? pdfFilename : null,
      pdfAttached: Boolean(attachments),
    };
  }
}

