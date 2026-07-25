import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DocumentEmailTrigger, Prisma, SupplierBillStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { assertCompanyId } from '../../common/utils/assert-company-id';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { asMoney, assertNonNegativeMoney, assertPositiveMoney, roundMoney } from '../../common/utils/money';
import { getIdempotentResult, setIdempotentResult } from '../../common/utils/idempotency';
import { runSerializableTxWithRetry } from '../../common/utils/serializable-tx';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ReverseSupplierPaymentDto } from './dto/reverse-supplier-payment.dto';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { supplierPaymentRecordedDefaults } from '../email-notifications/email-notifications.outbound';
import type { SupplierPaymentRecordedEmailContent } from '../../common/mail/transactional-email.templates';
import { formatEmailMoney } from '../../common/mail/email-formatters';
import { DocumentEmailService } from '../document-email/document-email.service';
import { assertSupplierBillAction } from '../../common/state-machines/assert-action';
import { assertSupplierBillReversalTransition, assertSupplierBillTransition } from '../../common/state-machines/assert-transition';
import { SupplierBillAction, SupplierPaymentAction } from '../../common/state-machines/document-actions';
import {
  buildDocumentActionAudit,
  buildStatusTransitionAudit,
} from '../../common/state-machines/document-audit';

@Injectable()
export class SupplierPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numbers: DocumentNumberService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  async list(
    user: RequestUser,
    query: { cursor?: string; take?: number; supplier_bill_id?: string } = {},
  ) {
    const take = query.take && query.take > 0 ? Math.min(query.take, 100) : 20;
    const where: Prisma.SupplierPaymentWhereInput = { shop: shopListWhere(user) };
    if (query.supplier_bill_id) where.supplierBillId = query.supplier_bill_id;

    const rows = await this.prisma.supplierPayment.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        paymentNumber: true,
        paymentDate: true,
        amount: true,
        method: true,
        reference: true,
        supplierBillId: true,
        shopId: true,
        supplierBill: {
          select: { id: true, billNumber: true, totalValue: true, paidValue: true },
        },
      },
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
    return { data: items, meta: { nextCursor, limit: take, hasMore } };
  }

  async create(user: RequestUser, dto: CreateSupplierPaymentDto) {
    const amount = roundMoney(asMoney(dto.amount ?? 0));
    assertPositiveMoney(amount, 'Payment amount');

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const idempotencyKey = dto.idempotencyKey;
      const cached = await getIdempotentResult<{ paymentId: string }>(
        tx,
        idempotencyKey,
        'supplier-payment:create',
      );
      if (cached?.paymentId) {
        const prior = await tx.supplierPayment.findUnique({
          where: { id: cached.paymentId },
          include: { supplierBill: { include: { supplier: true } }, shop: true },
        });
        if (prior) return prior;
      }

      const bill = await tx.supplierBillHeader.findUnique({ where: { id: dto.supplierBillId } });
      if (!bill) throw new NotFoundException('Supplier bill not found');
      assertShopScope(user, bill.shopId);

      if (bill.status === SupplierBillStatus.VOID) {
        throw new BadRequestException('Cannot pay a voided supplier bill');
      }
      assertSupplierBillAction(bill.status, SupplierBillAction.RECORD_PAYMENT);

      const openBalance = roundMoney(asMoney(bill.totalValue).sub(bill.paidValue));
      assertNonNegativeMoney(openBalance, 'Supplier bill open balance');
      if (amount.gt(openBalance)) {
        throw new BadRequestException(
          `Payment amount exceeds open balance (${openBalance.toString()})`,
        );
      }

      const newPaid = roundMoney(asMoney(bill.paidValue).add(amount));
      const status = newPaid.greaterThanOrEqualTo(bill.totalValue)
        ? SupplierBillStatus.PAID
        : SupplierBillStatus.PARTIALLY_PAID;

      if (status !== bill.status) {
        assertSupplierBillTransition(bill.status, status);
      }

      const updated = await tx.supplierBillHeader.updateMany({
        where: { id: bill.id, paidValue: bill.paidValue },
        data: {
          paidValue: newPaid,
          status,
          updatedById: user.id,
        },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          'Supplier bill was modified by another payment. Please retry.',
        );
      }

      const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
      const paymentNumber =
        dto.paymentNumber?.trim() ||
        (await this.numbers.nextNumber(tx, {
          shopId: bill.shopId,
          docType: 'SPAY',
          prefix: 'SPAY',
          date: paymentDate,
        }));

      const payment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          paymentDate,
          supplierBillId: bill.id,
          shopId: bill.shopId,
          amount,
          method: dto.method ?? null,
          reference: dto.reference ?? null,
          remarks: dto.remarks ?? null,
          createdById: user.id,
        },
        include: { supplierBill: { include: { supplier: true } }, shop: true },
      });

      await this.audit.logTenant(
        user,
        {
          action: AuditAction.POST,
          entityType: 'SUPPLIER_PAYMENT',
          entityId: payment.id,
          newValues: {
            paymentNumber: payment.paymentNumber,
            supplierBillId: payment.supplierBillId,
            amount: payment.amount.toString(),
            billStatus: status,
          },
        },
        tx,
      );

      if (status !== bill.status) {
        await this.audit.log(
          buildStatusTransitionAudit({
            companyId: assertCompanyId(user),
            userId: user.id,
            entityType: 'SUPPLIER_BILL',
            entityId: bill.id,
            fromStatus: bill.status,
            toStatus: status,
            reason: 'paymentRecorded',
          }),
          tx,
        );
      }

      await this.audit.log(
        buildDocumentActionAudit({
          companyId: assertCompanyId(user),
          userId: user.id,
          entityType: 'SUPPLIER_PAYMENT',
          entityId: payment.id,
          action: 'RECORD_SUPPLIER_PAYMENT',
          result: 'success',
          detail: {
            supplierBillId: bill.id,
            amount: payment.amount.toString(),
            billStatus: status,
          },
        }),
        tx,
      );

      await setIdempotentResult(
        tx,
        idempotencyKey,
        { paymentId: payment.id },
        user.id,
        'supplier-payment:create',
      );

      return payment;
    }).then(async (payment) => {
      await this.autoSendSupplierPaymentEmail(user, payment).catch(() => undefined);
      return payment;
    });
  }

  async reverse(user: RequestUser, id: string, dto: ReverseSupplierPaymentDto = {}) {
    const reason = dto.reason?.trim() || null;

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const payment = await tx.supplierPayment.findUnique({
        where: { id },
        include: { supplierBill: true },
      });
      if (!payment) throw new NotFoundException('Supplier payment not found');
      assertShopScope(user, payment.shopId);

      const bill = payment.supplierBill;
      if (bill.status === SupplierBillStatus.VOID) {
        throw new BadRequestException('Cannot reverse a payment on a voided supplier bill');
      }

      const newPaid = roundMoney(asMoney(bill.paidValue).sub(payment.amount));
      if (newPaid.lt(0)) {
        throw new BadRequestException('Payment reversal would make the bill paid value negative');
      }

      const newStatus = newPaid.eq(0)
        ? SupplierBillStatus.ISSUED
        : newPaid.greaterThanOrEqualTo(bill.totalValue)
          ? SupplierBillStatus.PAID
          : SupplierBillStatus.PARTIALLY_PAID;

      if (newStatus !== bill.status) {
        assertSupplierBillReversalTransition(bill.status, newStatus);
      }

      const updatedBill = await tx.supplierBillHeader.updateMany({
        where: { id: bill.id, paidValue: bill.paidValue },
        data: {
          paidValue: newPaid,
          status: newStatus,
          updatedById: user.id,
        },
      });
      if (updatedBill.count === 0) {
        throw new ConflictException(
          'Supplier bill was modified concurrently. Refresh and retry the reversal.',
        );
      }

      await tx.supplierPayment.delete({ where: { id } });

      if (newStatus !== bill.status) {
        await this.audit.log(
          buildStatusTransitionAudit({
            companyId: assertCompanyId(user),
            userId: user.id,
            entityType: 'SUPPLIER_BILL',
            entityId: bill.id,
            fromStatus: bill.status,
            toStatus: newStatus,
            reason: reason ?? 'paymentReversed',
          }),
          tx,
        );
      }

      await this.audit.log(
        buildDocumentActionAudit({
          companyId: assertCompanyId(user),
          userId: user.id,
          entityType: 'SUPPLIER_PAYMENT',
          entityId: payment.id,
          action: SupplierPaymentAction.REVERSE,
          result: 'success',
          detail: {
            supplierBillId: bill.id,
            amount: payment.amount.toString(),
            reason,
            billStatus: newStatus,
            paidValue: newPaid.toString(),
          },
        }),
        tx,
      );

      return {
        ok: true,
        reversedPaymentId: payment.id,
        supplierBillId: bill.id,
        paidValue: newPaid.toString(),
        status: newStatus,
      };
    });
  }

  async get(user: RequestUser, id: string) {
    const payment = await this.prisma.supplierPayment.findUnique({
      where: { id },
      include: { supplierBill: { include: { supplier: true } }, shop: true },
    });
    if (!payment) throw new NotFoundException('Supplier payment not found');
    assertShopScope(user, payment.shopId);
    return payment;
  }

  async sendToSupplier(user: RequestUser, id: string, options?: { resend?: boolean }) {
    const payment = await this.get(user, id);
    const supplier = payment.supplierBill.supplier;
    const recipient = supplier.email?.trim();
    if (!recipient) {
      throw new BadRequestException(
        `Supplier email is missing for "${supplier.supplierName}". Add an email on the supplier record and try again.`,
      );
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: payment.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) {
      throw new BadRequestException('Shop not linked to a company');
    }

    const content = this.buildSupplierPaymentEmailContent(payment, shop.company?.companyName ?? 'Company');
    const defaults = supplierPaymentRecordedDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      payment.shopId,
      'supplier_payment_recorded',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Supplier payment email notifications are disabled in settings.');
    }

    const trigger = options?.resend ? DocumentEmailTrigger.RESEND : DocumentEmailTrigger.MANUAL;
    return this.documentEmail.sendSupplierPaymentEmail(user, {
      paymentId: id,
      companyId: shop.companyId,
      shopId: payment.shopId,
      recipient,
      content,
      prepared,
      documentNumber: payment.paymentNumber,
      trigger,
    });
  }

  private buildSupplierPaymentEmailContent(
    payment: {
      paymentNumber: string;
      amount: Prisma.Decimal;
      supplierBill: {
        billNumber: string;
        totalValue: Prisma.Decimal;
        paidValue: Prisma.Decimal;
        supplier: { supplierName: string };
      };
    },
    companyName: string,
  ): SupplierPaymentRecordedEmailContent {
    const balance =
      Number(payment.supplierBill.totalValue) - Number(payment.supplierBill.paidValue);
    return {
      supplierName: payment.supplierBill.supplier.supplierName,
      billNumber: payment.supplierBill.billNumber,
      paymentNumber: payment.paymentNumber,
      amountPaid: formatEmailMoney(payment.amount),
      balanceDue: formatEmailMoney(Math.max(balance, 0)),
      paymentType: balance <= 0 ? 'Full' : 'Partial',
      companyName,
    };
  }

  private async autoSendSupplierPaymentEmail(
    user: RequestUser,
    payment: {
      id: string;
      paymentNumber: string;
      amount: Prisma.Decimal;
      shopId: string;
      supplierBill: {
        billNumber: string;
        totalValue: Prisma.Decimal;
        paidValue: Prisma.Decimal;
        supplier: { supplierName: string; email: string | null };
      };
    },
  ) {
    const recipient = payment.supplierBill.supplier.email?.trim();
    if (!recipient) return;

    const shop = await this.prisma.shop.findUnique({
      where: { id: payment.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) return;

    const content = this.buildSupplierPaymentEmailContent(payment, shop.company?.companyName ?? 'Company');
    const defaults = supplierPaymentRecordedDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      payment.shopId,
      'supplier_payment_recorded',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) return;

    await this.documentEmail.sendSupplierPaymentEmail(user, {
      paymentId: payment.id,
      companyId: shop.companyId,
      shopId: payment.shopId,
      recipient,
      content,
      prepared,
      documentNumber: payment.paymentNumber,
      trigger: DocumentEmailTrigger.AUTO,
    });
  }
}
