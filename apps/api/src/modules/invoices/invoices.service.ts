import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, InvoiceStatus, Prisma, SalesOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { asMoney, assertNonNegativeMoney, roundMoney } from '../../common/utils/money';
import { buildMeta, clampTake } from '../../common/utils/pagination';
import { AuditService } from '../audit/audit.service';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

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
  ) {}

  async list(user: RequestUser, query: InvoiceListQuery = {}) {
    const take = clampTake(query.take);
    const scopedShop = defaultShopFilter(user);
    const shopId = scopedShop ?? query.shop_id;
    if (query.shop_id) assertShopScope(user, query.shop_id);

    const where: Prisma.InvoiceHeaderWhereInput = {};
    if (shopId) where.shopId = shopId;
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

    const totalValue = roundMoney(asMoney(dto.totalValue ?? 0));
    assertNonNegativeMoney(totalValue, 'Invoice total');

    const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
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

      await this.audit.log(
        {
          userId: user.id,
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

      return invoice;
    });
  }

  async get(user: RequestUser, id: string) {
    const invoice = await this.prisma.invoiceHeader.findUnique({
      where: { id },
      include: { customer: true, salesOrder: true, payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    assertShopScope(user, invoice.shopId);
    return invoice;
  }
}
