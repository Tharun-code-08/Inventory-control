import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, DocumentEmailTrigger, Prisma, SupplierBillStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import {
  assertShopScope,
  assertSupplierInTenant,
  shopListWhere,
} from '../../common/utils/shop-scope';
import { assertNonNegativeMoney, roundMoney } from '../../common/utils/money';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateSupplierBillDto } from './dto/create-supplier-bill.dto';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { supplierBillIssuedDefaults } from '../email-notifications/email-notifications.outbound';
import type { SupplierBillIssuedEmailContent } from '../../common/mail/transactional-email.templates';
import { formatEmailDate, formatEmailMoney } from '../../common/mail/email-formatters';
import { DocumentEmailService } from '../document-email/document-email.service';
import { assertGrAction, assertSupplierBillAction } from '../../common/state-machines/assert-action';
import { GrAction, SupplierBillAction } from '../../common/state-machines/document-actions';
import {
  buildDocumentActionAudit,
  buildStatusTransitionAudit,
} from '../../common/state-machines/document-audit';
import { assertSupplierBillMutationAllowed, grHasOpenBill } from '../../common/utils/procurement-downstream';
import { assertSupplierBillTransition } from '../../common/state-machines/assert-transition';
import { VoidSupplierBillDto } from './dto/void-supplier-bill.dto';

export type SupplierBillListQuery = {
  shop_id?: string;
  status?: SupplierBillStatus;
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  take?: number;
};

@Injectable()
export class SupplierBillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numbers: DocumentNumberService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  async list(user: RequestUser, query: SupplierBillListQuery = {}) {
    const take = clampTake(query.take);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.SupplierBillHeaderWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
    };
    if (query.status) where.status = query.status;
    if (query.supplier_id) where.supplierId = query.supplier_id;
    if (query.date_from || query.date_to) {
      where.billDate = {};
      if (query.date_from) where.billDate.gte = new Date(query.date_from);
      if (query.date_to) where.billDate.lte = new Date(query.date_to);
    }

    const rows = await this.prisma.supplierBillHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        dueDate: true,
        status: true,
        totalValue: true,
        paidValue: true,
        purchaseOrderId: true,
        goodsReceiptId: true,
        shopId: true,
        supplierId: true,
        supplier: { select: { id: true, supplierCode: true, supplierName: true } },
        purchaseOrder: { select: { poNumber: true } },
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async get(user: RequestUser, id: string) {
    const bill = await this.prisma.supplierBillHeader.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        goodsReceipt: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
    if (!bill) throw new NotFoundException('Supplier bill not found');
    assertShopScope(user, bill.shopId);
    return bill;
  }

  async createFromGoodsReceipt(
    user: RequestUser,
    goodsReceiptId: string,
    dto: CreateSupplierBillDto = {},
  ) {
    const bill = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'gr-bill:' + goodsReceiptId}::text))`;

      const gr = await tx.goodsReceiptHeader.findUnique({
        where: { id: goodsReceiptId },
        include: {
          items: true,
          purchaseOrder: true,
          supplierBills: { select: { id: true, status: true } },
          shop: { select: { id: true, companyId: true } },
        },
      });
      if (!gr) throw new NotFoundException('Goods receipt not found');
      assertShopScope(user, gr.shopId);

      assertGrAction(gr.status, GrAction.CREATE_BILL);

      if (await grHasOpenBill(tx, gr.id)) {
        throw new ConflictException('This goods receipt has already been billed');
      }

      if (!gr.items.length) {
        throw new BadRequestException('Goods receipt has no line items');
      }

      const companyId = gr.shop.companyId;
      if (!companyId) {
        throw new BadRequestException('Shop not linked to a company');
      }

      let supplierId = dto.supplierId;
      if (supplierId) {
        const supplier = await tx.supplier.findUnique({
          where: { id: supplierId },
          select: { companyId: true },
        });
        if (!supplier) throw new NotFoundException('Supplier not found');
        assertSupplierInTenant(user, supplier.companyId);
      } else {
        const supplierName = gr.supplierName.trim();
        const supplier = await tx.supplier.findFirst({
          where: {
            companyId,
            supplierName: { equals: supplierName, mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (!supplier) {
          throw new BadRequestException(
            `Supplier "${supplierName}" not found. Provide supplierId in the request body.`,
          );
        }
        supplierId = supplier.id;
      }

      const billDate = dto.billDate ? new Date(dto.billDate) : gr.grDate;
      const totalValue = roundMoney(
        gr.items.reduce((sum, item) => sum.add(item.lineValue), new Prisma.Decimal(0)),
      );
      assertNonNegativeMoney(totalValue, 'Supplier bill total');

      const billNumber =
        dto.billNumber?.trim() ||
        (await this.numbers.nextNumber(tx, {
          shopId: gr.shopId,
          docType: 'SBILL',
          prefix: 'SBILL',
          date: billDate,
        }));

      const bill = await tx.supplierBillHeader.create({
        data: {
          billNumber,
          billDate,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          shopId: gr.shopId,
          supplierId,
          purchaseOrderId: gr.purchaseOrderId,
          goodsReceiptId: gr.id,
          status: SupplierBillStatus.ISSUED,
          totalValue,
          paidValue: new Prisma.Decimal(0),
          remarks: dto.remarks ?? null,
          createdById: user.id,
          items: {
            create: gr.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              uom: item.uom,
              unitCost: item.purchaseRate,
              lineValue: item.lineValue,
            })),
          },
        },
        include: {
          supplier: true,
          purchaseOrder: true,
          goodsReceipt: true,
          items: { include: { product: true } },
        },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'SUPPLIER_BILL',
          entityId: bill.id,
          newValues: {
            billNumber: bill.billNumber,
            supplierId: bill.supplierId,
            totalValue: bill.totalValue.toString(),
            goodsReceiptId: bill.goodsReceiptId,
            purchaseOrderId: bill.purchaseOrderId,
            status: bill.status,
          },
        },
        tx,
      );
      await this.audit.log(
        buildStatusTransitionAudit({
          userId: user.id,
          entityType: 'SUPPLIER_BILL',
          entityId: bill.id,
          fromStatus: SupplierBillStatus.DRAFT,
          toStatus: SupplierBillStatus.ISSUED,
          reason: 'createFromGoodsReceipt',
          action: AuditAction.POST,
        }),
        tx,
      );
      await this.audit.log(
        buildDocumentActionAudit({
          userId: user.id,
          entityType: 'SUPPLIER_BILL',
          entityId: bill.id,
          action: 'CREATE_BILL_FROM_GR',
          result: 'success',
          detail: { goodsReceiptId: gr.id },
        }),
        tx,
      );

      return bill;
    });

    await this.autoSendSupplierBillEmail(user, bill).catch(() => undefined);
    return bill;
  }

  async sendToSupplier(user: RequestUser, id: string, options?: { resend?: boolean }) {
    const bill = await this.get(user, id);
    assertSupplierBillAction(bill.status, SupplierBillAction.SEND);
    const recipient = bill.supplier.email?.trim();
    if (!recipient) {
      throw new BadRequestException(
        `Supplier email is missing for "${bill.supplier.supplierName}". Add an email on the supplier record and try again.`,
      );
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: bill.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) {
      throw new BadRequestException('Shop not linked to a company');
    }

    const content = this.buildSupplierBillEmailContent(bill, shop.company?.companyName ?? 'Company');
    const defaults = supplierBillIssuedDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      bill.shopId,
      'supplier_bill_issued',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Supplier bill email notifications are disabled in settings.');
    }

    const trigger = options?.resend ? DocumentEmailTrigger.RESEND : DocumentEmailTrigger.MANUAL;
    const result = await this.documentEmail.sendSupplierBillEmail(user, {
      billId: id,
      companyId: shop.companyId,
      shopId: bill.shopId,
      recipient,
      content,
      prepared,
      documentNumber: bill.billNumber,
      trigger,
    });

    await this.audit.log(
      buildDocumentActionAudit({
        userId: user.id,
        entityType: 'SUPPLIER_BILL',
        entityId: id,
        action: options?.resend ? 'RESEND_SUPPLIER_BILL' : 'SEND_SUPPLIER_BILL',
        result: 'success',
        detail: { recipient, queued: result.queued ?? false },
      }),
    );

    return result;
  }

  async voidBill(user: RequestUser, id: string, dto: VoidSupplierBillDto = {}) {
    const bill = await this.get(user, id);
    if (bill.status === SupplierBillStatus.VOID) return bill;

    assertSupplierBillAction(bill.status, SupplierBillAction.VOID);
    await assertSupplierBillMutationAllowed(this.prisma, { billId: id, action: 'void' });
    assertSupplierBillTransition(bill.status, SupplierBillStatus.VOID);

    const reason = dto.reason?.trim() || null;

    return this.prisma.$transaction(async (tx) => {
      const transitioned = await tx.supplierBillHeader.updateMany({
        where: {
          id,
          status: SupplierBillStatus.ISSUED,
          paidValue: new Prisma.Decimal(0),
        },
        data: {
          status: SupplierBillStatus.VOID,
          updatedById: user.id,
          ...(reason ? { remarks: reason } : {}),
        },
      });
      if (transitioned.count === 0) {
        throw new BadRequestException(
          'Only unpaid issued supplier bills can be voided',
        );
      }

      const updated = await tx.supplierBillHeader.findUniqueOrThrow({
        where: { id },
        include: {
          supplier: true,
          purchaseOrder: true,
          goodsReceipt: true,
          items: { include: { product: true } },
        },
      });

      await this.audit.log(
        buildStatusTransitionAudit({
          userId: user.id,
          entityType: 'SUPPLIER_BILL',
          entityId: id,
          fromStatus: SupplierBillStatus.ISSUED,
          toStatus: SupplierBillStatus.VOID,
          reason,
        }),
        tx,
      );
      await this.audit.log(
        buildDocumentActionAudit({
          userId: user.id,
          entityType: 'SUPPLIER_BILL',
          entityId: id,
          action: 'VOID_SUPPLIER_BILL',
          result: 'success',
          detail: { reason },
        }),
        tx,
      );

      return updated;
    });
  }

  private buildSupplierBillEmailContent(
    bill: {
      billNumber: string;
      billDate: Date;
      dueDate: Date | null;
      totalValue: Prisma.Decimal;
      supplier: { supplierName: string };
      purchaseOrder?: { poNumber: string } | null;
    },
    companyName: string,
  ): SupplierBillIssuedEmailContent {
    return {
      supplierName: bill.supplier.supplierName,
      billNumber: bill.billNumber,
      billDate: formatEmailDate(bill.billDate),
      dueDate: formatEmailDate(bill.dueDate),
      totalAmount: formatEmailMoney(bill.totalValue),
      poNumber: bill.purchaseOrder?.poNumber ?? '—',
      companyName,
    };
  }

  private async autoSendSupplierBillEmail(
    user: RequestUser,
    bill: {
      id: string;
      shopId: string;
      billNumber: string;
      billDate: Date;
      dueDate: Date | null;
      totalValue: Prisma.Decimal;
      supplier: { supplierName: string; email: string | null };
      purchaseOrder?: { poNumber: string } | null;
    },
  ) {
    const recipient = bill.supplier.email?.trim();
    if (!recipient) return;

    const shop = await this.prisma.shop.findUnique({
      where: { id: bill.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) return;

    const content = this.buildSupplierBillEmailContent(bill, shop.company?.companyName ?? 'Company');
    const defaults = supplierBillIssuedDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      bill.shopId,
      'supplier_bill_issued',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) return;

    await this.documentEmail.sendSupplierBillEmail(user, {
      billId: bill.id,
      companyId: shop.companyId,
      shopId: bill.shopId,
      recipient,
      content,
      prepared,
      documentNumber: bill.billNumber,
      trigger: DocumentEmailTrigger.AUTO,
    });
  }
}
