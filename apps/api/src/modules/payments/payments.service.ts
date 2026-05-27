import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope } from '../../common/utils/shop-scope';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { asMoney, assertNonNegativeMoney, assertPositiveMoney, roundMoney } from '../../common/utils/money';
import { getIdempotentResult, setIdempotentResult } from '../../common/utils/idempotency';
import { runSerializableTxWithRetry } from '../../common/utils/serializable-tx';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SubscriptionService } from '../billing/subscription.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { paymentReceivedDefaults } from '../email-notifications/email-notifications.outbound';
import type { PaymentReceivedEmailContent } from '../../common/mail/transactional-email.templates';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numbers: DocumentNumberService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly mail: MailService,
  ) {}

  async list(
    user: RequestUser,
    query: { cursor?: string; take?: number; invoice_id?: string } = {},
  ) {
    const take = query.take && query.take > 0 ? Math.min(query.take, 100) : 20;
    const where: Prisma.PaymentReceiptWhereInput = {};
    if (user.shopId) where.shopId = user.shopId;
    if (query.invoice_id) where.invoiceId = query.invoice_id;

    const rows = await this.prisma.paymentReceipt.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        receiptNumber: true,
        receiptDate: true,
        amount: true,
        method: true,
        reference: true,
        invoiceId: true,
        shopId: true,
        invoice: { select: { id: true, invoiceNumber: true, totalValue: true, paidValue: true } },
      },
    });
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;
    return { data: items, meta: { nextCursor, limit: take, hasMore } };
  }

  async create(user: RequestUser, dto: CreatePaymentDto) {
    const amount = roundMoney(asMoney(dto.amount ?? 0));
    assertPositiveMoney(amount, 'Payment amount');

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const idempotencyKey = dto.idempotencyKey;
      const cached = await getIdempotentResult<{ paymentId: string }>(tx, idempotencyKey, 'payment:create');
      if (cached?.paymentId) {
        const prior = await tx.paymentReceipt.findUnique({
          where: { id: cached.paymentId },
          include: { invoice: true, shop: true },
        });
        if (prior) return prior;
      }

      // Re-read the invoice INSIDE the transaction so that concurrent payments
      // cannot both observe the same paid_value and overpay (lost-update race).
      const invoice = await tx.invoiceHeader.findUnique({ where: { id: dto.invoiceId } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      assertShopScope(user, invoice.shopId);
      await this.subscriptions.assertFeatureForShop(invoice.shopId, 'payments');

      if (invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Cannot collect payment on a voided invoice');
      }

      const openBalance = roundMoney(asMoney(invoice.totalValue).sub(invoice.paidValue));
      assertNonNegativeMoney(openBalance, 'Invoice open balance');
      if (amount.gt(openBalance)) {
        throw new BadRequestException(
          `Payment amount exceeds open balance (${openBalance.toString()})`,
        );
      }

      const newPaid = roundMoney(asMoney(invoice.paidValue).add(amount));
      const status = newPaid.greaterThanOrEqualTo(invoice.totalValue)
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

      // Conditional update: only succeeds if paid_value is still the value we
      // observed. Concurrent payment attempts will affect 0 rows here and we
      // surface a 409 so the client can retry against the new state.
      const updated = await tx.invoiceHeader.updateMany({
        where: { id: invoice.id, paidValue: invoice.paidValue },
        data: {
          paidValue: newPaid,
          status,
          updatedById: user.id,
        },
      });
      if (updated.count === 0) {
        throw new ConflictException(
          'Invoice was modified by another payment. Please retry.',
        );
      }

      const receiptNumber =
        dto.receiptNumber?.trim() ||
        (await this.numbers.nextNumber(tx, {
          shopId: invoice.shopId,
          docType: 'RCPT',
          prefix: 'RCPT',
          date: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
        }));

      const payment = await tx.paymentReceipt.create({
        data: {
          receiptNumber,
          receiptDate: dto.receiptDate ? new Date(dto.receiptDate) : new Date(),
          invoiceId: invoice.id,
          shopId: invoice.shopId,
          amount,
          method: dto.method ?? null,
          reference: dto.reference ?? null,
          remarks: dto.remarks ?? null,
          createdById: user.id,
        },
        include: { invoice: { include: { customer: true } }, shop: true },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'PAYMENT_RECEIPT',
          entityId: payment.id,
          newValues: {
            receiptNumber: payment.receiptNumber,
            invoiceId: payment.invoiceId,
            amount: payment.amount.toString(),
            status,
          },
        },
        tx,
      );

      await setIdempotentResult(
        tx,
        idempotencyKey,
        { paymentId: payment.id },
        user.id,
        'payment:create',
      );

      return payment;
    }).then(async (payment) => {
      await this.sendPaymentReceivedEmail(payment).catch(() => undefined);
      return payment;
    });
  }

  private async sendPaymentReceivedEmail(payment: {
    receiptNumber: string;
    amount: Prisma.Decimal;
    shopId: string;
    invoice: {
      invoiceNumber: string;
      totalValue: Prisma.Decimal;
      paidValue: Prisma.Decimal;
      customer?: { customerName: string; email: string | null } | null;
    };
  }) {
    const recipient = payment.invoice.customer?.email?.trim();
    if (!recipient) return;

    const shop = await this.prisma.shop.findUnique({
      where: { id: payment.shopId },
      select: { company: { select: { companyName: true } } },
    });

    const formatMoney = (value: Prisma.Decimal | number) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(Number(value));

    const balance = Number(payment.invoice.totalValue) - Number(payment.invoice.paidValue);
    const content: PaymentReceivedEmailContent = {
      customerName: payment.invoice.customer?.customerName ?? 'Customer',
      invoiceNumber: payment.invoice.invoiceNumber,
      receiptNumber: payment.receiptNumber,
      amountPaid: formatMoney(payment.amount),
      balanceDue: formatMoney(Math.max(balance, 0)),
      paymentType: balance <= 0 ? 'Full' : 'Partial',
      companyName: shop?.company?.companyName ?? 'Softdigit Consulting',
    };

    const defaults = paymentReceivedDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      payment.shopId,
      'payment_received',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) return;

    await this.mail.sendPaymentReceived({
      to: recipient,
      content,
      overrides: prepared,
    });
  }
}
