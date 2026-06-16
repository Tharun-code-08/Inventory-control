import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AlertType, AuditAction, CostingMethod, DocumentEmailTrigger, DocumentStatus, NotificationModule, NotificationPriority, Prisma, RoleName, TransactionType } from '@prisma/client';
import { NotificationService } from '../notifications/services/notification.service';
import * as Handlebars from 'handlebars';
import { formatEmailDate, formatEmailMoney } from '../../common/mail/email-formatters';
import type { GoodsReceiptSupplierEmailContent } from '../../common/mail/transactional-email.templates';
import { DocumentPdfService } from '../../common/pdf/document-pdf.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { assertNotFuture } from '../../common/utils/date-guards';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
import { CostingService } from '../stock/costing.service';
import { DocumentAlreadyPostedException } from '../../common/exceptions/domain.exceptions';
import { AuditService } from '../audit/audit.service';
import { runSerializableTxWithRetry } from '../../common/utils/serializable-tx';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { goodsReceiptSupplierDefaults } from '../email-notifications/email-notifications.outbound';
import { DocumentEmailService } from '../document-email/document-email.service';
import { assertGrAction } from '../../common/state-machines/assert-action';
import { assertGrTransition } from '../../common/state-machines/assert-transition';
import { GrAction } from '../../common/state-machines/document-actions';
import { buildStatusTransitionAudit } from '../../common/state-machines/document-audit';
import { buildReceiveGoodsAudit } from '../../common/state-machines/inventory-audit';
import { assertGrMutationAllowed } from '../../common/utils/procurement-downstream';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly costing: CostingService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly documentPdf: DocumentPdfService,
    private readonly documentEmail: DocumentEmailService,
    private readonly notifications: NotificationService,
  ) {}

  private async assertStorageLocationsForShop(
    shopId: string,
    items: Array<{ storageLocationId: string }>,
  ) {
    for (const line of items) {
      const location = await this.prisma.storageLocation.findFirst({
        where: { id: line.storageLocationId, shopId, isActive: true },
      });
      if (!location) {
        throw new BadRequestException('Invalid storage location for this plant');
      }
    }
  }

  private async validateAgainstPurchaseOrder(
    tx: Prisma.TransactionClient,
    headerId: string | null,
    purchaseOrderId: string,
    items: Array<{ productId: string; quantity: Prisma.Decimal }>,
  ) {
    // Serialize concurrent receipt validations against the same PO so two
    // posts cannot both pass the partial-receipt guard and over-receive.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'po:' + purchaseOrderId}::text))`;

    const po = await tx.purchaseOrderHeader.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });
    if (!po) {
      throw new BadRequestException('Purchase order not found');
    }
    const poLifecycle = (po as { lifecycleStatus?: string }).lifecycleStatus ?? po.status;
    if (poLifecycle !== 'CONFIRMED' && poLifecycle !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException(
        'Goods receipt can be created only for CONFIRMED or PARTIALLY_RECEIVED purchase orders',
      );
    }

    const postedReceipts = await tx.goodsReceiptHeader.findMany({
      where: {
        purchaseOrderId,
        status: DocumentStatus.POSTED,
        ...(headerId ? { id: { not: headerId } } : {}),
      },
      include: { items: true },
    });

    const alreadyReceivedByProduct = new Map<string, Prisma.Decimal>();
    for (const gr of postedReceipts) {
      for (const line of gr.items) {
        const current = alreadyReceivedByProduct.get(line.productId) ?? new Prisma.Decimal(0);
        alreadyReceivedByProduct.set(line.productId, current.add(line.quantity));
      }
    }

    for (const line of items) {
      const poLine = po.items.find((x) => x.productId === line.productId);
      if (!poLine) {
        throw new BadRequestException('Received product does not belong to selected purchase order');
      }
      const already = alreadyReceivedByProduct.get(line.productId) ?? new Prisma.Decimal(0);
      const nextTotal = already.add(line.quantity);
      if (nextTotal.gt(poLine.orderQty)) {
        throw new BadRequestException(
          `Partial GR exceeds PO quantity for product ${line.productId}. Remaining qty: ${poLine.orderQty.sub(already).toString()}`,
        );
      }
    }
  }

  /** Ensure warehouse can show on-hand qty at the receiving plant after posting. */
  private async ensureProductPlantForReceipt(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    params: { productId: string; shopId: string; storageLocationId: string | null },
  ) {
    const existing = await tx.productPlant.findUnique({
      where: {
        productId_shopId: { productId: params.productId, shopId: params.shopId },
      },
    });
    if (existing) {
      if (!existing.storageLocationId && params.storageLocationId) {
        await tx.productPlant.update({
          where: { id: existing.id },
          data: {
            storageLocationId: params.storageLocationId,
            updatedById: user.id,
          },
        });
      }
      return;
    }

    const template = await tx.productPlant.findFirst({
      where: { productId: params.productId },
      orderBy: { createdAt: 'asc' },
    });

    await tx.productPlant.create({
      data: {
        productId: params.productId,
        shopId: params.shopId,
        storageLocationId: params.storageLocationId,
        openingStock: new Prisma.Decimal(0),
        minStockLevel: template?.minStockLevel ?? new Prisma.Decimal(0),
        maxStockLevel: template?.maxStockLevel ?? null,
        reorderQty: template?.reorderQty ?? null,
        isActive: true,
        createdById: user.id,
      },
    });
  }

  async list(
    user: RequestUser,
    query: { shop_id?: string; date_from?: string; date_to?: string; status?: DocumentStatus; cursor?: string; take?: number },
  ) {
    const take = clampTake(query.take);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.GoodsReceiptHeaderWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
    };
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
      orderBy: { createdAt: 'desc' },
      include: {
        shop: true,
        items: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            uom: true,
            purchaseRate: true,
            lineValue: true,
            batchNumber: true,
            serialNumber: true,
            expiryDate: true,
            storageLocationId: true,
            product: {
              select: {
                id: true,
                productCode: true,
                description: true,
              },
            },
          },
        },
      },
    });
    const { items, meta } = buildMeta(rows, take);
    const normalized = items.map((row) => {
      const computedTotal = row.items.reduce((sum, line) => sum.add(line.lineValue), new Prisma.Decimal(0));
      return {
        ...row,
        totalValue: row.totalValue ?? computedTotal,
      };
    });
    return { data: normalized, meta };
  }

  async create(user: RequestUser, dto: CreateGoodsReceiptDto) {
    assertShopScope(user, dto.shopId);
    const grDate = new Date(dto.grDate);
    assertNotFuture(grDate);
    for (const line of dto.items) {
      if (line.quantity <= 0) throw new BadRequestException('Line quantities must be > 0');
      if (!line.storageLocationId) {
        throw new BadRequestException('Storage location is required on each line');
      }
    }
    await this.assertStorageLocationsForShop(dto.shopId, dto.items);

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
        const normalizedItems = dto.items.map((i) => ({
        productId: i.productId,
        quantity: new Prisma.Decimal(i.quantity),
      }));
      const resolvedReceiptSource =
        dto.receiptSource ?? (dto.purchaseOrderId ? 'PURCHASE_ORDER' : 'OUTSIDE');
      const resolvedPurchaseOrderId =
        resolvedReceiptSource === 'OUTSIDE' ? null : dto.purchaseOrderId ?? null;

      if (resolvedReceiptSource === 'PURCHASE_ORDER') {
        if (!resolvedPurchaseOrderId) {
          throw new BadRequestException('Purchase order is required for PO-linked receipts');
        }
        await this.validateAgainstPurchaseOrder(tx, null, resolvedPurchaseOrderId, normalizedItems);
      }

      // The sequence counter can fall behind existing gr_numbers (imported
      // data, series reconfiguration). A collision would abort the tx and
      // roll back the counter bump too, wedging every retry on the same
      // number — so advance within the tx until a free number is found.
      let grNumber = '';
      for (let attempt = 0; attempt < 50; attempt++) {
        grNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
          shopId: dto.shopId,
          docType: 'GR',
          date: grDate,
        });
        const taken = await tx.goodsReceiptHeader.findUnique({
          where: { grNumber },
          select: { id: true },
        });
        if (!taken) break;
        grNumber = '';
      }
      if (!grNumber) {
        throw new BadRequestException(
          'Could not allocate a goods receipt number. Check the GR document series configuration.',
        );
      }

      const header = await tx.goodsReceiptHeader.create({
        data: {
          grNumber,
          grDate,
          shopId: dto.shopId,
          purchaseOrderId: resolvedPurchaseOrderId,
          receiptType: dto.receiptType,
          receiptSource: resolvedReceiptSource,
          inwardShift: dto.inwardShift ?? null,
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
              batchNumber: i.batchNumber?.trim() || null,
              serialNumber: i.serialNumber?.trim() || null,
              expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
              storageLocationId: i.storageLocationId ?? null,
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
      include: { items: { include: { product: true, storageLocation: true } }, shop: true },
    });
    if (!gr) throw new NotFoundException('Goods receipt not found');
    assertShopScope(user, gr.shopId);
    return gr;
  }

  async update(user: RequestUser, id: string, dto: UpdateGoodsReceiptDto) {
    const existing = await this.get(user, id);
    assertGrAction(existing.status, GrAction.EDIT);
    await assertGrMutationAllowed(this.prisma, { grId: id, action: 'update' });
    if (dto.shopId) assertShopScope(user, dto.shopId);

    const grDate = dto.grDate ? new Date(dto.grDate) : existing.grDate;
    assertNotFuture(grDate);
    const resolvedShopId = dto.shopId ?? existing.shopId;
    if (dto.items) {
      for (const line of dto.items) {
        if (line.quantity <= 0) throw new BadRequestException('Line quantities must be > 0');
        if (!line.storageLocationId) {
          throw new BadRequestException('Storage location is required on each line');
        }
      }
      await this.assertStorageLocationsForShop(resolvedShopId, dto.items);
    }

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const resolvedReceiptSource =
        dto.receiptSource ??
        existing.receiptSource ??
        (dto.purchaseOrderId ?? existing.purchaseOrderId ? 'PURCHASE_ORDER' : 'OUTSIDE');
      const nextPoId =
        resolvedReceiptSource === 'OUTSIDE'
          ? null
          : dto.purchaseOrderId ?? existing.purchaseOrderId;
      const nextItems =
        dto.items ??
        existing.items.map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
        }));

      if (resolvedReceiptSource === 'PURCHASE_ORDER') {
        if (!nextPoId) {
          throw new BadRequestException('Purchase order is required for PO-linked receipts');
        }
        if (dto.purchaseOrderId !== undefined || dto.items) {
          await this.validateAgainstPurchaseOrder(
            tx,
            id,
            nextPoId,
            nextItems.map((line) => ({
              productId: line.productId,
              quantity: new Prisma.Decimal(line.quantity),
            })),
          );
        }
      }

      if (dto.items) {
        await tx.goodsReceiptItem.deleteMany({ where: { grHeaderId: id } });
      }

      return tx.goodsReceiptHeader.update({
        where: { id },
        data: {
          grDate,
          shopId: dto.shopId ?? undefined,
          purchaseOrderId: nextPoId ?? undefined,
          receiptType: dto.receiptType ?? undefined,
          receiptSource: resolvedReceiptSource,
          inwardShift: dto.inwardShift ?? undefined,
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
                    batchNumber: i.batchNumber?.trim() || null,
                    serialNumber: i.serialNumber?.trim() || null,
                    expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
                    storageLocationId: i.storageLocationId ?? null,
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
    assertGrAction(header.status, GrAction.POST);
    assertGrTransition(header.status, DocumentStatus.POSTED);
    const grDate = header.grDate;
    assertNotFuture(grDate);

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const fresh = await tx.goodsReceiptHeader.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!fresh || fresh.status !== DocumentStatus.DRAFT) {
        throw new DocumentAlreadyPostedException();
      }

      if (fresh.purchaseOrderId) {
        await this.validateAgainstPurchaseOrder(
          tx,
          fresh.id,
          fresh.purchaseOrderId,
          fresh.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        );
      }

      for (const line of fresh.items) {
        if (!line.storageLocationId) {
          throw new BadRequestException('Storage location is required on each line before posting');
        }
        if (!line.expiryDate) {
          throw new BadRequestException('Expiry date is required on each line before posting');
        }
        const location = await tx.storageLocation.findFirst({
          where: { id: line.storageLocationId, shopId: fresh.shopId, isActive: true },
        });
        if (!location) {
          throw new BadRequestException('Invalid storage location for this plant');
        }
      }

      // Resolve the shop costing method once per posting; cost layers and
      // the avgCost on stock_summary both depend on it.
      const shop = await tx.shop.findUnique({
        where: { id: fresh.shopId },
        select: { costingMethod: true, companyId: true },
      });
      const method = shop?.costingMethod ?? CostingMethod.AVERAGE;

      // Capture before quantities for all products
      const beforeQtyMap = new Map<string, number>();
      for (const line of fresh.items) {
        const summary = await tx.stockSummary.findUnique({
          where: { shopId_productId: { shopId: fresh.shopId, productId: line.productId } },
        });
        beforeQtyMap.set(line.productId, Number(summary?.currentStock ?? 0));
      }

      let total = new Prisma.Decimal(0);
      for (const line of fresh.items) {
        const beforeQty = beforeQtyMap.get(line.productId) ?? 0;

        await this.stock.postMovementOnce(tx, {
          type: TransactionType.GOODS_RECEIPT,
          ref: fresh.grNumber,
          date: fresh.grDate,
          shopId: fresh.shopId,
          productId: line.productId,
          inQty: Number(line.quantity),
          outQty: 0,
          unitRate: Number(line.purchaseRate),
          sourceType: 'GOODS_RECEIPT',
          sourceId: fresh.id,
          sourceLineId: line.id,
          idempotencyKey: `gr:${fresh.id}:${line.id}`,
          userId: user.id,
          remarks: [
            line.batchNumber?.trim() ? `batch:${line.batchNumber.trim()}` : null,
            line.serialNumber?.trim() ? `serial:${line.serialNumber.trim()}` : null,
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        });

        // Capture after quantity for audit
        const afterSummary = await tx.stockSummary.findUnique({
          where: { shopId_productId: { shopId: fresh.shopId, productId: line.productId } },
        });
        const afterQty = Number(afterSummary?.currentStock ?? 0);
        const delta = Number(line.quantity);

        await this.ensureProductPlantForReceipt(tx, user, {
          productId: line.productId,
          shopId: fresh.shopId,
          storageLocationId: line.storageLocationId,
        });
        await this.costing.recordInflow(tx, {
          shopId: fresh.shopId,
          productId: line.productId,
          qty: new Prisma.Decimal(line.quantity),
          unitCost: new Prisma.Decimal(line.purchaseRate),
          grId: fresh.id,
          method,
        });

        // Log inventory movement audit
        if (shop?.companyId) {
          await this.audit.log(
            buildReceiveGoodsAudit({
              companyId: shop.companyId,
              userId: user.id,
              productId: line.productId,
              warehouseId: fresh.shopId,
              batchId: line.batchNumber?.trim(),
              referenceNo: fresh.grNumber,
              beforeQty,
              delta,
              afterQty,
            }),
            tx,
          );
        }

        total = total.add(line.lineValue);
      }

      // Atomic state transition guard so concurrent posts on the same GR
      // cannot both run side-effects.
      const transitioned = await tx.goodsReceiptHeader.updateMany({
        where: { id, status: DocumentStatus.DRAFT },
        data: {
          status: DocumentStatus.POSTED,
          postedAt: new Date(),
          totalValue: total,
          updatedById: user.id,
        },
      });
      if (transitioned.count === 0) {
        throw new DocumentAlreadyPostedException();
      }

      const posted = await tx.goodsReceiptHeader.findUniqueOrThrow({
        where: { id },
        include: {
          items: { include: { product: true, storageLocation: true } },
          shop: true,
          purchaseOrder: { select: { poNumber: true } },
        },
      });
      await this.audit.log(
        buildStatusTransitionAudit({
          companyId: assertCompanyId(user),
          userId: user.id,
          entityType: 'GOODS_RECEIPT',
          entityId: posted.id,
          fromStatus: DocumentStatus.DRAFT,
          toStatus: DocumentStatus.POSTED,
          action: AuditAction.POST,
        }),
        tx,
      );
      return posted;
    }).then(async (posted) => {
      let alertAttachments: Array<{ filename: string; content: Buffer }> = [];
      try {
        const pdf = await this.documentPdf.renderGoodsReceiptPdfById(posted.id);
        alertAttachments = [{ filename: pdf.filename, content: pdf.buffer }];
      } catch {
        // Internal alert still sends without attachment if PDF fails.
      }

      await this.emailNotifications
        .sendInternalAlert({
          shopId: posted.shopId,
          alertKey: 'goodsReceiptPosted',
          title: `Goods receipt posted: ${posted.grNumber}`,
          message: `${posted.supplierName} — ${posted.shop?.shopName ?? posted.shopId}`,
          attachments: alertAttachments.length ? alertAttachments : undefined,
          dedupe: {
            templateId: 'goods_receipt_posted',
            entityType: 'goods-receipt',
            entityId: posted.id,
          },
        })
        .catch(() => undefined);

      await this.autoSendGoodsReceiptEmail(user, posted).catch(() => undefined);

      // In-app notification to the procurement/inventory team: "Goods Received".
      const companyId = posted.shop?.companyId;
      if (companyId) {
        const poRef = posted.purchaseOrder?.poNumber
          ? ` for ${posted.purchaseOrder.poNumber}`
          : '';
        await this.notifications
          .notifyRoles(
            [RoleName.INVENTORY_MANAGER, RoleName.PURCHASE_MANAGER, RoleName.OWNER, RoleName.ADMIN],
            {
              title: 'Goods Received',
              message: `${posted.grNumber} has been posted${poRef}`,
              type: AlertType.GOODS_RECEIPT_CREATED,
              module: NotificationModule.GOODS_RECEIPT,
              priority: NotificationPriority.NORMAL,
              referenceType: 'goods_receipt',
              referenceId: posted.id,
              deepLink: `/goods-receipts/${posted.id}`,
            },
            companyId,
            user.id,
          )
          .catch(() => undefined);
      }
      return posted;
    });
  }

  private buildGoodsReceiptEmailContent(
    gr: {
      grNumber: string;
      grDate: Date;
      supplierName: string;
      totalValue: Prisma.Decimal | null;
      shop: { shopName: string } | null;
      purchaseOrder?: { poNumber: string } | null;
    },
    companyName: string,
  ): GoodsReceiptSupplierEmailContent {
    return {
      supplierName: gr.supplierName,
      grNumber: gr.grNumber,
      grDate: formatEmailDate(gr.grDate),
      shopName: gr.shop?.shopName ?? 'Plant',
      totalAmount: formatEmailMoney(gr.totalValue ?? 0),
      poNumber: gr.purchaseOrder?.poNumber ?? '—',
      companyName,
    };
  }

  async sendToSupplier(user: RequestUser, id: string, options?: { resend?: boolean }) {
    const gr = await this.get(user, id);
    assertGrAction(gr.status, GrAction.SEND);

    const shopRow = await this.prisma.shop.findUnique({
      where: { id: gr.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shopRow?.companyId) {
      throw new BadRequestException('Shop not linked to a company');
    }

    const purchaseOrder = gr.purchaseOrderId
      ? await this.prisma.purchaseOrderHeader.findUnique({
          where: { id: gr.purchaseOrderId },
          select: { poNumber: true },
        })
      : null;

    const supplier = await this.prisma.supplier.findFirst({
      where: {
        companyId: shopRow.companyId,
        supplierName: { equals: gr.supplierName.trim(), mode: 'insensitive' },
      },
      select: { email: true, supplierName: true },
    });
    const email = supplier?.email?.trim();
    if (!email) {
      throw new BadRequestException(
        `Supplier email is missing for "${gr.supplierName}". Open Suppliers, add an email, and try again.`,
      );
    }

    const content = this.buildGoodsReceiptEmailContent(
      { ...gr, purchaseOrder, shop: gr.shop },
      shopRow.company?.companyName ?? 'Company',
    );
    const defaults = goodsReceiptSupplierDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      gr.shopId,
      'goods_receipt_supplier',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Goods receipt email notifications are disabled in settings.');
    }

    const trigger = options?.resend ? DocumentEmailTrigger.RESEND : DocumentEmailTrigger.MANUAL;
    return this.documentEmail.sendGoodsReceiptEmail(user, {
      grId: id,
      companyId: shopRow.companyId,
      shopId: gr.shopId,
      recipient: email,
      content,
      prepared,
      documentNumber: gr.grNumber,
      trigger,
    });
  }

  private async autoSendGoodsReceiptEmail(
    user: RequestUser,
    gr: {
      id: string;
      grNumber: string;
      grDate: Date;
      shopId: string;
      supplierName: string;
      totalValue: Prisma.Decimal | null;
      shop: { shopName: string } | null;
      purchaseOrder?: { poNumber: string } | null;
    },
  ) {
    const shopRow = await this.prisma.shop.findUnique({
      where: { id: gr.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shopRow?.companyId) return;

    const supplier = await this.prisma.supplier.findFirst({
      where: {
        companyId: shopRow.companyId,
        supplierName: { equals: gr.supplierName.trim(), mode: 'insensitive' },
      },
      select: { email: true },
    });
    const recipient = supplier?.email?.trim();
    if (!recipient) return;

    const content = this.buildGoodsReceiptEmailContent(
      gr,
      shopRow.company?.companyName ?? 'Company',
    );
    const defaults = goodsReceiptSupplierDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      gr.shopId,
      'goods_receipt_supplier',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) return;

    await this.documentEmail.sendGoodsReceiptEmail(user, {
      grId: gr.id,
      companyId: shopRow.companyId,
      shopId: gr.shopId,
      recipient,
      content,
      prepared,
      documentNumber: gr.grNumber,
      trigger: DocumentEmailTrigger.AUTO,
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
    assertGrAction(existing.status, GrAction.DELETE);
    await assertGrMutationAllowed(this.prisma, { grId: id, action: 'delete' });
    await this.prisma.goodsReceiptHeader.delete({ where: { id } });
    return { ok: true };
  }
}

