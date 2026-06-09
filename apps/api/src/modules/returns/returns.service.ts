import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  CostingMethod,
  CreditNoteStatus,
  DocumentEmailTrigger,
  DocumentStatus,
  Prisma,
  ReturnStatus,
  SupplierReturnReasonCode,
  TransactionType,
} from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { buildSupplierReturnAckUrl } from '../../common/mail/portal-url';
import type { RequestUser } from '../../common/types/request-user';
import { ReturnImageStorageService } from '../../common/upload/return-image-storage.service';
import { assertNotFuture } from '../../common/utils/date-guards';
import { asMoney, roundMoney } from '../../common/utils/money';
import { runSerializableTxWithRetry } from '../../common/utils/serializable-tx';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CostingService } from '../stock/costing.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { StockService } from '../stock/stock.service';
import { CreateCustomerReturnDto } from './dto/create-customer-return.dto';
import {
  CreateSupplierReturnDto,
  CreateSupplierReturnItemDto,
} from './dto/create-supplier-return.dto';
import { UpdateSupplierReturnDto } from './dto/update-supplier-return.dto';
import { UploadSupplierReturnImageDto } from './dto/upload-supplier-return-image.dto';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { returnNoticeDefaults } from '../email-notifications/email-notifications.outbound';
import { DocumentEmailService } from '../document-email/document-email.service';

const supplierReturnInclude = Prisma.validator<Prisma.SupplierReturnInclude>()({
  shop: {
    select: {
      id: true,
      shopName: true,
      shopNumber: true,
      email: true,
      companyId: true,
      company: { select: { companyName: true } },
    },
  },
  supplier: {
    select: {
      id: true,
      supplierName: true,
      email: true,
      city: true,
      state: true,
      country: true,
    },
  },
  purchaseOrder: {
    select: {
      id: true,
      poNumber: true,
      supplier: true,
    },
  },
  goodsReceipt: {
    select: {
      id: true,
      grNumber: true,
      grDate: true,
      supplierName: true,
      purchaseOrderId: true,
    },
  },
  images: true,
  items: {
    include: {
      product: {
        select: {
          id: true,
          productCode: true,
          description: true,
        },
      },
      goodsReceiptItem: {
        include: {
          product: {
            select: {
              id: true,
              productCode: true,
              description: true,
            },
          },
        },
      },
      images: true,
    },
  },
});

type SupplierReturnRecord = Prisma.SupplierReturnGetPayload<{
  include: typeof supplierReturnInclude;
}>;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function reasonLabel(reason?: SupplierReturnReasonCode | null): string {
  switch (reason) {
    case SupplierReturnReasonCode.DAMAGED:
      return 'Damaged';
    case SupplierReturnReasonCode.WRONG_ITEM:
      return 'Wrong item';
    case SupplierReturnReasonCode.EXPIRED:
      return 'Expired';
    case SupplierReturnReasonCode.EXCESS:
      return 'Excess';
    default:
      return 'Other';
  }
}

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly costing: CostingService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly returnImages: ReturnImageStorageService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  // -- Customer returns -----------------------------------------------------

  async createCustomerReturn(user: RequestUser, dto: CreateCustomerReturnDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);

    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
    assertNotFuture(returnDate);
    let total = new Prisma.Decimal(0);
    const items = dto.items.map((it) => {
      const quantity = asMoney(it.quantity);
      const unitPrice = asMoney(it.unitPrice);
      const lineValue = roundMoney(quantity.mul(unitPrice));
      total = total.add(lineValue);
      return {
        productId: it.productId,
        quantity,
        uom: it.uom ?? 'UNIT',
        unitPrice: roundMoney(unitPrice),
        lineValue,
      };
    });

    return this.prisma.$transaction(async (tx) => {
      const number = await this.numbers.nextConfiguredNumber(tx, {
        shopId,
        docType: 'CRT',
        date: returnDate,
      });
      const created = await tx.customerReturn.create({
        data: {
          returnNumber: number,
          returnDate,
          shopId,
          customerId: dto.customerId,
          invoiceId: dto.invoiceId ?? null,
          salesOrderId: dto.salesOrderId ?? null,
          reason: dto.reason ?? null,
          remarks: dto.remarks ?? null,
          status: ReturnStatus.DRAFT,
          totalValue: roundMoney(total),
          createdById: user.id,
          items: { create: items },
        },
        include: { items: true },
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'CUSTOMER_RETURN',
          entityId: created.id,
          newValues: {
            returnNumber: created.returnNumber,
            customerId: created.customerId,
            totalValue: created.totalValue.toString(),
          },
        },
        tx,
      );
      return created;
    });
  }

  async postCustomerReturn(user: RequestUser, id: string) {
    const ret = await this.prisma.customerReturn.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!ret) throw new NotFoundException('Customer return not found');
    assertShopScope(user, ret.shopId);
    if (ret.status === ReturnStatus.POSTED) return ret;
    if (ret.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException(`Cannot post return in status ${ret.status}`);
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: ret.shopId },
      select: { costingMethod: true },
    });
    const method = shop?.costingMethod ?? CostingMethod.AVERAGE;

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.customerReturn.updateMany({
        where: { id, status: ReturnStatus.DRAFT },
        data: {
          status: ReturnStatus.POSTED,
          postedAt: new Date(),
          updatedById: user.id,
        },
      });
      if (transitioned.count === 0) {
        throw new ConflictException('Customer return state changed concurrently');
      }

      for (const line of ret.items) {
        await this.stock.postMovementOnce(tx, {
          type: TransactionType.GOODS_RECEIPT,
          ref: ret.returnNumber,
          date: ret.returnDate,
          shopId: ret.shopId,
          productId: line.productId,
          inQty: Number(line.quantity),
          outQty: 0,
          unitRate: Number(line.unitPrice),
          remarks: 'Customer return',
          sourceType: 'CUSTOMER_RETURN',
          sourceId: ret.id,
          sourceLineId: line.id,
          idempotencyKey: `cust-ret:${ret.id}:${line.id}`,
          userId: user.id,
        });
        await this.costing.recordInflow(tx, {
          shopId: ret.shopId,
          productId: line.productId,
          qty: new Prisma.Decimal(line.quantity),
          unitCost: new Prisma.Decimal(line.unitPrice),
          method,
        });
      }

      const creditNumber = await this.numbers.nextNumber(tx, {
        shopId: ret.shopId,
        docType: 'CN',
        prefix: 'CN',
        date: ret.returnDate,
      });
      await tx.creditNote.create({
        data: {
          creditNumber,
          creditDate: ret.returnDate,
          shopId: ret.shopId,
          customerId: ret.customerId,
          invoiceId: ret.invoiceId,
          returnId: ret.id,
          status: CreditNoteStatus.ISSUED,
          amount: ret.totalValue,
          createdById: user.id,
        },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'CUSTOMER_RETURN',
          entityId: ret.id,
          newValues: { status: ReturnStatus.POSTED, creditNumber },
        },
        tx,
      );

      return tx.customerReturn.findUniqueOrThrow({
        where: { id },
        include: { items: true, creditNote: true },
      });
    });
  }

  // -- Supplier returns -----------------------------------------------------

  private async findSupplierReturnRecord(id: string): Promise<SupplierReturnRecord> {
    const ret = await this.prisma.supplierReturn.findUnique({
      where: { id },
      include: supplierReturnInclude,
    });
    if (!ret) throw new NotFoundException('Supplier return not found');
    return ret;
  }

  private async getSupplierReturnRecord(user: RequestUser, id: string): Promise<SupplierReturnRecord> {
    const ret = await this.findSupplierReturnRecord(id);
    assertShopScope(user, ret.shopId);
    return ret;
  }

  private async resolveSupplierDraftData(
    tx: Prisma.TransactionClient,
    user: RequestUser,
    dto: {
      goodsReceiptId: string;
      shopId?: string;
      supplierRef?: string;
      remarks?: string;
      internalCcEmail?: string;
      items: CreateSupplierReturnItemDto[];
    },
    currentReturnId?: string,
  ) {
    const goodsReceipt = await tx.goodsReceiptHeader.findUnique({
      where: { id: dto.goodsReceiptId },
      include: {
        shop: {
          select: {
            id: true,
            companyId: true,
            shopName: true,
            company: { select: { companyName: true } },
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            supplier: true,
          },
        },
        items: {
          include: {
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

    if (!goodsReceipt) throw new NotFoundException('Goods receipt not found');
    assertShopScope(user, goodsReceipt.shopId);
    if (goodsReceipt.status !== DocumentStatus.POSTED) {
      throw new BadRequestException('Only posted goods receipts can be returned');
    }
    if (dto.shopId && dto.shopId !== goodsReceipt.shopId) {
      throw new BadRequestException('shopId must match the selected goods receipt');
    }

    const supplierName = goodsReceipt.supplierName.trim();
    const expectedSupplier = goodsReceipt.purchaseOrder?.supplier?.trim();
    if (
      expectedSupplier &&
      expectedSupplier.localeCompare(supplierName, undefined, { sensitivity: 'accent' }) !== 0
    ) {
      throw new BadRequestException('Supplier master does not match the goods receipt source');
    }

    const supplier = goodsReceipt.shop.companyId
      ? await tx.supplier.findFirst({
          where: {
            companyId: goodsReceipt.shop.companyId,
            deletedAt: null,
            supplierName: { equals: supplierName, mode: 'insensitive' },
          },
          select: {
            id: true,
            supplierName: true,
            email: true,
          },
        })
      : null;

    if (!supplier) {
      throw new BadRequestException(
        `Supplier "${supplierName}" must exist in supplier master for return notices.`,
      );
    }

    const lineIds = dto.items.map((item) => item.goodsReceiptItemId);
    const uniqueLineIds = new Set(lineIds);
    if (uniqueLineIds.size !== lineIds.length) {
      throw new BadRequestException('Each goods receipt line can be selected only once per return');
    }

    const goodsReceiptItemMap = new Map(goodsReceipt.items.map((item) => [item.id, item]));
    const reservedByGrItem = new Map<string, Prisma.Decimal>();
    const existingLines = await tx.supplierReturnItem.findMany({
      where: {
        goodsReceiptItemId: { in: lineIds },
        header: {
          status: {
            in: [
              ReturnStatus.DRAFT,
              ReturnStatus.SUBMITTED,
              ReturnStatus.ACKNOWLEDGED,
              ReturnStatus.DONE,
              ReturnStatus.POSTED,
            ],
          },
          ...(currentReturnId ? { id: { not: currentReturnId } } : {}),
        },
      },
      select: {
        goodsReceiptItemId: true,
        quantity: true,
      },
    });

    for (const line of existingLines) {
      if (!line.goodsReceiptItemId) continue;
      const current = reservedByGrItem.get(line.goodsReceiptItemId) ?? new Prisma.Decimal(0);
      reservedByGrItem.set(line.goodsReceiptItemId, current.add(line.quantity));
    }

    let total = new Prisma.Decimal(0);
    const items = dto.items.map((item) => {
      const grItem = goodsReceiptItemMap.get(item.goodsReceiptItemId);
      if (!grItem) {
        throw new BadRequestException('All return items must belong to the selected goods receipt');
      }

      const returnQty = asMoney(item.returnQty);
      const alreadyReserved = reservedByGrItem.get(grItem.id) ?? new Prisma.Decimal(0);
      const availableQty = new Prisma.Decimal(grItem.quantity).sub(alreadyReserved);
      if (returnQty.gt(availableQty)) {
        throw new BadRequestException(
          `Return quantity exceeds available quantity for ${grItem.product.productCode}. Available: ${availableQty.toString()}`,
        );
      }

      const unitCost = new Prisma.Decimal(grItem.purchaseRate);
      const lineValue = roundMoney(returnQty.mul(unitCost));
      total = total.add(lineValue);

      return {
        goodsReceiptItemId: grItem.id,
        productId: grItem.productId,
        quantity: returnQty,
        grnQuantity: new Prisma.Decimal(grItem.quantity),
        uom: grItem.uom,
        unitCost: roundMoney(unitCost),
        lineValue,
        reasonCode: item.reasonCode,
      };
    });

    return {
      goodsReceipt,
      supplier,
      supplierName,
      total: roundMoney(total),
      items,
    };
  }

  async createSupplierReturn(user: RequestUser, dto: CreateSupplierReturnDto) {
    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date();
    assertNotFuture(returnDate);

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const draft = await this.resolveSupplierDraftData(tx, user, dto);
      const number = await this.numbers.nextConfiguredNumber(tx, {
        shopId: draft.goodsReceipt.shopId,
        docType: 'SRT',
        date: returnDate,
      });

      const created = await tx.supplierReturn.create({
        data: {
          returnNumber: number,
          returnDate,
          shopId: draft.goodsReceipt.shopId,
          supplierName: draft.supplierName,
          supplierId: draft.supplier.id,
          purchaseOrderId: draft.goodsReceipt.purchaseOrderId ?? null,
          goodsReceiptId: draft.goodsReceipt.id,
          supplierRef: dto.supplierRef?.trim() || null,
          remarks: dto.remarks?.trim() || null,
          internalCcEmail: dto.internalCcEmail?.trim() || null,
          status: ReturnStatus.DRAFT,
          totalValue: draft.total,
          createdById: user.id,
          items: { create: draft.items },
        },
        include: supplierReturnInclude,
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'SUPPLIER_RETURN',
          entityId: created.id,
          newValues: {
            returnNumber: created.returnNumber,
            goodsReceiptId: created.goodsReceiptId,
            supplierId: created.supplierId,
            totalValue: created.totalValue.toString(),
          },
        },
        tx,
      );

      return created;
    });
  }

  async updateSupplierReturn(user: RequestUser, id: string, dto: UpdateSupplierReturnDto) {
    const existing = await this.getSupplierReturnRecord(user, id);
    if (existing.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException('Only draft supplier returns can be edited');
    }

    const resolvedItems =
      dto.items ??
      existing.items.map((item) => ({
        goodsReceiptItemId: item.goodsReceiptItemId ?? '',
        returnQty: Number(item.quantity),
        reasonCode: item.reasonCode ?? SupplierReturnReasonCode.DAMAGED,
      }));

    const resolvedGoodsReceiptId = dto.goodsReceiptId ?? existing.goodsReceiptId;
    if (!resolvedGoodsReceiptId) {
      throw new BadRequestException('goodsReceiptId is required');
    }

    const returnDate = dto.returnDate ? new Date(dto.returnDate) : new Date(existing.returnDate);
    assertNotFuture(returnDate);

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const draft = await this.resolveSupplierDraftData(
        tx,
        user,
        {
          goodsReceiptId: resolvedGoodsReceiptId,
          shopId: dto.shopId ?? existing.shopId,
          supplierRef: dto.supplierRef ?? existing.supplierRef ?? undefined,
          remarks: dto.remarks ?? existing.remarks ?? undefined,
          internalCcEmail: dto.internalCcEmail ?? existing.internalCcEmail ?? undefined,
          items: resolvedItems,
        },
        existing.id,
      );

      await tx.supplierReturnItem.deleteMany({ where: { returnId: id } });
      const updated = await tx.supplierReturn.update({
        where: { id },
        data: {
          returnDate,
          shopId: draft.goodsReceipt.shopId,
          supplierName: draft.supplierName,
          supplierId: draft.supplier.id,
          purchaseOrderId: draft.goodsReceipt.purchaseOrderId ?? null,
          goodsReceiptId: draft.goodsReceipt.id,
          supplierRef:
            (dto.supplierRef ?? existing.supplierRef ?? null)?.trim?.() ??
            dto.supplierRef ??
            existing.supplierRef ??
            null,
          remarks:
            (dto.remarks ?? existing.remarks ?? null)?.trim?.() ??
            dto.remarks ??
            existing.remarks ??
            null,
          internalCcEmail:
            (dto.internalCcEmail ?? existing.internalCcEmail ?? null)?.trim?.() ??
            dto.internalCcEmail ??
            existing.internalCcEmail ??
            null,
          totalValue: draft.total,
          updatedById: user.id,
          items: { create: draft.items },
        },
        include: supplierReturnInclude,
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'SUPPLIER_RETURN',
          entityId: updated.id,
          newValues: {
            goodsReceiptId: updated.goodsReceiptId,
            totalValue: updated.totalValue.toString(),
            itemCount: updated.items.length,
          },
        },
        tx,
      );

      return updated;
    });
  }

  async uploadSupplierReturnImage(
    user: RequestUser,
    id: string,
    dto: UploadSupplierReturnImageDto,
    file: Express.Multer.File,
  ) {
    const ret = await this.getSupplierReturnRecord(user, id);
    if (ret.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException('Images can only be uploaded while the return is in draft');
    }
    if (dto.returnItemId && !ret.items.some((item) => item.id === dto.returnItemId)) {
      throw new BadRequestException('Selected return item does not belong to this return order');
    }

    const stored = await this.returnImages.store(id, file);
    return this.prisma.supplierReturnImage.create({
      data: {
        returnId: id,
        returnItemId: dto.returnItemId ?? null,
        filePath: stored.filePath,
        publicUrl: stored.publicUrl,
        originalFilename: stored.originalFilename,
        mimeType: stored.mimeType,
        createdById: user.id,
      },
    });
  }

  async removeSupplierReturnImage(user: RequestUser, id: string, imageId: string) {
    const ret = await this.getSupplierReturnRecord(user, id);
    if (ret.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException('Images can only be removed while the return is in draft');
    }

    const image = await this.prisma.supplierReturnImage.findFirst({
      where: { id: imageId, returnId: id },
    });
    if (!image) throw new NotFoundException('Return image not found');

    await this.prisma.supplierReturnImage.delete({ where: { id: image.id } });
    await this.returnImages.remove(image.filePath);
    return { deleted: true, id: image.id };
  }

  private buildSupplierReturnEmailContent(ret: SupplierReturnRecord, acknowledgementUrl: string) {
    return {
      supplierName: ret.supplier?.supplierName ?? ret.supplierName,
      returnNumber: ret.returnNumber,
      returnDate: ret.returnDate.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      grNumber: ret.goodsReceipt?.grNumber ?? '—',
      shopName: ret.shop.shopName,
      companyName: ret.shop.company?.companyName ?? 'Softdigit Consulting',
      supplierRef: ret.supplierRef,
      remarks: ret.remarks,
      acknowledgementUrl,
      lines: ret.items.map((item) => ({
        code: item.product?.productCode ?? item.goodsReceiptItem?.product?.productCode ?? item.productId,
        description:
          item.product?.description ?? item.goodsReceiptItem?.product?.description ?? '',
        grnQuantity: item.grnQuantity?.toString() ?? item.goodsReceiptItem?.quantity.toString() ?? '0',
        returnQuantity: item.quantity.toString(),
        reason: reasonLabel(item.reasonCode),
        imageCount: item.images.length,
      })),
    };
  }

  async submitSupplierReturn(user: RequestUser, id: string) {
    const ret = await this.getSupplierReturnRecord(user, id);
    if (ret.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException('Only draft supplier returns can be submitted');
    }
    if (!ret.items.length) {
      throw new BadRequestException('Add at least one return line before submitting');
    }
    const supplierEmail = ret.supplier?.email?.trim();
    if (!supplierEmail) {
      throw new BadRequestException(
        `Supplier "${ret.supplierName}" must have an email address before submitting a return notice.`,
      );
    }

    const ackToken = randomBytes(24).toString('hex');
    const ackTokenHash = hashToken(ackToken);
    const acknowledgementUrl = buildSupplierReturnAckUrl(this.config, ackToken);

    const content = this.buildSupplierReturnEmailContent(ret, acknowledgementUrl);
    const defaults = returnNoticeDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      ret.shopId,
      'supplier_return_notice',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Supplier return email notifications are disabled in settings.');
    }
    if (!ret.shop.companyId) {
      throw new BadRequestException('Shop is not linked to a company');
    }

    const delivery = await this.documentEmail.sendGoodsReturnEmail(user, {
      returnId: id,
      companyId: ret.shop.companyId,
      shopId: ret.shopId,
      recipient: supplierEmail,
      content,
      prepared,
      documentNumber: ret.returnNumber,
      trigger: DocumentEmailTrigger.AUTO,
      cc: ret.internalCcEmail?.trim() || undefined,
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplierReturn.update({
        where: { id },
        data: {
          status: ReturnStatus.SUBMITTED,
          submittedAt: new Date(),
          emailSentAt: delivery.sent ? new Date() : null,
          ackTokenHash,
          emailMessageId: null,
          updatedById: user.id,
        },
        include: supplierReturnInclude,
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'SUPPLIER_RETURN',
          entityId: updated.id,
          newValues: {
            status: updated.status,
            emailSentAt: updated.emailSentAt?.toISOString(),
          },
        },
        tx,
      );

      return updated;
    });
  }

  async sendSupplierReturnNotice(user: RequestUser, id: string, options?: { resend?: boolean }) {
    const ret = await this.getSupplierReturnRecord(user, id);
    if (ret.status === ReturnStatus.DRAFT) {
      throw new BadRequestException('Submit the return before resending the notice email');
    }
    const supplierEmail = ret.supplier?.email?.trim();
    if (!supplierEmail) {
      throw new BadRequestException(
        `Supplier "${ret.supplierName}" must have an email address before sending a return notice.`,
      );
    }
    if (!ret.shop.companyId) {
      throw new BadRequestException('Shop is not linked to a company');
    }

    const ackToken = randomBytes(24).toString('hex');
    const acknowledgementUrl = buildSupplierReturnAckUrl(this.config, ackToken);
    const content = this.buildSupplierReturnEmailContent(ret, acknowledgementUrl);
    const defaults = returnNoticeDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      ret.shopId,
      'supplier_return_notice',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Supplier return email notifications are disabled in settings.');
    }

    const trigger = options?.resend ? DocumentEmailTrigger.RESEND : DocumentEmailTrigger.MANUAL;
    const delivery = await this.documentEmail.sendGoodsReturnEmail(user, {
      returnId: id,
      companyId: ret.shop.companyId,
      shopId: ret.shopId,
      recipient: supplierEmail,
      content,
      prepared,
      documentNumber: ret.returnNumber,
      trigger,
      cc: ret.internalCcEmail?.trim() || undefined,
    });

    if (delivery.sent || delivery.queued) {
      await this.prisma.supplierReturn.update({
        where: { id },
        data: {
          ackTokenHash: hashToken(ackToken),
          emailSentAt: delivery.sent ? new Date() : ret.emailSentAt,
          updatedById: user.id,
        },
      });
    }

    return delivery;
  }

  async cancelSupplierReturn(user: RequestUser, id: string) {
    const ret = await this.getSupplierReturnRecord(user, id);
    if (ret.status === ReturnStatus.CANCELLED) return ret;
    if (ret.status === ReturnStatus.DONE || ret.status === ReturnStatus.POSTED) {
      throw new BadRequestException('Posted supplier returns cannot be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supplierReturn.update({
        where: { id },
        data: {
          status: ReturnStatus.CANCELLED,
          updatedById: user.id,
        },
        include: supplierReturnInclude,
      });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'SUPPLIER_RETURN',
          entityId: updated.id,
          newValues: { status: updated.status },
        },
        tx,
      );
      return updated;
    });
  }

  private async postSupplierReturnStock(
    tx: Prisma.TransactionClient,
    ret: SupplierReturnRecord,
    userId: string,
    remarks: string,
  ) {
    const shop = await tx.shop.findUnique({
      where: { id: ret.shopId },
      select: { costingMethod: true },
    });
    const method = shop?.costingMethod ?? CostingMethod.AVERAGE;

    for (const line of ret.items) {
      const { unitCost } = await this.costing.recordOutflow(tx, {
        shopId: ret.shopId,
        productId: line.productId,
        qty: new Prisma.Decimal(line.quantity),
        method,
      });
      await this.stock.postMovementOnce(tx, {
        type: TransactionType.GOODS_ISSUE,
        ref: ret.returnNumber,
        date: ret.returnDate,
        shopId: ret.shopId,
        productId: line.productId,
        inQty: 0,
        outQty: Number(line.quantity),
        unitRate: unitCost.gt(0) ? unitCost : new Prisma.Decimal(line.unitCost),
        remarks,
        sourceType: 'SUPPLIER_RETURN',
        sourceId: ret.id,
        sourceLineId: line.id,
        idempotencyKey: `sup-ret:${ret.id}:${line.id}`,
        userId,
      });
    }
  }

  async postSupplierReturn(user: RequestUser, id: string) {
    const ret = await this.getSupplierReturnRecord(user, id);
    if (ret.status === ReturnStatus.POSTED || ret.status === ReturnStatus.DONE) return ret;
    if (ret.goodsReceiptId) {
      throw new BadRequestException(
        'Goods-receipt return orders must be acknowledged by the supplier before stock is deducted',
      );
    }
    if (ret.status !== ReturnStatus.DRAFT) {
      throw new BadRequestException(`Cannot post return in status ${ret.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.supplierReturn.updateMany({
        where: { id, status: ReturnStatus.DRAFT },
        data: { status: ReturnStatus.POSTED, postedAt: new Date(), updatedById: user.id },
      });
      if (transitioned.count === 0) {
        throw new ConflictException('Supplier return state changed concurrently');
      }
      await this.postSupplierReturnStock(tx, ret, user.id, 'Supplier return');
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'SUPPLIER_RETURN',
          entityId: ret.id,
          newValues: { status: ReturnStatus.POSTED },
        },
        tx,
      );
      return tx.supplierReturn.findUniqueOrThrow({
        where: { id },
        include: supplierReturnInclude,
      });
    });
  }

  async manuallyAcknowledgeSupplierReturn(user: RequestUser, id: string) {
    const ret = await this.getSupplierReturnRecord(user, id);
    if (ret.status === ReturnStatus.DONE || ret.status === ReturnStatus.POSTED) {
      return ret;
    }
    if (ret.status !== ReturnStatus.SUBMITTED) {
      throw new BadRequestException(
        `Only submitted returns can be manually accepted (current status: ${ret.status})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.supplierReturn.updateMany({
        where: { id, status: ReturnStatus.SUBMITTED },
        data: {
          status: ReturnStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
        },
      });
      if (transitioned.count === 0) {
        throw new ConflictException('Supplier return state changed concurrently');
      }

      await this.postSupplierReturnStock(tx, ret, user.id, 'Supplier return manually accepted');
      const updated = await tx.supplierReturn.update({
        where: { id },
        data: {
          status: ReturnStatus.DONE,
          postedAt: new Date(),
          updatedById: user.id,
        },
        include: supplierReturnInclude,
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'SUPPLIER_RETURN',
          entityId: updated.id,
          newValues: {
            status: updated.status,
            acknowledgedAt: updated.acknowledgedAt?.toISOString(),
            postedAt: updated.postedAt?.toISOString(),
            manualAcknowledge: true,
          },
        },
        tx,
      );

      return updated;
    });
  }

  private async findSupplierReturnByToken(token: string) {
    const ackTokenHash = hashToken(token);
    const ret = await this.prisma.supplierReturn.findFirst({
      where: { ackTokenHash },
      include: supplierReturnInclude,
    });
    if (!ret) {
      throw new NotFoundException('This acknowledgement link is invalid or has expired');
    }
    return ret;
  }

  private toSupplierReturnPortalView(ret: SupplierReturnRecord) {
    return {
      id: ret.id,
      returnNumber: ret.returnNumber,
      returnDate: ret.returnDate,
      status: ret.status,
      canAcknowledge: ret.status === ReturnStatus.SUBMITTED,
      acknowledgedAt: ret.acknowledgedAt,
      postedAt: ret.postedAt,
      supplierName: ret.supplier?.supplierName ?? ret.supplierName,
      grNumber: ret.goodsReceipt?.grNumber ?? '—',
      shopName: ret.shop.shopName,
      supplierRef: ret.supplierRef,
      remarks: ret.remarks,
      items: ret.items.map((item) => ({
        id: item.id,
        productCode: item.product?.productCode ?? item.goodsReceiptItem?.product?.productCode ?? '',
        description:
          item.product?.description ?? item.goodsReceiptItem?.product?.description ?? '',
        grnQuantity: item.grnQuantity?.toString() ?? item.goodsReceiptItem?.quantity.toString() ?? '0',
        returnQuantity: item.quantity.toString(),
        reason: reasonLabel(item.reasonCode),
        images: item.images.map((image) => ({
          id: image.id,
          url: image.publicUrl,
          filename: image.originalFilename,
        })),
      })),
    };
  }

  async getSupplierReturnPublic(token: string) {
    const ret = await this.findSupplierReturnByToken(token);
    return this.toSupplierReturnPortalView(ret);
  }

  async acknowledgeSupplierReturn(token: string) {
    const ret = await this.findSupplierReturnByToken(token);
    if (ret.status === ReturnStatus.DONE || ret.status === ReturnStatus.POSTED) {
      return {
        message: 'This return notice has already been acknowledged and stock has already been adjusted.',
        returnOrder: this.toSupplierReturnPortalView(ret),
      };
    }
    if (ret.status !== ReturnStatus.SUBMITTED) {
      throw new BadRequestException('This return notice is no longer awaiting acknowledgement');
    }

    const userId = ret.createdById ?? ret.updatedById;
    if (!userId) {
      throw new BadRequestException('Return order is missing its creator reference');
    }

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.supplierReturn.updateMany({
        where: { id: ret.id, status: ReturnStatus.SUBMITTED },
        data: {
          status: ReturnStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
        },
      });

      if (transitioned.count === 0) {
        const latest = await tx.supplierReturn.findUnique({
          where: { id: ret.id },
          include: supplierReturnInclude,
        });
        if (!latest) {
          throw new NotFoundException('Supplier return not found');
        }
        return {
          message: 'This return notice has already been acknowledged and stock has already been adjusted.',
          returnOrder: this.toSupplierReturnPortalView(latest),
        };
      }

      await this.postSupplierReturnStock(tx, ret, userId, 'Supplier return acknowledged');
      const updated = await tx.supplierReturn.update({
        where: { id: ret.id },
        data: {
          status: ReturnStatus.DONE,
          postedAt: new Date(),
          updatedById: userId,
        },
        include: supplierReturnInclude,
      });

      await this.audit.log(
        {
          userId,
          action: AuditAction.POST,
          entityType: 'SUPPLIER_RETURN',
          entityId: updated.id,
          newValues: {
            status: updated.status,
            acknowledgedAt: updated.acknowledgedAt?.toISOString(),
            postedAt: updated.postedAt?.toISOString(),
          },
        },
        tx,
      );

      return {
        message: 'Thank you. Your acknowledgement has been recorded and stock has been adjusted.',
        returnOrder: this.toSupplierReturnPortalView(updated),
      };
    });
  }

  async getSupplierReturn(user: RequestUser, id: string) {
    return this.getSupplierReturnRecord(user, id);
  }

  async listCustomerReturns(user: RequestUser) {
    return this.prisma.customerReturn.findMany({
      where: { shop: shopListWhere(user) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { customer: true },
    });
  }

  async listSupplierReturns(user: RequestUser) {
    return this.prisma.supplierReturn.findMany({
      where: { shop: shopListWhere(user) },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: supplierReturnInclude,
    });
  }
}
