import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, DocumentEmailTrigger, InvoiceStatus, Prisma, SalesOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { asMoney, assertNonNegativeMoney, roundMoney } from '../../common/utils/money';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { tryGetIdempotentResult, trySetIdempotentResult } from '../../common/utils/idempotency';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { SubscriptionService } from '../billing/subscription.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { invoiceCreatedDefaults } from '../email-notifications/email-notifications.outbound';
import type { InvoiceCreatedEmailContent } from '../../common/mail/transactional-email.templates';
import { formatEmailDate, formatEmailMoney } from '../../common/mail/email-formatters';
import { DocumentEmailService } from '../document-email/document-email.service';

export type InvoiceListQuery = {
  shop_id?: string;
  status?: InvoiceStatus;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  take?: number;
};

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly numbers: DocumentNumberService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  async list(user: RequestUser, query: InvoiceListQuery = {}) {
    const take = clampTake(query.take);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.InvoiceHeaderWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
    };
    if (query.status) where.status = query.status;
    if (query.customer_id) where.customerId = query.customer_id;
    if (query.date_from || query.date_to) {
      where.invoiceDate = {};
      if (query.date_from) where.invoiceDate.gte = new Date(query.date_from);
      if (query.date_to) where.invoiceDate.lte = new Date(query.date_to);
    }

    const rows = await this.prisma.invoiceHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        status: true,
        totalValue: true,
        paidValue: true,
        salesOrderId: true,
        shopId: true,
        customerId: true,
        customer: { select: { id: true, customerCode: true, customerName: true } },
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  async create(user: RequestUser, dto: CreateInvoiceDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    await this.subscriptions.assertFeatureForShop(shopId, 'invoices');

    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
      select: { shopId: true },
    });
    if (!customer || customer.shopId !== shopId) {
      throw new BadRequestException('Customer must belong to the selected shop');
    }

    const totalValue = roundMoney(asMoney(dto.totalValue ?? 0));
    assertNonNegativeMoney(totalValue, 'Invoice total');

    const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();

    const idempotencyScope = user.companyId
      ? `company:${user.companyId}`
      : user.shopId
        ? `shop:${user.shopId}`
        : 'global';
    const idempotencyCacheKey = dto.idempotencyKey?.trim()
      ? `invoice:create:${dto.idempotencyKey.trim()}`
      : undefined;

    const { invoice, replayed } = await this.prisma.$transaction(async (tx) => {
      const existing = await tryGetIdempotentResult<{ invoiceId: string }>(
        tx,
        idempotencyCacheKey,
        idempotencyScope,
      );
      if (existing?.invoiceId) {
        const prior = await tx.invoiceHeader.findUnique({
          where: { id: existing.invoiceId },
          include: { customer: true, salesOrder: true, payments: true },
        });
        if (prior) return { invoice: prior, replayed: true };
      }

      if (dto.salesOrderId) {
        const so = await tx.salesOrderHeader.findUnique({
          where: { id: dto.salesOrderId },
          include: { invoices: { select: { id: true, status: true } } },
        });
        if (!so) throw new NotFoundException('Sales order not found');
        if (so.shopId !== shopId) {
          throw new BadRequestException('Sales order belongs to a different shop');
        }
        if (
          so.status === SalesOrderStatus.CANCELLED ||
          so.status === SalesOrderStatus.DRAFT
        ) {
          throw new BadRequestException(
            'Cannot invoice a sales order that is DRAFT or CANCELLED',
          );
        }
        const hasOpenInvoice = so.invoices.some(
          (inv) => inv.status !== InvoiceStatus.VOID,
        );
        if (hasOpenInvoice) {
          throw new ConflictException('This sales order has already been invoiced');
        }
      }

      const invoiceNumber =
        dto.invoiceNumber?.trim() ||
        (await this.numbers.nextNumber(tx, {
          shopId,
          docType: 'INV',
          prefix: 'INV',
          date: invoiceDate,
        }));

      const invoice = await tx.invoiceHeader.create({
        data: {
          invoiceNumber,
          invoiceDate,
          salesOrderId: dto.salesOrderId ?? null,
          customerId: dto.customerId,
          shopId,
          status: InvoiceStatus.ISSUED,
          totalValue,
          paidValue: new Prisma.Decimal(0),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          remarks: dto.remarks ?? null,
          createdById: user.id,
        },
        include: { customer: true, salesOrder: true, payments: true },
      });

      await this.audit.logTenant(
        user,
        {
          action: AuditAction.CREATE,
          entityType: 'INVOICE',
          entityId: invoice.id,
          newValues: {
            invoiceNumber: invoice.invoiceNumber,
            customerId: invoice.customerId,
            totalValue: invoice.totalValue.toString(),
            salesOrderId: invoice.salesOrderId,
          },
        },
        tx,
      );

      await trySetIdempotentResult(
        tx,
        idempotencyCacheKey,
        { invoiceId: invoice.id },
        user.id,
        idempotencyScope,
      );

      return { invoice, replayed: false };
    });

    // A replayed create already emailed the customer the first time.
    if (!replayed) {
      await this.autoSendInvoiceCreatedEmail(user, invoice).catch(() => undefined);
    }
    return invoice;
  }

  async sendToCustomer(user: RequestUser, id: string, options?: { resend?: boolean }) {
    const invoice = await this.get(user, id);
    const recipient = invoice.customer.email?.trim();
    if (!recipient) {
      throw new BadRequestException(
        `Customer email is missing for "${invoice.customer.customerName}". Add an email on the customer record and try again.`,
      );
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: invoice.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) {
      throw new BadRequestException('Shop not linked to a company');
    }

    const content = this.buildInvoiceEmailContent(invoice, shop.company?.companyName ?? 'Company');
    const defaults = invoiceCreatedDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      invoice.shopId,
      'invoice_created',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Invoice email notifications are disabled in settings.');
    }

    const trigger = options?.resend ? DocumentEmailTrigger.RESEND : DocumentEmailTrigger.MANUAL;
    return this.documentEmail.sendInvoiceEmail(user, {
      invoiceId: id,
      companyId: shop.companyId,
      shopId: invoice.shopId,
      recipient,
      content,
      prepared,
      documentNumber: invoice.invoiceNumber,
      trigger,
    });
  }

  private buildInvoiceEmailContent(
    invoice: {
      invoiceNumber: string;
      invoiceDate: Date;
      dueDate: Date | null;
      totalValue: Prisma.Decimal;
      customer: { customerName: string };
    },
    companyName: string,
  ): InvoiceCreatedEmailContent {
    return {
      customerName: invoice.customer.customerName,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: formatEmailDate(invoice.invoiceDate),
      dueDate: formatEmailDate(invoice.dueDate),
      totalAmount: formatEmailMoney(invoice.totalValue),
      companyName,
    };
  }

  private async autoSendInvoiceCreatedEmail(
    user: RequestUser,
    invoice: {
      id: string;
      shopId: string;
      invoiceNumber: string;
      invoiceDate: Date;
      dueDate: Date | null;
      totalValue: Prisma.Decimal;
      customer: { customerName: string; email: string | null };
    },
  ) {
    const recipient = invoice.customer.email?.trim();
    if (!recipient) return;

    const shop = await this.prisma.shop.findUnique({
      where: { id: invoice.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) return;

    const content = this.buildInvoiceEmailContent(invoice, shop.company?.companyName ?? 'Company');
    const defaults = invoiceCreatedDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      invoice.shopId,
      'invoice_created',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) return;

    await this.documentEmail.sendInvoiceEmail(user, {
      invoiceId: invoice.id,
      companyId: shop.companyId,
      shopId: invoice.shopId,
      recipient,
      content,
      prepared,
      documentNumber: invoice.invoiceNumber,
      trigger: DocumentEmailTrigger.AUTO,
    });
  }

  async get(user: RequestUser, id: string) {
    const invoice = await this.prisma.invoiceHeader.findUnique({
      where: { id },
      include: { customer: true, salesOrder: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    assertShopScope(user, invoice.shopId);
    await this.subscriptions.assertFeatureForShop(invoice.shopId, 'invoices');
    return invoice;
  }
}
