import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, SalesOrderStatus, SalesQuotationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { MailService, type EmailDeliveryResult } from '../../common/mail/mail.service';
import { buildQuotationPortalReviewUrl } from '../../common/mail/portal-url';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { asMoney, roundMoney } from '../../common/utils/money';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto';
import { UpdateSalesQuotationDto } from './dto/update-sales-quotation.dto';
import { SubscriptionService } from '../billing/subscription.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { salesQuotationDefaults } from '../email-notifications/email-notifications.outbound';

@Injectable()
export class SalesQuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
  ) {}

  private computeLines(items: CreateSalesQuotationDto['items']) {
    let total = new Prisma.Decimal(0);
    const lines = items.map((item) => {
      const quantity = asMoney(item.quantity ?? 0);
      const unitPrice = asMoney(item.unitPrice ?? 0);
      const lineValue = roundMoney(quantity.mul(unitPrice));
      total = total.add(lineValue);
      return {
        productId: item.productId,
        quantity,
        uom: item.uom ?? 'UNIT',
        unitPrice: roundMoney(unitPrice),
        lineValue,
      };
    });
    return { lines, total: roundMoney(total) };
  }

  private newPortalToken(): string {
    return randomBytes(32).toString('hex');
  }

  private async emailQuotation(
    row: Awaited<ReturnType<typeof this.get>>,
    options: { portalToken: string; isRevision?: boolean },
  ): Promise<EmailDeliveryResult> {
    const customerEmail = row.customer.email?.trim();
    if (!customerEmail) {
      throw new BadRequestException(
        'Customer has no email address. Add an email on the customer profile before sending.',
      );
    }

    const portalUrl = buildQuotationPortalReviewUrl(this.config, options.portalToken);
    const emailContent = this.mail.buildSalesQuotationEmailContent({
      customerName: row.customer.customerName,
      quoteNumber: row.quoteNumber,
      quoteDate: row.quoteDate,
      validUntil: row.validUntil,
      shopName: row.shop.shopName,
      remarks: row.remarks,
      totalValue: row.totalValue ?? 0,
      items: row.items,
      portalUrl,
      isRevision: options.isRevision ?? false,
    });

    const defaults = salesQuotationDefaults(emailContent);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      row.shopId,
      'sales_quotation_customer',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Sales quotation email notifications are disabled in settings.');
    }

    return this.mail.sendSalesQuotationToCustomer({
      to: customerEmail,
      content: emailContent,
      overrides: prepared,
    });
  }

  private withEmailDelivery<T extends Record<string, unknown>>(
    row: T,
    delivery: EmailDeliveryResult,
  ) {
    return { ...row, emailDelivery: delivery };
  }

  async list(user: RequestUser, customerId?: string) {
    return this.prisma.salesQuotationHeader.findMany({
      where: {
        shop: shopListWhere(user),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { id: true, customerCode: true, customerName: true, email: true },
        },
        items: { include: { product: { select: { id: true, productCode: true, description: true } } } },
      },
    });
  }

  async get(user: RequestUser, id: string) {
    const row = await this.prisma.salesQuotationHeader.findUnique({
      where: { id },
      include: {
        customer: true,
        shop: { select: { id: true, shopName: true, shopNumber: true } },
        items: { include: { product: true } },
        salesOrder: { select: { id: true, soNumber: true, status: true } },
      },
    });
    if (!row) throw new NotFoundException('Sales quotation not found');
    assertShopScope(user, row.shopId);
    await this.subscriptions.assertFeatureForShop(row.shopId, 'sales_quotations');
    return row;
  }

  async create(user: RequestUser, dto: CreateSalesQuotationDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const shopId = dto.shopId ?? customer.shopId;
    assertShopScope(user, shopId);
    await this.subscriptions.assertFeatureForShop(shopId, 'sales_quotations');

    const quoteDate = dto.quoteDate ? new Date(dto.quoteDate) : new Date();
    const { lines, total } = this.computeLines(dto.items);

    return this.prisma.$transaction(async (tx) => {
      const quoteNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId,
        docType: 'SQT',
        date: quoteDate,
      });

      return tx.salesQuotationHeader.create({
        data: {
          quoteNumber,
          quoteDate,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          customerId: dto.customerId,
          shopId,
          status: SalesQuotationStatus.DRAFT,
          remarks: dto.remarks ?? null,
          totalValue: total,
          createdById: user.id,
          items: {
            create: lines.map((line) => ({
              ...line,
              createdById: user.id,
            })),
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateSalesQuotationDto) {
    const row = await this.get(user, id);
    if (
      row.status !== SalesQuotationStatus.DRAFT &&
      row.status !== SalesQuotationStatus.USER_REQUESTED
    ) {
      throw new BadRequestException('Only draft or customer-requested quotations can be edited');
    }

    const computed = dto.items?.length ? this.computeLines(dto.items) : null;

    return this.prisma.$transaction(async (tx) => {
      if (dto.items?.length) {
        await tx.salesQuotationItem.deleteMany({ where: { quoteHeaderId: id } });
      }

      return tx.salesQuotationHeader.update({
        where: { id },
        data: {
          ...(dto.quoteDate ? { quoteDate: new Date(dto.quoteDate) } : {}),
          ...(dto.validUntil !== undefined
            ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
            : {}),
          ...(dto.remarks !== undefined ? { remarks: dto.remarks ?? null } : {}),
          ...(computed ? { totalValue: computed.total } : {}),
          updatedById: user.id,
          ...(computed
            ? {
                items: {
                  create: computed.lines.map((line) => ({
                    ...line,
                    createdById: user.id,
                  })),
                },
              }
            : {}),
        },
        include: {
          customer: true,
          shop: { select: { id: true, shopName: true, shopNumber: true } },
          items: { include: { product: true } },
        },
      });
    });
  }

  async send(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    if (row.status !== SalesQuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be sent');
    }

    const portalToken = row.portalToken ?? this.newPortalToken();
    const delivery = await this.emailQuotation(row, { portalToken });

    const updated = await this.prisma.salesQuotationHeader.update({
      where: { id },
      data: {
        status: SalesQuotationStatus.SENT,
        portalToken,
        customerRequestedTotal: null,
        customerRequestNote: null,
        customerRespondedAt: null,
        updatedById: user.id,
      },
      include: {
        customer: true,
        shop: { select: { id: true, shopName: true, shopNumber: true } },
        items: { include: { product: true } },
      },
    });

    return this.withEmailDelivery(updated, delivery);
  }

  async resend(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    if (row.status !== SalesQuotationStatus.USER_REQUESTED) {
      throw new BadRequestException(
        'Only quotations with a customer pricing request can be resent',
      );
    }

    const portalToken = row.portalToken ?? this.newPortalToken();
    const delivery = await this.emailQuotation(row, { portalToken, isRevision: true });

    const updated = await this.prisma.salesQuotationHeader.update({
      where: { id },
      data: {
        status: SalesQuotationStatus.SENT,
        portalToken,
        customerRequestedTotal: null,
        customerRequestNote: null,
        customerRespondedAt: null,
        updatedById: user.id,
      },
      include: {
        customer: true,
        shop: { select: { id: true, shopName: true, shopNumber: true } },
        items: { include: { product: true } },
      },
    });

    return this.withEmailDelivery(updated, delivery);
  }

  async cancel(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    if (
      row.status !== SalesQuotationStatus.USER_REQUESTED &&
      row.status !== SalesQuotationStatus.SENT
    ) {
      throw new BadRequestException(
        'Only sent quotations or customer pricing requests can be cancelled',
      );
    }

    return this.prisma.salesQuotationHeader.update({
      where: { id },
      data: { status: SalesQuotationStatus.CANCELLED, updatedById: user.id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  async accept(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    if (row.status !== SalesQuotationStatus.SENT) {
      throw new BadRequestException('Only sent quotations can be accepted');
    }
    return this.prisma.salesQuotationHeader.update({
      where: { id },
      data: { status: SalesQuotationStatus.ACCEPTED, updatedById: user.id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });
  }

  async convertToSalesOrder(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    if (row.status === SalesQuotationStatus.CONVERTED) {
      throw new BadRequestException('Quotation is already converted to a sales order');
    }
    if (row.status !== SalesQuotationStatus.SENT && row.status !== SalesQuotationStatus.ACCEPTED) {
      throw new BadRequestException('Send or accept the quotation before converting to a sales order');
    }
    if (!row.items.length) {
      throw new BadRequestException('Quotation has no line items');
    }

    const orderDate = new Date();

    return this.prisma.$transaction(async (tx) => {
      const soNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId: row.shopId,
        docType: 'SO',
        date: orderDate,
      });

      const salesOrder = await tx.salesOrderHeader.create({
        data: {
          soNumber,
          orderDate,
          customerId: row.customerId,
          shopId: row.shopId,
          status: SalesOrderStatus.DRAFT,
          remarks: row.remarks ? `From ${row.quoteNumber}: ${row.remarks}` : `From ${row.quoteNumber}`,
          totalValue: row.totalValue,
          createdById: user.id,
          items: {
            create: row.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              uom: item.uom,
              unitPrice: item.unitPrice,
              lineValue: item.lineValue,
              createdById: user.id,
            })),
          },
        },
      });

      return tx.salesQuotationHeader.update({
        where: { id },
        data: {
          status: SalesQuotationStatus.CONVERTED,
          salesOrderId: salesOrder.id,
          updatedById: user.id,
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          salesOrder: { select: { id: true, soNumber: true, status: true } },
        },
      });
    });
  }
}
