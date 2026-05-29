import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  CostingMethod,
  DocumentEmailTrigger,
  FulfillmentStatus,
  Prisma,
  SalesOrderStatus,
  TransactionType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, shopListWhere } from '../../common/utils/shop-scope';
import { asMoney, roundMoney } from '../../common/utils/money';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { CostingService } from '../stock/costing.service';
import { StockService } from '../stock/stock.service';
import { runSerializableTxWithRetry } from '../../common/utils/serializable-tx';
import { CreateSalesOrderDto, CreateSalesOrderItemDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SubscriptionService } from '../billing/subscription.service';
import { EmailNotificationsService } from '../email-notifications/email-notifications.service';
import { salesOrderCustomerDefaults } from '../email-notifications/email-notifications.outbound';
import type { SalesOrderCustomerEmailContent } from '../../common/mail/transactional-email.templates';
import { formatEmailDate, formatEmailMoney } from '../../common/mail/email-formatters';
import { DocumentEmailService } from '../document-email/document-email.service';

export type SalesOrderListQuery = {
  shop_id?: string;
  status?: SalesOrderStatus;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  cursor?: string;
  take?: number;
};

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly numbers: DocumentNumberService,
    private readonly audit: AuditService,
    private readonly costing: CostingService,
    private readonly subscriptions: SubscriptionService,
    private readonly emailNotifications: EmailNotificationsService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  async list(user: RequestUser, query: SalesOrderListQuery = {}) {
    const take = clampTake(query.take);
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.SalesOrderHeaderWhereInput = {
      shop: shopListWhere(user),
      ...(query.shop_id ? { shopId: query.shop_id } : {}),
    };
    if (query.status) where.status = query.status;
    if (query.customer_id) where.customerId = query.customer_id;
    if (query.date_from || query.date_to) {
      where.orderDate = {};
      if (query.date_from) where.orderDate.gte = new Date(query.date_from);
      if (query.date_to) where.orderDate.lte = new Date(query.date_to);
    }

    const rows = await this.prisma.salesOrderHeader.findMany({
      where,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: [{ orderDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        soNumber: true,
        orderDate: true,
        expectedDate: true,
        status: true,
        totalValue: true,
        remarks: true,
        shopId: true,
        customerId: true,
        customer: { select: { id: true, customerCode: true, customerName: true } },
        shop: { select: { id: true, shopName: true, shopNumber: true } },
      },
    });
    const { items, meta } = buildMeta(rows, take);
    return { data: items, meta };
  }

  /**
   * Compute per-line monetary fields with tax + discount support:
   *   subTotal   = qty * unitPrice
   *   taxAmount  = (subTotal - discountAmount) * taxRate
   *   lineValue  = subTotal - discountAmount + taxAmount
   *
   * Header total is the sum of line values, plus header-level discount/tax
   * which the caller can stamp separately. We round each money sub-result so
   * the persisted decimals match what was displayed to the user.
   */
  private computeLineTotals(items: CreateSalesOrderItemDto[] | undefined) {
    let total = new Prisma.Decimal(0);
    let totalDiscount = new Prisma.Decimal(0);
    let totalTax = new Prisma.Decimal(0);
    const lines = (items ?? []).map((item) => {
      const quantity = asMoney(item.quantity ?? 0);
      const unitPrice = asMoney(item.unitPrice ?? 0);
      const discount = asMoney(item.discountAmount ?? 0);
      const taxRate = asMoney(item.taxRate ?? 0);
      const subTotal = quantity.mul(unitPrice);
      const taxable = Prisma.Decimal.max(subTotal.sub(discount), new Prisma.Decimal(0));
      const taxAmount = roundMoney(taxable.mul(taxRate));
      const lineValue = roundMoney(subTotal.sub(discount).add(taxAmount));
      total = total.add(lineValue);
      totalDiscount = totalDiscount.add(discount);
      totalTax = totalTax.add(taxAmount);
      return {
        productId: item.productId,
        quantity,
        uom: item.uom ?? 'UNIT',
        unitPrice: roundMoney(unitPrice),
        discountAmount: roundMoney(discount),
        taxRate,
        taxAmount,
        lineValue,
      };
    });
    return {
      lines,
      total: roundMoney(total),
      totalDiscount: roundMoney(totalDiscount),
      totalTax: roundMoney(totalTax),
    };
  }

  async create(user: RequestUser, dto: CreateSalesOrderDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    await this.subscriptions.assertFeatureForShop(shopId, 'sales_orders');

    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer || customer.shopId !== shopId) {
        throw new BadRequestException('Customer must belong to the selected shop');
      }
    }

    const orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();
    const { lines, total, totalDiscount, totalTax } = this.computeLineTotals(dto.items);

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      const soNumber = await this.numbers.nextConfiguredShopScopedNumber(tx, {
        shopId,
        docType: 'SO',
        date: orderDate,
      });

      const created = await tx.salesOrderHeader.create({
        data: {
          soNumber,
          orderDate,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
          customerId: dto.customerId,
          shopId,
          status: SalesOrderStatus.DRAFT,
          fulfillmentStatus: FulfillmentStatus.NONE,
          remarks: dto.remarks ?? null,
          currency: dto.currency ?? 'USD',
          fxRateUsed: dto.fxRateUsed != null ? new Prisma.Decimal(dto.fxRateUsed) : null,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          totalValue: total,
          createdById: user.id,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              uom: line.uom,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              lineValue: line.lineValue,
              createdById: user.id,
            })),
          },
        },
        include: { customer: true, items: { include: { product: true } } },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.CREATE,
          entityType: 'SALES_ORDER',
          entityId: created.id,
          newValues: {
            soNumber: created.soNumber,
            customerId: created.customerId,
            totalValue: created.totalValue?.toString() ?? '0',
            itemCount: lines.length,
          },
        },
        tx,
      );

      return created;
    });
  }

  async get(user: RequestUser, id: string) {
    const so = await this.prisma.salesOrderHeader.findUnique({
      where: { id },
      include: {
        customer: true,
        shop: { select: { id: true, shopName: true, shopNumber: true } },
        items: { include: { product: true } },
        salesQuotation: { select: { id: true, quoteNumber: true } },
      },
    });
    if (!so) throw new NotFoundException('Sales order not found');
    assertShopScope(user, so.shopId);
    await this.subscriptions.assertFeatureForShop(so.shopId, 'sales_orders');
    return so;
  }

  async update(user: RequestUser, id: string, dto: UpdateSalesOrderDto) {
    const so = await this.get(user, id);
    if (so.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT sales orders can be updated');
    }

    const orderDate = dto.orderDate ? new Date(dto.orderDate) : so.orderDate;
    const items = dto.items ?? so.items.map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
      uom: line.uom,
      unitPrice: Number(line.unitPrice),
      discountAmount: Number(line.discountAmount),
      taxRate: Number(line.taxRate),
    }));
    const { lines, total, totalDiscount, totalTax } = this.computeLineTotals(items);

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      await tx.salesOrderItem.deleteMany({ where: { soHeaderId: id } });
      const updated = await tx.salesOrderHeader.update({
        where: { id },
        data: {
          orderDate,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : so.expectedDate,
          customerId: dto.customerId ?? so.customerId,
          remarks: dto.remarks !== undefined ? dto.remarks : so.remarks,
          discountAmount: totalDiscount,
          taxAmount: totalTax,
          totalValue: total,
          updatedById: user.id,
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              uom: line.uom,
              unitPrice: line.unitPrice,
              discountAmount: line.discountAmount,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              lineValue: line.lineValue,
              createdById: user.id,
            })),
          },
        },
        include: {
          customer: true,
          shop: { select: { id: true, shopName: true, shopNumber: true } },
          items: { include: { product: true } },
          salesQuotation: { select: { id: true, quoteNumber: true } },
        },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'SALES_ORDER',
          entityId: id,
          newValues: { soNumber: updated.soNumber, totalValue: updated.totalValue?.toString() ?? '0' },
        },
        tx,
      );

      return updated;
    });
  }

  async remove(user: RequestUser, id: string) {
    const so = await this.get(user, id);
    if (so.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT sales orders can be deleted');
    }

    await runSerializableTxWithRetry(this.prisma, async (tx) => {
      await tx.salesOrderHeader.delete({ where: { id } });
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.DELETE,
          entityType: 'SALES_ORDER',
          entityId: id,
          oldValues: { soNumber: so.soNumber },
        },
        tx,
      );
    });

    return { deleted: true, id };
  }

  async confirm(user: RequestUser, id: string) {
    const so = await this.get(user, id);
    if (so.status === SalesOrderStatus.CONFIRMED) return so;
    if (so.status !== SalesOrderStatus.DRAFT) {
      throw new BadRequestException(`Cannot confirm sales order in status ${so.status}`);
    }

    const confirmed = await runSerializableTxWithRetry(this.prisma, async (tx) => {
      const updated = await tx.salesOrderHeader.updateMany({
        where: { id, status: SalesOrderStatus.DRAFT },
        data: { status: SalesOrderStatus.CONFIRMED, updatedById: user.id },
      });
      if (updated.count === 0) {
        throw new ConflictException('Sales order state changed concurrently');
      }
      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.UPDATE,
          entityType: 'SALES_ORDER',
          entityId: id,
          newValues: { status: SalesOrderStatus.CONFIRMED },
        },
        tx,
      );
      return tx.salesOrderHeader.findUniqueOrThrow({
        where: { id },
        include: {
          customer: true,
          shop: { select: { shopName: true } },
          items: { include: { product: true } },
        },
      });
    });

    await this.autoSendSalesOrderEmail(user, confirmed).catch(() => undefined);
    return confirmed;
  }

  async sendToCustomer(user: RequestUser, id: string, options?: { resend?: boolean }) {
    const order = await this.get(user, id);
    if (order.status === SalesOrderStatus.DRAFT) {
      throw new BadRequestException('Confirm the sales order before emailing it to the customer.');
    }

    const recipient = order.customer.email?.trim();
    if (!recipient) {
      throw new BadRequestException(
        `Customer email is missing for "${order.customer.customerName}". Add an email on the customer record and try again.`,
      );
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: order.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) {
      throw new BadRequestException('Shop not linked to a company');
    }

    const content = this.buildSalesOrderEmailContent(order, shop.company?.companyName ?? 'Company');
    const defaults = salesOrderCustomerDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      order.shopId,
      'sales_order_customer',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) {
      throw new BadRequestException('Sales order email notifications are disabled in settings.');
    }

    const trigger = options?.resend ? DocumentEmailTrigger.RESEND : DocumentEmailTrigger.MANUAL;
    return this.documentEmail.sendSalesOrderEmail(user, {
      salesOrderId: id,
      companyId: shop.companyId,
      shopId: order.shopId,
      recipient,
      content,
      prepared,
      documentNumber: order.soNumber,
      trigger,
    });
  }

  private buildSalesOrderEmailContent(
    order: {
      soNumber: string;
      orderDate: Date;
      expectedDate: Date | null;
      totalValue: Prisma.Decimal | null;
      currency: string;
      shop?: { shopName: string } | null;
      customer: { customerName: string };
    },
    companyName: string,
  ): SalesOrderCustomerEmailContent {
    const total =
      order.totalValue != null
        ? Number(order.totalValue)
        : 0;
    return {
      customerName: order.customer.customerName,
      soNumber: order.soNumber,
      orderDate: formatEmailDate(order.orderDate),
      expectedDate: formatEmailDate(order.expectedDate),
      totalAmount: formatEmailMoney(total, order.currency || 'INR'),
      shopName: order.shop?.shopName ?? '—',
      companyName,
    };
  }

  private async autoSendSalesOrderEmail(
    user: RequestUser,
    order: {
      id: string;
      shopId: string;
      soNumber: string;
      orderDate: Date;
      expectedDate: Date | null;
      totalValue: Prisma.Decimal | null;
      currency: string;
      shop?: { shopName: string } | null;
      customer: { customerName: string; email: string | null };
    },
  ) {
    const recipient = order.customer.email?.trim();
    if (!recipient) return;

    const shop = await this.prisma.shop.findUnique({
      where: { id: order.shopId },
      select: { companyId: true, company: { select: { companyName: true } } },
    });
    if (!shop?.companyId) return;

    const content = this.buildSalesOrderEmailContent(order, shop.company?.companyName ?? 'Company');
    const defaults = salesOrderCustomerDefaults(content);
    const prepared = await this.emailNotifications.prepareTemplateForShop(
      order.shopId,
      'sales_order_customer',
      { subject: defaults.subject, text: defaults.text, html: defaults.html },
      defaults.context,
    );
    if (!prepared.enabled) return;

    await this.documentEmail.sendSalesOrderEmail(user, {
      salesOrderId: order.id,
      companyId: shop.companyId,
      shopId: order.shopId,
      recipient,
      content,
      prepared,
      documentNumber: order.soNumber,
      trigger: DocumentEmailTrigger.AUTO,
    });
  }

  /**
   * Full fulfilment helper: ships every line's remaining quantity in one go.
   * For per-line/partial shipments use `fulfillItem` directly.
   */
  async fulfill(user: RequestUser, id: string) {
    const so = await this.get(user, id);
    if (so.status === SalesOrderStatus.FULFILLED) return so;
    if (so.status !== SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot fulfill sales order in status ${so.status}; must be CONFIRMED`,
      );
    }

    for (const item of so.items) {
      const remaining = new Prisma.Decimal(item.quantity).sub(item.shippedQty);
      if (remaining.gt(0)) {
        await this.fulfillItem(user, id, item.id, remaining);
      }
    }

    return this.get(user, id);
  }

  /**
   * Partial fulfillment for a single line. Atomically increments
   * `shippedQty`, posts a stock issue with FIFO/AVERAGE costing, and recomputes
   * the header `fulfillmentStatus`/`status` flips based on whether ALL lines
   * are now fully shipped.
   */
  async fulfillItem(
    user: RequestUser,
    soId: string,
    itemId: string,
    qty: Prisma.Decimal | number,
  ) {
    const requestedQty = asMoney(qty);
    if (requestedQty.lte(0)) {
      throw new BadRequestException('Quantity must be positive');
    }

    const so = await this.get(user, soId);
    if (so.status !== SalesOrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot fulfill sales order in status ${so.status}; must be CONFIRMED`,
      );
    }
    const item = so.items.find((it) => it.id === itemId);
    if (!item) throw new NotFoundException('Sales order line not found');
    const remaining = new Prisma.Decimal(item.quantity).sub(item.shippedQty);
    if (remaining.lte(0)) throw new BadRequestException('Line is already fully shipped');
    if (requestedQty.gt(remaining)) {
      throw new BadRequestException(
        `Requested ${requestedQty.toString()} but only ${remaining.toString()} remains on this line`,
      );
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: so.shopId },
      select: { costingMethod: true },
    });
    const method = shop?.costingMethod ?? CostingMethod.AVERAGE;

    return runSerializableTxWithRetry(this.prisma, async (tx) => {
      // Atomic shippedQty bump — protects against two concurrent fulfilments
      // double-counting against the same remaining quantity.
      const bumped = await tx.salesOrderItem.updateMany({
        where: { id: itemId, soHeaderId: soId, shippedQty: item.shippedQty },
        data: { shippedQty: new Prisma.Decimal(item.shippedQty).add(requestedQty) },
      });
      if (bumped.count === 0) {
        throw new ConflictException('Sales order line was modified concurrently');
      }

      // Consume cost layers / read avg cost so the ledger row reflects real
      // COGS rather than the sales price.
      const { unitCost } = await this.costing.recordOutflow(tx, {
        shopId: so.shopId,
        productId: item.productId,
        qty: requestedQty,
        method,
      });

      await this.stock.postMovementOnce(tx, {
        type: TransactionType.GOODS_ISSUE,
        ref: so.soNumber,
        date: new Date(),
        shopId: so.shopId,
        productId: item.productId,
        inQty: 0,
        outQty: requestedQty,
        unitRate: unitCost.gt(0) ? unitCost : item.unitPrice,
        remarks: 'Sales order fulfillment',
        sourceType: 'SALES_ORDER',
        sourceId: so.id,
        sourceLineId: item.id,
        // Per-shipment idempotency: include the remaining qty before bump so
        // retries with the same payload short-circuit on the unique index.
        idempotencyKey: `so-fulfill:${so.id}:${item.id}:${item.shippedQty.toString()}`,
        userId: user.id,
      });

      // Recompute header fulfillmentStatus from line totals.
      const linesAfter = await tx.salesOrderItem.findMany({
        where: { soHeaderId: soId },
        select: { quantity: true, shippedQty: true },
      });
      const allShipped = linesAfter.every((l) => new Prisma.Decimal(l.shippedQty).gte(l.quantity));
      const anyShipped = linesAfter.some((l) => new Prisma.Decimal(l.shippedQty).gt(0));
      const next: FulfillmentStatus = allShipped
        ? FulfillmentStatus.FULL
        : anyShipped
          ? FulfillmentStatus.PARTIAL
          : FulfillmentStatus.NONE;

      await tx.salesOrderHeader.update({
        where: { id: soId },
        data: {
          fulfillmentStatus: next,
          // Only flip the parent status to FULFILLED when the order is fully
          // shipped, matching the legacy contract.
          ...(allShipped ? { status: SalesOrderStatus.FULFILLED } : {}),
          updatedById: user.id,
        },
      });

      await this.audit.log(
        {
          userId: user.id,
          action: AuditAction.POST,
          entityType: 'SALES_ORDER',
          entityId: soId,
          newValues: {
            event: 'fulfillItem',
            itemId,
            qty: requestedQty.toString(),
            fulfillmentStatus: next,
          },
        },
        tx,
      );

      return tx.salesOrderHeader.findUniqueOrThrow({
        where: { id: soId },
        include: { customer: true, items: { include: { product: true } } },
      });
    });
  }
}
