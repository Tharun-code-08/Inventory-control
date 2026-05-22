import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SalesOrderStatus, SalesQuotationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope, defaultShopFilter } from '../../common/utils/shop-scope';
import { asMoney, roundMoney } from '../../common/utils/money';
import { DocumentNumberService } from '../stock/document-number.service';
import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto';

@Injectable()
export class SalesQuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbers: DocumentNumberService,
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

  async list(user: RequestUser, customerId?: string) {
    const scopedShop = defaultShopFilter(user);
    return this.prisma.salesQuotationHeader.findMany({
      where: {
        ...(scopedShop ? { shopId: scopedShop } : {}),
        ...(customerId ? { customerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, customerCode: true, customerName: true } },
        items: { include: { product: { select: { id: true, productCode: true, description: true } } } },
      },
    });
  }

  async get(user: RequestUser, id: string) {
    const row = await this.prisma.salesQuotationHeader.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        salesOrder: { select: { id: true, soNumber: true, status: true } },
      },
    });
    if (!row) throw new NotFoundException('Sales quotation not found');
    assertShopScope(user, row.shopId);
    return row;
  }

  async create(user: RequestUser, dto: CreateSalesQuotationDto) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const shopId = dto.shopId ?? customer.shopId;
    assertShopScope(user, shopId);

    const quoteDate = dto.quoteDate ? new Date(dto.quoteDate) : new Date();
    const { lines, total } = this.computeLines(dto.items);

    return this.prisma.$transaction(async (tx) => {
      const quoteNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId,
        docType: 'SQT',
        basePrefix: 'QT',
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

  async send(user: RequestUser, id: string) {
    const row = await this.get(user, id);
    if (row.status !== SalesQuotationStatus.DRAFT) {
      throw new BadRequestException('Only draft quotations can be sent');
    }
    return this.prisma.salesQuotationHeader.update({
      where: { id },
      data: { status: SalesQuotationStatus.SENT, updatedById: user.id },
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
      const soNumber = await this.numbers.nextShopScopedNumber(tx, {
        shopId: row.shopId,
        docType: 'SO',
        basePrefix: 'SO',
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
