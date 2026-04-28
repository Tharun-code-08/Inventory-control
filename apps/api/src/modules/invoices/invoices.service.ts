import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestUser } from '../../common/types/request-user';
import { assertShopScope } from '../../common/utils/shop-scope';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: RequestUser) {
    return this.prisma.invoiceHeader.findMany({
      where: user.shopId ? { shopId: user.shopId } : undefined,
      orderBy: { invoiceDate: 'desc' },
      include: { customer: true, salesOrder: true, payments: true },
    });
  }

  async create(user: RequestUser, dto: CreateInvoiceDto) {
    const shopId = dto.shopId ?? user.shopId;
    if (!shopId) throw new BadRequestException('shopId is required');
    assertShopScope(user, shopId);
    const count = await this.prisma.invoiceHeader.count({ where: { shopId } });
    const invoiceNumber = dto.invoiceNumber?.trim() || `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    return this.prisma.invoiceHeader.create({
      data: {
        invoiceNumber,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : new Date(),
        salesOrderId: dto.salesOrderId ?? null,
        customerId: dto.customerId,
        shopId,
        status: InvoiceStatus.ISSUED,
        totalValue: new Prisma.Decimal(dto.totalValue ?? 0),
        paidValue: new Prisma.Decimal(0),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        remarks: dto.remarks ?? null,
        createdById: user.id,
      },
      include: { customer: true, salesOrder: true, payments: true },
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

