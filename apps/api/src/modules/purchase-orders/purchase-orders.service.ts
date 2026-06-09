import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { DocumentEmailService } from '../document-email/document-email.service';
import { DocumentEmailTrigger } from '@prisma/client';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { verifyShopInTenant } from '../../common/utils/shop-access';
import { auditRequestMetadata } from '../../common/utils/audit-context';
import { assertPoAction } from '../../common/state-machines/assert-action';
import { assertPoTransition } from '../../common/state-machines/assert-transition';
import {
  buildDocumentActionAudit,
  buildStatusTransitionAudit,
} from '../../common/state-machines/document-audit';
import { PurchaseOrderAction } from '../../common/state-machines/document-actions';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { DocumentNumberService } from '../stock/document-number.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionService } from '../billing/subscription.service';
import { RfqsService } from '../rfqs/rfqs.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { purchaseOrderDefaults } from '../email-notifications/email-notifications.outbound';
import {
  getIdempotentResult,
  setIdempotentResult,
  tryGetIdempotentResult,
  trySetIdempotentResult,
} from '../../common/utils/idempotency';
import { assertNotFuture } from '../../common/utils/date-guards';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
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

function isUniqueViolationForFields(error: unknown, fields: string[]): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = Array.isArray((error.meta as { target?: unknown })?.target)
    ? ((error.meta as { target?: unknown[] }).target ?? [])
    : [];
  return fields.some((field) => target.includes(field));
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly subscriptions: SubscriptionService,
    private readonly rfqs: RfqsService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly documentPdf: DocumentPdfService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  private idempotencyScope(user: RequestUser): string {
    if (user.companyId) return `company:${user.companyId}`;
    if (user.shopId) return `shop:${user.shopId}`;
    return 'global';
  }

  private createIdempotencyKey(idempotencyKey?: string) {
    return idempotencyKey?.trim() ? `po:create:${idempotencyKey.trim()}` : undefined;
  }

  private shopScopedServiceCode(shopNumber: string) {
    const safe = shopNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'GEN';
    return `SVC-${safe}`;
  }

  private auditMeta() {
    return auditRequestMetadata();
  }

  private async getPoDownstreamLinks(poId: string) {
    const [goodsReceiptCount, supplierBillCount, supplierPaymentCount, supplierReturnCount] =
      await Promise.all([
        this.prisma.goodsReceiptHeader.count({ where: { purchaseOrderId: poId } }),
        this.prisma.supplierBillHeader.count({ where: { purchaseOrderId: poId } }),
        this.prisma.supplierPayment.count({
          where: { supplierBill: { purchaseOrderId: poId } },
        }),
        this.prisma.supplierReturn.count({ where: { purchaseOrderId: poId } }),
      ]);
    return {
      goodsReceiptCount,
      supplierBillCount,
      supplierPaymentCount,
      supplierReturnCount,
      hasFinancialLinks:
        goodsReceiptCount > 0 ||
        supplierBillCount > 0 ||
        supplierPaymentCount > 0 ||
        supplierReturnCount > 0,
    };
  }

  private async assertPoMutationAllowed(args: {
    poId: string;
    action: 'update' | 'cancel';
    existing: ReturnType<PurchaseOrdersService['serialize']>;
    dto?: UpdatePurchaseOrderDto;
  }) {
    const links = await this.getPoDownstreamLinks(args.poId);
    if (!links.hasFinancialLinks) return;

    if (args.action === 'cancel') {
      const parts: string[] = [];
      if (links.goodsReceiptCount > 0) parts.push(`${links.goodsReceiptCount} goods receipt(s)`);
      if (links.supplierBillCount > 0) parts.push(`${links.supplierBillCount} supplier bill(s)`);
      if (links.supplierPaymentCount > 0) parts.push(`${links.supplierPaymentCount} payment(s)`);
      if (links.supplierReturnCount > 0) parts.push(`${links.supplierReturnCount} supplier return(s)`);
      throw new BadRequestException(
        `Cannot cancel this purchase order because downstream documents exist: ${parts.join(', ')}.`,
      );
    }

    const dto = args.dto ?? {};
    if (dto.supplier?.trim() && dto.supplier.trim() !== args.existing.supplier) {
      throw new BadRequestException(
        'Cannot change supplier because this purchase order is linked to goods receipts, bills, or payments.',
      );
    }
    if (dto.rfqId !== undefined && (dto.rfqId ?? null) !== (args.existing.rfqId ?? null)) {
      throw new BadRequestException(
        'Cannot change RFQ link because this purchase order is linked to goods receipts, bills, or payments.',
      );
    }
    if (dto.items) {
      throw new BadRequestException(
        'Cannot change line items because this purchase order is linked to goods receipts, bills, or payments.',
      );
    }
    if (dto.shopId && dto.shopId !== args.existing.shopId) {
      throw new BadRequestException(
        'Cannot change delivery plant because this purchase order is linked to goods receipts, bills, or payments.',
      );
    }
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
      if (line.rate <= 0) throw new BadRequestException('Rate must be > 0');
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
      items: Array<{
        productId: string;
        orderQty: Prisma.Decimal | number;
        product?: { productCode?: string | null } | null;
      }>;
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
        productCode: line.product?.productCode ?? null,
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
          productCode?: string | null;
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
        productCode: row.productCode ?? undefined,
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
    const orderBy: Prisma.PurchaseOrderHeaderOrderByWithRelationInput | Prisma.PurchaseOrderHeaderOrderByWithRelationInput[] = useCursor
      ? { id: 'asc' }
      : [{ poDate: 'desc' }, { createdAt: 'desc' }];

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
    await verifyShopInTenant(this.prisma, user, dto.shopId);
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: { companyId: true },
    });
    if (shop?.companyId) {
      await this.subscriptions.assertFeature(shop.companyId, 'purchase_orders');
    }
    const poDate = new Date(dto.poDate);
    assertNotFuture(poDate, 'PO date');
    const idempotencyScope = this.idempotencyScope(user);
    const idempotencyCacheKey = this.createIdempotencyKey(dto.idempotencyKey);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tryGetIdempotentResult<{ poId: string }>(
        tx,
        idempotencyCacheKey,
        idempotencyScope,
      );
      if (existing?.poId) {
        const prior = await tx.purchaseOrderHeader.findUnique({
          where: { id: existing.poId },
          include: { items: ITEM_WITH_PRODUCT, shop: true },
        });
        if (prior) return this.serialize(this.withLifecycle(prior as any));
      }

      if (dto.rfqId) {
        const missingRfqItem = dto.items.find((line) => !line.rfqItemId);
        if (missingRfqItem) {
          throw new BadRequestException('rfqItemId is required on each line when rfqId is provided');
        }
        await this.rfqs.assertCanCreatePoFromRfq({
          tx,
          rfqId: dto.rfqId,
          shopId: dto.shopId,
          supplierName: dto.supplier,
          items: dto.items.map((line) => ({
            rfqItemId: line.rfqItemId!,
            orderQty: line.orderQty,
          })),
        });
      }

      const manualNumber = dto.poNumber?.trim();
      if (manualNumber) {
        const exists = await tx.purchaseOrderHeader.findUnique({ where: { poNumber: manualNumber } });
        if (exists) throw new BadRequestException('PO number already exists');
      }
      const { lines, total } = await this.buildPoLineCreates(tx, dto.shopId, user.id, dto.items);
      let created: any = null;
      const maxAttempts = manualNumber ? 1 : 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const poNumber =
          manualNumber ||
          (await this.numbers.nextConfiguredShopScopedNumber(tx, {
            shopId: dto.shopId,
            docType: 'PO',
            date: poDate,
          }));
        try {
          created = await tx.purchaseOrderHeader.create({
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
          break;
        } catch (error) {
          const canRetry =
            !manualNumber &&
            attempt < maxAttempts &&
            isUniqueViolationForFields(error, ['po_number', 'poNumber']);
          if (canRetry) continue;
          throw error;
        }
      }
      if (!created) {
        throw new BadRequestException('Unable to reserve a unique PO number. Please retry.');
      }
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'PURCHASE_ORDER',
          entityId: created.id,
          ...this.auditMeta(),
          newValues: {
            poNumber: created.poNumber,
            shopId: created.shopId,
            supplier: created.supplier,
            rfqId: created.rfqId ?? null,
            totalValue: created.totalValue?.toString() ?? null,
            itemCount: created.items.length,
            status: created.status,
          },
        },
        tx,
      );
      if (created.status === PurchaseOrderStatus.CONFIRMED) {
        await this.audit.log(
          buildStatusTransitionAudit({
            userId: user.id,
            entityType: 'PURCHASE_ORDER',
            entityId: created.id,
            fromStatus: PurchaseOrderStatus.DRAFT,
            toStatus: PurchaseOrderStatus.CONFIRMED,
            reason: dto.confirmOnSend ? 'confirmOnSend' : null,
            action: AuditAction.POST,
          }),
          tx,
        );
      }
      await trySetIdempotentResult(
        tx,
        idempotencyCacheKey,
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
    await verifyShopInTenant(this.prisma, user, po.shopId);
    return this.serialize(this.withLifecycle(po as any));
  }

  async update(user: RequestUser, id: string, dto: UpdatePurchaseOrderDto) {
    const existing = await this.get(user, id);
    assertPoAction(existing.status, PurchaseOrderAction.EDIT);
    if (dto.shopId) {
      assertShopScope(user, dto.shopId);
      await verifyShopInTenant(this.prisma, user, dto.shopId);
    }
    const expectedUpdatedAt = dto.ifUnmodifiedSince ? new Date(dto.ifUnmodifiedSince) : null;
    if (expectedUpdatedAt && Number.isNaN(expectedUpdatedAt.getTime())) {
      throw new BadRequestException('Invalid optimistic lock timestamp');
    }

    const nextRfqId = dto.rfqId ?? existing.rfqId ?? null;
    await this.assertPoMutationAllowed({ poId: id, action: 'update', existing, dto });

    const poDate = dto.poDate ? new Date(dto.poDate) : new Date(existing.poDate);
    assertNotFuture(poDate, 'PO date');

    return this.prisma.$transaction(async (tx) => {
      if (expectedUpdatedAt) {
        const claimed = await tx.purchaseOrderHeader.updateMany({
          where: { id, updatedAt: expectedUpdatedAt },
          data: { updatedById: user.id },
        });
        if (claimed.count === 0) {
          throw new ConflictException(
            'Purchase order has been modified by another user. Refresh and try again.',
          );
        }
      }

      const shopId = dto.shopId ?? existing.shopId;
      if (nextRfqId) {
        const validationLines = (dto.items ?? existing.items).map((line) => ({
          rfqItemId: line.rfqItemId ?? undefined,
          orderQty: Number(line.orderQty ?? 0),
        }));
        const missingRfqItem = validationLines.find((line) => !line.rfqItemId);
        if (missingRfqItem) {
          throw new BadRequestException('rfqItemId is required on each line when rfqId is provided');
        }
        await this.rfqs.assertCanCreatePoFromRfq({
          tx,
          rfqId: nextRfqId,
          shopId,
          supplierName: dto.supplier ?? existing.supplier,
          excludePoHeaderId: id,
          items: validationLines.map((line) => ({
            rfqItemId: line.rfqItemId!,
            orderQty: line.orderQty,
          })),
        });
      } else if ((dto.items ?? []).some((line) => Boolean(line.rfqItemId))) {
        throw new BadRequestException('rfqItemId can only be used when rfqId is provided');
      }

      if (dto.items) {
        await tx.purchaseOrderItem.deleteMany({ where: { poHeaderId: id } });
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
      await this.audit.log({
        userId: user.id,
        action: AuditAction.UPDATE,
        entityType: 'PURCHASE_ORDER',
        entityId: updated.id,
        ...this.auditMeta(),
        oldValues: {
          poDate: existing.poDate,
          shopId: existing.shopId,
          rfqId: existing.rfqId ?? null,
          supplier: existing.supplier,
          remarks: existing.remarks ?? null,
        },
        newValues: {
          poDate: updated.poDate.toISOString(),
          shopId: updated.shopId,
          rfqId: updated.rfqId ?? null,
          supplier: updated.supplier,
          remarks: updated.remarks ?? null,
        },
      });
      return this.serialize(this.withLifecycle(updated as any));
    });
  }

  async confirm(user: RequestUser, id: string, idempotencyKey?: string) {
    const po = await this.get(user, id);
    if (po.status === PurchaseOrderStatus.CONFIRMED) return po;
    assertPoAction(po.status, PurchaseOrderAction.CONFIRM);
    assertPoTransition(po.status, PurchaseOrderStatus.CONFIRMED);
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
        buildStatusTransitionAudit({
          userId: user.id,
          entityType: 'PURCHASE_ORDER',
          entityId: updated.id,
          fromStatus: po.status,
          toStatus: updated.status,
          action: AuditAction.POST,
        }),
        tx,
      );
      await setIdempotentResult(tx, cacheKey, { poId: updated.id }, user.id, idempotencyScope);
      return this.serialize(this.withLifecycle(updated as any));
    });
  }

  async cancel(user: RequestUser, id: string, idempotencyKey?: string) {
    const po = await this.get(user, id);
    if (po.status === PurchaseOrderStatus.CANCELLED) return po;
    assertPoAction(po.status, PurchaseOrderAction.CANCEL);
    assertPoTransition(po.status, PurchaseOrderStatus.CANCELLED);
    await this.assertPoMutationAllowed({ poId: id, action: 'cancel', existing: po });
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
        where: {
          id,
          status: { in: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CONFIRMED] },
        },
        data: { status: PurchaseOrderStatus.CANCELLED, updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new BadRequestException('Purchase order cannot be cancelled in its current state');
      }

      const updated = await tx.purchaseOrderHeader.findUniqueOrThrow({
        where: { id },
        include: { items: ITEM_WITH_PRODUCT },
      });
      await this.audit.log(
        buildStatusTransitionAudit({
          userId: user.id,
          entityType: 'PURCHASE_ORDER',
          entityId: updated.id,
          fromStatus: po.status,
          toStatus: updated.status,
          reason: 'cancel',
        }),
        tx,
      );
      await setIdempotentResult(tx, cacheKey, { poId: updated.id }, user.id, idempotencyScope);
      return this.serialize(this.withLifecycle(updated as any));
    });
  }

  async printHtml(user: RequestUser, id: string) {
    return this.documentPdf.buildPurchaseOrderPrintHtml(user, id);
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(
      Number.isFinite(value) ? value : 0,
    );
  }

  private buildPoEmailContent(
    po: ReturnType<PurchaseOrdersService['serialize']> & { shop?: { shopName?: string } },
    companyName: string,
  ): PurchaseOrderEmailContent {
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
      companyName,
      lines,
    };
  }

  async assertCancelAllowed(user: RequestUser, poId: string) {
    const po = await this.get(user, poId);
    if (po.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Purchase order is already cancelled');
    }
    assertPoAction(po.status, PurchaseOrderAction.CANCEL);
    await this.assertPoMutationAllowed({ poId, action: 'cancel', existing: po });
    return po;
  }

  async sendToSupplierSafe(user: RequestUser, id: string, options?: { resend?: boolean }) {
    try {
      return await this.sendToSupplier(user, id, options);
    } catch (err) {
      const message =
        err instanceof BadRequestException
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Email could not be queued';
      try {
        await this.audit.log(
          buildDocumentActionAudit({
            userId: user.id,
            entityType: 'PURCHASE_ORDER',
            entityId: id,
            action: options?.resend ? 'RESEND_PO' : 'SEND_PO',
            result: 'failure',
            detail: { message },
          }),
        );
      } catch {
        // Best-effort action audit; do not mask the original failure payload.
      }
      return {
        sent: false,
        queued: false,
        to: '',
        attachment: null,
        pdfAttached: false,
        emailStatus: 'failed',
        message,
      };
    }
  }

  async sendToSupplier(user: RequestUser, id: string, options?: { resend?: boolean }) {
    const po = await this.get(user, id);
    assertPoAction(po.status, PurchaseOrderAction.SEND);
    const shopRow = await this.prisma.shop.findUnique({
      where: { id: po.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
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

    const content = this.buildPoEmailContent(po, shopRow.company?.companyName ?? 'Company');
    const defaults = purchaseOrderDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      po.shopId,
      'purchase_order_supplier',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Purchase order email notifications are disabled in settings.');
    }

    const trigger = options?.resend ? DocumentEmailTrigger.RESEND : DocumentEmailTrigger.MANUAL;

    const result = await this.documentEmail.sendPurchaseOrderEmail(user, {
      poId: id,
      companyId: shopRow.companyId,
      shopId: po.shopId,
      recipient: email,
      content,
      prepared,
      documentNumber: po.poNumber,
      trigger,
    });

    await this.audit.log(
      buildDocumentActionAudit({
        userId: user.id,
        entityType: 'PURCHASE_ORDER',
        entityId: id,
        action: options?.resend ? 'RESEND_PO' : 'SEND_PO',
        result: 'success',
        detail: {
          queued: result.queued ?? false,
          sent: result.sent ?? false,
          recipient: email,
        },
      }),
    );

    return result;
  }
}

